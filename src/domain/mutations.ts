import { normalizeScheduleBlocks } from "../data/demoData";
import { winningCandidate } from "./polls";
import type {
  GridConfig,
  GroupSession,
  GroupType,
  Modality,
  Poll,
  PollCandidate,
  Recommendation,
  RsvpStatus,
  ScheduleBlock,
  UserSchedule,
  WorkGroup,
  WorkSyncData,
} from "../types/worksync";

// A single persistence intent produced by a pure mutation. The repository turns
// this into a Firestore call; this layer never touches I/O.
export type WriteOp =
  | { kind: "set"; collection: WriteCollection; id: string; value: Record<string, unknown> }
  | { kind: "update"; collection: WriteCollection; id: string; value: Record<string, unknown> }
  | { kind: "delete"; collection: WriteCollection; id: string };

export type WriteCollection = "groups" | "sessions" | "schedules" | "polls" | "users";

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

export function updateSession(
  data: WorkSyncData,
  sessionId: string,
  updates: Partial<Pick<GroupSession, "title" | "recurring">>
): MutationResult {
  return {
    next: {
      ...data,
      sessions: data.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
    },
    write: { kind: "update", collection: "sessions", id: sessionId, value: updates as Record<string, unknown> },
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

export function saveSchedule(
  data: WorkSyncData,
  userId: string,
  blocks: ScheduleBlock[],
  gridConfig?: GridConfig,
): MutationResult {
  const normalized = normalizeScheduleBlocks(blocks);
  const existing = data.schedules.find((schedule) => schedule.userId === userId);
  // setDoc replaces the whole doc, so carry the current grid preference forward
  // when the caller doesn't supply a new one — otherwise saving blocks alone
  // would wipe a previously stored config. Never write `undefined` to Firestore:
  // only add the key when there is a config to persist.
  const nextConfig = gridConfig ?? existing?.gridConfig;
  const schedule: UserSchedule = nextConfig
    ? { userId, blocks: normalized, gridConfig: nextConfig }
    : { userId, blocks: normalized };
  const value: Record<string, unknown> = nextConfig
    ? { blocks: normalized, gridConfig: nextConfig }
    : { blocks: normalized };
  return {
    next: {
      ...data,
      schedules: existing
        ? data.schedules.map((entry) => (entry.userId === userId ? schedule : entry))
        : [...data.schedules, schedule],
    },
    write: { kind: "set", collection: "schedules", id: userId, value },
  };
}

// --- Polls -------------------------------------------------------------------

export interface CreatePollInput {
  groupId: string;
  title: string;
  candidates: PollCandidate[];
}

export function createPoll(
  data: WorkSyncData,
  createdBy: string,
  input: CreatePollInput,
  deps: MutationDeps = defaultDeps,
): MutationResult {
  const poll: Poll = {
    id: deps.id("poll"),
    groupId: input.groupId,
    title: input.title,
    createdBy,
    status: "open",
    candidates: input.candidates,
    votes: {},
    createdAt: Date.now(),
  };
  return {
    next: { ...data, polls: [poll, ...data.polls] },
    write: { kind: "set", collection: "polls", id: poll.id, value: asRecord(poll) },
  };
}

// Toggle one member's approval of a candidate. The write targets only the
// caller's own `votes.<uid>` entry (dotted field path) so the security rule can
// allow a member to change their own vote without touching anyone else's.
export function castVote(
  data: WorkSyncData,
  pollId: string,
  userId: string,
  candidateId: string,
): MutationResult {
  const poll = data.polls.find((entry) => entry.id === pollId);
  if (!poll) return { next: data, write: { kind: "update", collection: "polls", id: pollId, value: {} } };
  if (!poll.candidates.some((c) => c.id === candidateId)) return { next: data, write: { kind: "update", collection: "polls", id: pollId, value: {} } };
  const current = poll?.votes[userId] ?? [];
  const nextVotes = current.includes(candidateId)
    ? current.filter((id) => id !== candidateId)
    : [...current, candidateId];
  return {
    next: {
      ...data,
      polls: data.polls.map((entry) =>
        entry.id === pollId ? { ...entry, votes: { ...entry.votes, [userId]: nextVotes } } : entry,
      ),
    },
    write: { kind: "update", collection: "polls", id: pollId, value: { [`votes.${userId}`]: nextVotes } },
  };
}

// Close a poll and record the winning candidate (most approvals). When there are
// no votes the poll still closes, just without a winner.
export function closePoll(data: WorkSyncData, pollId: string): MutationResult {
  const poll = data.polls.find((entry) => entry.id === pollId);
  const winner = poll ? winningCandidate(poll) : undefined;
  const value: Record<string, unknown> = winner
    ? { status: "closed", winnerCandidateId: winner.id }
    : { status: "closed" };
  return {
    next: {
      ...data,
      polls: data.polls.map((entry) =>
        entry.id === pollId
          ? { ...entry, status: "closed", ...(winner ? { winnerCandidateId: winner.id } : {}) }
          : entry,
      ),
    },
    write: { kind: "update", collection: "polls", id: pollId, value },
  };
}
