import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// The whole backend runs in one region with a small instance cap: this is a
// classroom-scale app, so we never want a runaway fan-out bill.
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

initializeApp();
const db = getFirestore();

// Single-timezone assumption (plan item 8 tracks the multi-TZ follow-up). All
// schedules/sessions store wall-clock strings, so reminders interpret them here.
const TIMEZONE = "America/Santiago";

interface NotificationPayload {
  kind: "session_proposed" | "session_confirmed" | "session_upcoming";
  title: string;
  detail: string;
  to?: string;
}

// Fan a single notification out to many users under a deterministic key. Writing
// to notifications/{uid}/items/{key} makes the operation idempotent: a retried
// trigger (or a duplicate event) overwrites the same doc instead of piling up.
async function notifyUsers(userIds: string[], key: string, payload: NotificationPayload): Promise<void> {
  if (userIds.length === 0) return;
  const batch = db.batch();
  for (const uid of userIds) {
    const ref = db.collection("notifications").doc(uid).collection("items").doc(key);
    batch.set(
      ref,
      {
        ...payload,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await batch.commit();
}

async function loadGroupMembers(groupId: string): Promise<{ name: string; memberIds: string[] } | null> {
  const snap = await db.collection("groups").doc(groupId).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  const memberIds = Array.isArray(data.memberIds) ? (data.memberIds as string[]) : [];
  return { name: typeof data.name === "string" ? data.name : "tu grupo", memberIds };
}

// Capa A.1 — a session is proposed: alert every member of its group.
export const onSessionCreated = onDocumentCreated("sessions/{sessionId}", async (event) => {
  const session = event.data?.data();
  if (!session || session.status !== "proposed") return;

  const group = await loadGroupMembers(session.groupId);
  if (!group) return;

  const sessionId = event.params.sessionId;
  await notifyUsers(group.memberIds, `proposed-${sessionId}`, {
    kind: "session_proposed",
    title: "Sesión propuesta",
    detail: `"${session.title}" en ${group.name} espera confirmación.`,
    to: `/sesiones/${sessionId}`,
  });
  logger.info("Notified proposed session", { sessionId, members: group.memberIds.length });
});

// Capa A.2 — a session transitions into "confirmed": alert every member.
export const onSessionConfirmed = onDocumentUpdated("sessions/{sessionId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!after) return;
  if (before?.status === "confirmed" || after.status !== "confirmed") return;

  const group = await loadGroupMembers(after.groupId);
  if (!group) return;

  const sessionId = event.params.sessionId;
  await notifyUsers(group.memberIds, `confirmed-${sessionId}`, {
    kind: "session_confirmed",
    title: "Sesión confirmada",
    detail: `"${after.title}" en ${group.name} quedó confirmada para ${after.dateLabel ?? after.dateISO} a las ${after.start}.`,
    to: `/sesiones/${sessionId}`,
  });
  logger.info("Notified confirmed session", { sessionId, members: group.memberIds.length });
});

// Capa B — every 15 minutes, remind members about confirmed sessions starting
// within the next hour. `reminderSent` on the session keeps a single reminder
// from re-firing; the deterministic `reminder-${id}` key is a second guard.
export const sendSessionReminders = onSchedule(
  { schedule: "every 15 minutes", timeZone: TIMEZONE },
  async () => {
    const { dateISO, minutes } = nowParts(TIMEZONE);

    const snap = await db
      .collection("sessions")
      .where("status", "==", "confirmed")
      .where("dateISO", "==", dateISO)
      .get();

    for (const doc of snap.docs) {
      const session = doc.data();
      if (session.reminderSent === true) continue;
      const startMin = toMinutes(session.start);
      if (startMin === null) continue;
      const delta = startMin - minutes;
      if (delta < 0 || delta > 60) continue;

      const group = await loadGroupMembers(session.groupId);
      if (!group) continue;

      await notifyUsers(group.memberIds, `reminder-${doc.id}`, {
        kind: "session_upcoming",
        title: "Próxima sesión",
        detail: `"${session.title}" empieza a las ${session.start} en ${session.location ?? group.name}.`,
        to: `/sesiones/${doc.id}`,
      });
      await doc.ref.update({ reminderSent: true });
      logger.info("Sent session reminder", { sessionId: doc.id, members: group.memberIds.length });
    }
  },
);

// Current wall-clock date (YYYY-MM-DD) and minutes-since-midnight in `tz`,
// computed with Intl so we never depend on the runtime's local timezone.
function nowParts(tz: string): { dateISO: string; minutes: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const dateISO = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return { dateISO, minutes };
}

function toMinutes(hhmm: unknown): number | null {
  if (typeof hhmm !== "string") return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}
