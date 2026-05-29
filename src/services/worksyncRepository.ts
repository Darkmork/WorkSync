import { collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { demoData, normalizeScheduleBlocks } from "../data/demoData";
import type { GroupSession, ScheduleBlock, UserProfile, WorkGroup, WorkSyncData } from "../types/worksync";
import { db, firebaseConfig, isFirebaseConfigured, requiresFirebaseAuth } from "./firebase";

const cloneDemo = (): WorkSyncData => JSON.parse(JSON.stringify(demoData)) as WorkSyncData;

const normalizeData = (data: WorkSyncData, currentUserId = data.currentUserId): WorkSyncData => ({
  ...data,
  currentUserId,
  schedules: data.schedules.map((schedule) => ({
    ...schedule,
    blocks: normalizeScheduleBlocks(schedule.blocks),
  })),
});

const demoForUser = (currentUserId: string, currentUser?: UserProfile): WorkSyncData => {
  const base = cloneDemo();
  const users = base.users.map((user) => (user.id === base.currentUserId && currentUser ? { ...currentUser, id: currentUserId } : user));
  const schedules = base.schedules.map((schedule) =>
    schedule.userId === base.currentUserId ? { ...schedule, userId: currentUserId } : schedule,
  );
  const groups = base.groups.map((group) => ({
    ...group,
    ownerId: group.ownerId === base.currentUserId ? currentUserId : group.ownerId,
    memberIds: group.memberIds.map((memberId) => (memberId === base.currentUserId ? currentUserId : memberId)),
  }));

  return normalizeData({ ...base, currentUserId, users, schedules, groups }, currentUserId);
};

const localKey = "worksync-demo-data";

export async function loadWorkSyncData(currentUserId?: string, currentEmail?: string): Promise<WorkSyncData> {
  if (!isFirebaseConfigured || !db) {
    const stored = localStorage.getItem(localKey);
    return normalizeData(stored ? (JSON.parse(stored) as WorkSyncData) : cloneDemo());
  }

  if (!requiresFirebaseAuth) {
    return loadPublicFirebaseData(currentUserId);
  }

  const effectiveUserId = currentUserId ?? "";
  const email = (currentEmail ?? "").toLowerCase();

  // Groups: the read rule requires membership, so query by membership instead of
  // reading the whole collection — an unconstrained list query would be rejected
  // (Firestore rules are not filters). One query for member/owner, one for invited.
  const groupQueries = [getDocs(query(collection(db, "groups"), where("memberIds", "array-contains", effectiveUserId)))];
  if (email) {
    groupQueries.push(getDocs(query(collection(db, "groups"), where("invitedEmails", "array-contains", email))));
  }
  const [usersSnap, sessionsSnap, schedulesSnap, ...groupSnaps] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "sessions")),
    getDocs(collection(db, "schedules")),
    ...groupQueries,
  ]);

  const users = usersSnap.docs.map((item) => ({ ...item.data(), id: item.id })) as WorkSyncData["users"];
  const allSessions = sessionsSnap.docs.map((item) => ({ ...item.data(), id: item.id })) as GroupSession[];
  const schedules = schedulesSnap.docs.map((item) => ({ ...item.data(), userId: item.id })) as WorkSyncData["schedules"];

  // The two group queries can overlap, so dedupe by id.
  const groupsById = new Map<string, WorkGroup>();
  groupSnaps.forEach((snap) => snap.docs.forEach((item) => groupsById.set(item.id, { ...(item.data() as WorkGroup), id: item.id })));

  // Resolve invitations: a user invited by email auto-joins on load.
  const groups = await Promise.all(
    Array.from(groupsById.values()).map(async (group) => {
      const memberIds = group.memberIds ?? [];
      const invited = group.invitedEmails ?? [];
      const isMember = memberIds.includes(effectiveUserId);
      const isInvited = email !== "" && invited.some((entry) => entry.toLowerCase() === email);
      if (isInvited && !isMember && db) {
        const nextMembers = [...memberIds, effectiveUserId];
        const nextInvited = invited.filter((entry) => entry.toLowerCase() !== email);
        try {
          await updateDoc(doc(db, "groups", group.id), { memberIds: nextMembers, invitedEmails: nextInvited });
        } catch {
          // If the self-join write is rejected, still show the group locally.
        }
        return { ...group, memberIds: nextMembers, invitedEmails: nextInvited };
      }
      return group;
    }),
  );
  const groupIds = new Set(groups.map((group) => group.id));
  const sessions = allSessions.filter((session) => groupIds.has(session.groupId));

  return normalizeData({
    currentUserId: effectiveUserId,
    users,
    groups,
    sessions,
    schedules: schedules.some((schedule) => schedule.userId === effectiveUserId)
      ? schedules
      : [...schedules, createDefaultUserSchedule(effectiveUserId)],
  }, effectiveUserId);
}

