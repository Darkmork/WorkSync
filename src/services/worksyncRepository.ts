import { addDoc, collection, doc, getDocs, setDoc, updateDoc } from "firebase/firestore";
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

export async function loadWorkSyncData(currentUserId?: string): Promise<WorkSyncData> {
  if (!isFirebaseConfigured || !db) {
    const stored = localStorage.getItem(localKey);
    return normalizeData(stored ? (JSON.parse(stored) as WorkSyncData) : cloneDemo());
  }

  if (!requiresFirebaseAuth) {
    return loadPublicFirebaseData(currentUserId);
  }

  const [usersSnap, groupsSnap, sessionsSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "groups")),
    getDocs(collection(db, "sessions")),
  ]);

  const schedulesSnap = await getDocs(collection(db, "schedules"));
  const data = cloneDemo();

  const effectiveUserId = currentUserId ?? data.currentUserId;
  const firestoreUsers = usersSnap.docs.map((item) => ({ id: item.id, ...item.data() })) as WorkSyncData["users"];
  const seeded = demoForUser(effectiveUserId, firestoreUsers.find((user) => user.id === effectiveUserId));
  const loadedSchedules = schedulesSnap.empty
    ? seeded.schedules
    : schedulesSnap.docs.map((item) => ({ userId: item.id, ...item.data() })) as WorkSyncData["schedules"];

  return normalizeData({
    currentUserId: effectiveUserId,
    users: usersSnap.empty ? seeded.users : mergeUsers(seeded.users, firestoreUsers),
    groups: groupsSnap.empty ? seeded.groups : groupsSnap.docs.map((item) => ({ id: item.id, ...item.data() })) as WorkGroup[],
    sessions: sessionsSnap.empty ? seeded.sessions : sessionsSnap.docs.map((item) => ({ id: item.id, ...item.data() })) as GroupSession[],
    schedules: loadedSchedules.some((schedule) => schedule.userId === effectiveUserId)
      ? loadedSchedules
      : [...loadedSchedules, createDefaultUserSchedule(effectiveUserId)],
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
      const created = await addDoc(collection(db, "groups"), group);
      group.id = created.id;
    } else {
      await savePublicDocument("groups", group.id, group as unknown as Record<string, unknown>);
    }
  }
  const next = { ...data, groups: [group, ...data.groups] };
  await persistLocalData(next);
  return next;
}

export async function saveSession(session: GroupSession, data: WorkSyncData) {
  if (isFirebaseConfigured && db) {
    if (requiresFirebaseAuth) {
      const created = await addDoc(collection(db, "sessions"), session);
      session.id = created.id;
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
