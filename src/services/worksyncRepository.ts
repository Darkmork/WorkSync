import { collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { demoData, normalizeScheduleBlocks } from "../data/demoData";
import type { GroupSession, ScheduleBlock, WorkGroup, WorkSyncData } from "../types/worksync";
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
    await setDoc(doc(db, "schedules", userId), { blocks: normalizeScheduleBlocks(blocks) });
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
    await setDoc(doc(db, "groups", group.id), group);
  }
  const next = { ...data, groups: [group, ...data.groups] };
  await persistLocalData(next);
  return next;
}

export async function updateGroup(group: WorkGroup, data: WorkSyncData) {
  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, "groups", group.id), group);
  }
  const next = { ...data, groups: data.groups.map((item) => (item.id === group.id ? group : item)) };
  await persistLocalData(next);
  return next;
}

export async function deleteGroup(groupId: string, data: WorkSyncData) {
  if (isFirebaseConfigured && db) {
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
    await setDoc(doc(db, "sessions", session.id), session);
  }
  const next = { ...data, sessions: [session, ...data.sessions] };
  await persistLocalData(next);
  return next;
}

export async function confirmSession(sessionId: string, data: WorkSyncData) {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, "sessions", sessionId), { status: "confirmed" });
  }
  const next: WorkSyncData = {
    ...data,
    sessions: data.sessions.map((session) => (session.id === sessionId ? { ...session, status: "confirmed" } : session)),
  };
  await persistLocalData(next);
  return next;
}
