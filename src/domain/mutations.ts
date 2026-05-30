import { normalizeScheduleBlocks } from "../data/demoData";
import type {
  GroupSession,
  GroupType,
  Modality,
  Recommendation,
  RsvpStatus,
  ScheduleBlock,
  WorkGroup,
  WorkSyncData,
} from "../types/worksync";

// A single persistence intent produced by a pure mutation. The repository turns
// this into a Firestore call; this layer never touches I/O.
export type WriteOp =
  | { kind: "set"; collection: WriteCollection; id: string; value: Record<string, unknown> }
  | { kind: "update"; collection: WriteCollection; id: string; value: Record<string, unknown> }
  | { kind: "delete"; collection: WriteCollection; id: string };

export type WriteCollection = "groups" | "sessions" | "schedules";

export interface MutationResult {
  next: WorkSyncData;
  write: WriteOp;
}

// Injected so IDs are deterministic under test.
export interface MutationDeps {
  id: (prefix: string) => string;
}

export const defaultDeps: MutationDeps = {
  id: (prefix) => `${prefix}-${Date.now()}`,
};

const asRecord = (value: object): Record<string, unknown> => value as Record<string, unknown>;

const groupColor = (type: GroupType): string => (type === "study" ? "#0058be" : "#006b2c");

const sessionLocation = (modality: Modality): string =>
  modality === "remote"
    ? "Google Meet"
    : modality === "in_person"
      ? "Biblioteca central"
      : "Biblioteca central + Meet";

// Normalize, dedupe and drop the owner's own email from an invite list.
export function dedupeInvitedEmails(emails: string[] | undefined, ownEmail?: string): string[] {
  const own = ownEmail?.toLowerCase();
  return Array.from(
    new Set((emails ?? []).map((entry) => entry.trim().toLowerCase()).filter((entry) => entry && entry !== own)),
  );
}

export interface CreateGroupInput {
  name: string;
  description: string;
  type: GroupType;
  memberIds?: string[];
  invitedEmails?: string[];
}

export function createGroup(
  data: WorkSyncData,
  ownerId: string,
  ownEmail: string | undefined,
  input: CreateGroupInput,
  deps: MutationDeps = defaultDeps,
): MutationResult {
  const memberIds = Array.from(new Set([ownerId, ...(input.memberIds ?? [])]));
  const group: WorkGroup = {
    id: deps.id("g"),
    name: input.name,
    description: input.description,
    type: input.type,
    color: groupColor(input.type),
    ownerId,
    memberIds,
    invitedEmails: dedupeInvitedEmails(input.invitedEmails, ownEmail),
    status: "active",
  };
  return {
    next: { ...data, groups: [group, ...data.groups] },
    write: { kind: "set", collection: "groups", id: group.id, value: asRecord(group) },
  };
}

export function updateGroup(data: WorkSyncData, group: WorkGroup, ownEmail: string | undefined): MutationResult {
  const updated: WorkGroup = { ...group, invitedEmails: dedupeInvitedEmails(group.invitedEmails, ownEmail) };
  return {
    next: { ...data, groups: data.groups.map((item) => (item.id === updated.id ? updated : item)) },
    write: { kind: "set", collection: "groups", id: updated.id, value: asRecord(updated) },
  };
}

export function deleteGroup(data: WorkSyncData, groupId: string): MutationResult {
  return {
    next: {
      ...data,
      groups: data.groups.filter((item) => item.id !== groupId),
      sessions: data.sessions.filter((session) => session.groupId !== groupId),
    },
    write: { kind: "delete", collection: "groups", id: groupId },
  };
}

export interface CreateSessionResult extends MutationResult {
  session: GroupSession;
}

export function createSessionFromRecommendation(
  data: WorkSyncData,
  recommendation: Recommendation,
  deps: MutationDeps = defaultDeps,
): CreateSessionResult {
  const group = data.groups.find((item) => item.id === recommendation.groupId);
  const session: GroupSession = {
    id: deps.id("s"),
    groupId: recommendation.groupId,
    title: group ? `Sesion ${group.name}` : "Sesion WorkSync",
    dateLabel: recommendation.dateLabel,
    dateISO: recommendation.dateISO,
    start: recommendation.start,
    end: recommendation.end,
    modality: recommendation.modality,
    location: sessionLocation(recommendation.modality),
    status: "proposed",
    score: recommendation.score,
    justification: recommendation.justification,
  };
  return {
    session,
    next: { ...data, sessions: [session, ...data.sessions] },
    write: { kind: "set", collection: "sessions", id: session.id, value: asRecord(session) },
  };
}

export function confirmSession(data: WorkSyncData, sessionId: string): MutationResult {
  return {
    next: {
      ...data,
      sessions: data.sessions.map((session) =>
        session.id === sessionId ? { ...session, status: "confirmed" } : session,
      ),
    },
    write: { kind: "update", collection: "sessions", id: sessionId, value: { status: "confirmed" } },
  };
}

// Set (or change) one member's attendance answer. The Firestore write uses a
// dotted field path (`rsvps.<uid>`) so it only touches the caller's own entry —
// this is what lets the security rule allow members to edit their own RSVP while
// rejecting edits to anyone else's, even under concurrent updates.
export function setRsvp(
  data: WorkSyncData,
  sessionId: string,
  userId: string,
  status: RsvpStatus,
): MutationResult {
  return {
    next: {
      ...data,
      sessions: data.sessions.map((session) =>
        session.id === sessionId
          ? { ...session, rsvps: { ...(session.rsvps ?? {}), [userId]: status } }
          : session,
      ),
    },
    write: { kind: "update", collection: "sessions", id: sessionId, value: { [`rsvps.${userId}`]: status } },
  };
}

export function saveSchedule(data: WorkSyncData, userId: string, blocks: ScheduleBlock[]): MutationResult {
  const normalized = normalizeScheduleBlocks(blocks);
  const exists = data.schedules.some((schedule) => schedule.userId === userId);
  return {
    next: {
      ...data,
      schedules: exists
        ? data.schedules.map((schedule) => (schedule.userId === userId ? { userId, blocks: normalized } : schedule))
        : [...data.schedules, { userId, blocks: normalized }],
    },
    write: { kind: "set", collection: "schedules", id: userId, value: { blocks: normalized } },
  };
}