function mergeUsers(seedUsers: UserProfile[], firestoreUsers: UserProfile[]) {
  const byId = new Map(seedUsers.map((user) => [user.id, user]));
  firestoreUsers.forEach((user) => byId.set(user.id, user));
  return Array.from(byId.values());
}

function createDefaultUserSchedule(userId: string): WorkSyncData["schedules"][number] {
  return {
    userId,
    blocks: normalizeScheduleBlocks([]),
  };
}

export async function persistLocalData(data: WorkSyncData) {
  if (!isFirebaseConfigured) {
    localStorage.setItem(localKey, JSON.stringify(data));
  }
}

export async function saveSchedule(userId: string, blocks: ScheduleBlock[], data: WorkSyncData) {
  if (isFirebaseConfigured && db) {
    if (requiresFirebaseAuth) {
      await setDoc(doc(db, "schedules", userId), { blocks: normalizeScheduleBlocks(blocks) });
    } else {
      await savePublicDocument("schedules", userId, { blocks: normalizeScheduleBlocks(blocks) });
    }
  }
  const next = {
    ...data,
    schedules: data.schedules.some((schedule) => schedule.userId === userId)
      ? data.schedules.map((schedule) => (schedule.userId === userId ? { userId, blocks: normalizeScheduleBlocks(blocks) } : schedule))
      : [...data.schedules, { userId, blocks: normalizeScheduleBlocks(blocks) }],
  };
  await persistLocalData(next);
  return next;
}

export async function saveGroup(group: WorkGroup, data: WorkSyncData) {
  if (isFirebaseConfigured && db) {
    if (requiresFirebaseAuth) {
      await setDoc(doc(db, "groups", group.id), group);
    } else {
      await savePublicDocument("groups", group.id, group as unknown as Record<string, unknown>);
    }
  }
  const next = { ...data, groups: [group, ...data.groups] };
  await persistLocalData(next);
  return next;
}

export async function updateGroup(group: WorkGroup, data: WorkSyncData) {
  if (isFirebaseConfigured && db) {
    if (requiresFirebaseAuth) {
      await setDoc(doc(db, "groups", group.id), group);
    } else {
      await savePublicDocument("groups", group.id, group as unknown as Record<string, unknown>);
    }
  }
  const next = { ...data, groups: data.groups.map((item) => (item.id === group.id ? group : item)) };
  await persistLocalData(next);
  return next;
}

export async function deleteGroup(groupId: string, data: WorkSyncData) {
  if (isFirebaseConfigured && db && requiresFirebaseAuth) {
    await deleteDoc(doc(db, "groups", groupId));
  }
  const next = {
    ...data,
    groups: data.groups.filter((item) => item.id !== groupId),
    sessions: data.sessions.filter((session) => session.groupId !== groupId),
  };
  await persistLocalData(next);
  return next;
}

export async function saveSession(session: GroupSession, data: WorkSyncData) {
  if (isFirebaseConfigured && db) {
    if (requiresFirebaseAuth) {
      await setDoc(doc(db, "sessions", session.id), session);
    } else {
      await savePublicDocument("sessions", session.id, session as unknown as Record<string, unknown>);
    }
  }
  const next = { ...data, sessions: [session, ...data.sessions] };
  await persistLocalData(next);
  return next;
}

