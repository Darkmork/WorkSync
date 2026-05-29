import { collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where, type DocumentData } from "firebase/firestore";
import { demoData, normalizeScheduleBlocks } from "../data/demoData";
import { resolveInvitations } from "../domain/invitations";
import type { MutationResult, WriteOp } from "../domain/mutations";
import type { GroupSession, WorkGroup, WorkSyncData } from "../types/worksync";
import { db, isFirebaseConfigured } from "./firebase";

const cloneDemo = (): WorkSyncData => JSON.parse(JSON.stringify(demoData)) as WorkSyncData;

const normalizeData = (data: WorkSyncData, currentUserId = data.currentUserId): WorkSyncData => ({
  ...data,
  currentUserId,
  schedules: data.schedules.map((schedule) => ({
    ...schedule,
    blocks: normalizeScheduleBlocks(schedule.blocks),
  })),
});

const localKey = "worksync-demo-data";

// Execute a single persistence intent against Firestore. No-op in local/demo
// mode (no Firebase) — local state is mirrored to localStorage by commit().
async function applyWrite(op: WriteOp): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  if (op.kind === "delete") {
    await deleteDoc(doc(db, op.collection, op.id));
    return;
  }
  if (op.kind === "update") {
    await updateDoc(doc(db, op.collection, op.id), op.value as DocumentData);
    return;
  }
  await setDoc(doc(db, op.collection, op.id), op.value as DocumentData);
}

export async function loadWorkSyncData(currentUserId?: string, currentEmail?: string): Promise<WorkSyncData> {
  // Demo / local mode: app runs without Firebase configured (e.g. local dev).
  if (!isFirebaseConfigured || !db) {
    const stored = localStorage.getItem(localKey);
    return normalizeData(stored ? (JSON.parse(stored) as WorkSyncData) : cloneDemo());
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

  // Resolve invitations (pure): an invited user auto-joins. Persist the joins,
  // tolerating rejection so the group still shows locally with updated members.
  const { groups, writes } = resolveInvitations(Array.from(groupsById.values()), effectiveUserId, email);
  await Promise.all(writes.map((op) => applyWrite(op).catch(() => undefined)));

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

// Single persistence seam: push the doc to Firestore (if configured) and mirror
// the next snapshot to localStorage (demo mode only). Returns the next state.
export async function commit(result: MutationResult): Promise<WorkSyncData> {
  await applyWrite(result.write);
  await persistLocalData(result.next);
  return result.next;
}