export async function confirmSession(sessionId: string, data: WorkSyncData) {
  if (isFirebaseConfigured && db) {
    if (requiresFirebaseAuth) {
      await updateDoc(doc(db, "sessions", sessionId), { status: "confirmed" });
    } else {
      await savePublicDocument("sessions", sessionId, { status: "confirmed" }, ["status"]);
    }
  }
  const next: WorkSyncData = {
    ...data,
    sessions: data.sessions.map((session) => (session.id === sessionId ? { ...session, status: "confirmed" } : session)),
  };
  await persistLocalData(next);
  return next;
}

async function loadPublicFirebaseData(currentUserId?: string): Promise<WorkSyncData> {
  const data = cloneDemo();
  const effectiveUserId = currentUserId ?? data.currentUserId;
  const seeded = demoForUser(effectiveUserId);
  const [users, groups, sessions, schedules] = await Promise.all([
    fetchPublicCollection<UserProfile>("users"),
    fetchPublicCollection<WorkGroup>("groups"),
    fetchPublicCollection<GroupSession>("sessions"),
    fetchPublicCollection<WorkSyncData["schedules"][number]>("schedules"),
  ]);

  return normalizeData({
    currentUserId: effectiveUserId,
    users: users.length ? mergeUsers(seeded.users, users) : seeded.users,
    groups: groups.length ? groups : seeded.groups,
    sessions: sessions.length ? sessions : seeded.sessions,
    schedules: schedules.some((schedule) => schedule.userId === effectiveUserId)
      ? schedules
      : [...(schedules.length ? schedules : seeded.schedules), createDefaultUserSchedule(effectiveUserId)],
  }, effectiveUserId);
}

async function fetchPublicCollection<T>(collectionName: string): Promise<T[]> {
  const response = await fetch(`${publicBaseUrl()}/${collectionName}?key=${firebaseConfig.apiKey}`);
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Firestore no pudo cargar ${collectionName}.`);
  const payload = await response.json() as { documents?: Array<{ name: string; fields?: Record<string, FirestoreRestValue> }> };
  return (payload.documents ?? []).map((item) => ({
    id: documentIdFromName(item.name),
    ...fromFirestoreFields(item.fields ?? {}),
  })) as T[];
}

async function savePublicDocument(collectionName: string, documentId: string, value: Record<string, unknown>, fieldMask?: string[]) {
  const mask = fieldMask?.map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const separator = mask ? `?${mask}&` : "?";
  const response = await fetch(`${publicBaseUrl()}/${collectionName}/${encodeURIComponent(documentId)}${separator}key=${firebaseConfig.apiKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: toFirestoreFields(value) }),
  });
  if (!response.ok) throw new Error(`Firestore no pudo guardar ${collectionName}.`);
}

function publicBaseUrl() {
  return `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
}

function documentIdFromName(name: string) {
  return name.split("/").pop() ?? "";
}

type FirestoreRestValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  arrayValue?: { values?: FirestoreRestValue[] };
  mapValue?: { fields?: Record<string, FirestoreRestValue> };
};

function toFirestoreFields(value: Record<string, unknown>): Record<string, FirestoreRestValue> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, toFirestoreValue(item)]));
}

function toFirestoreValue(value: unknown): FirestoreRestValue {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  return { stringValue: String(value) };
}

function fromFirestoreFields(fields: Record<string, FirestoreRestValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]));
}

function fromFirestoreValue(value: FirestoreRestValue): unknown {
  if ("stringValue" in value) return value.stringValue ?? "";
  if ("integerValue" in value) return Number(value.integerValue ?? 0);
  if ("doubleValue" in value) return value.doubleValue ?? 0;
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("arrayValue" in value) return (value.arrayValue?.values ?? []).map(fromFirestoreValue);
  if ("mapValue" in value) return fromFirestoreFields(value.mapValue?.fields ?? {});
  return null;
}
