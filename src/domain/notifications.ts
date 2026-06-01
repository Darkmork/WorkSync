import type { WorkSyncData } from "../types/worksync";

export type NotificationKind = "invitation_pending" | "session_proposed" | "session_upcoming";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  to?: string; // route the bell links to
}

// Derived (no-backend) notifications: everything here is computed from data the
// user already loads, so there is no extra collection, no cross-user writes and
// no Cloud Functions. Scheduled reminders / email / push are a separate backend
// phase. `now` is injectable for deterministic tests.
export function computeNotifications(
  data: WorkSyncData | null,
  userId: string | undefined,
  email: string | undefined,
  now: Date = new Date(),
): AppNotification[] {
  if (!data || !userId) return [];

  const notifications: AppNotification[] = [];
  const myGroupIds = new Set(
    data.groups.filter((group) => group.memberIds.includes(userId)).map((group) => group.id),
  );
  const groupName = (id: string) => data.groups.find((group) => group.id === id)?.name ?? "tu grupo";

  // 1. Pending invitations: my email is invited but I'm not a member yet.
  const lowerEmail = (email ?? "").toLowerCase();
  if (lowerEmail) {
    for (const group of data.groups) {
      const invited = (group.invitedEmails ?? []).some((entry) => entry.toLowerCase() === lowerEmail);
      if (invited && !group.memberIds.includes(userId)) {
        notifications.push({
          id: `invite-${group.id}`,
          kind: "invitation_pending",
          title: "Invitación a un grupo",
          detail: `Te invitaron a "${group.name}".`,
          to: "/grupos",
        });
      }
    }
  }

  // 2. Proposed sessions in my groups awaiting confirmation.
  for (const session of data.sessions) {
    if (session.status === "proposed" && myGroupIds.has(session.groupId)) {
      notifications.push({
        id: `proposed-${session.id}`,
        kind: "session_proposed",
        title: "Sesión propuesta",
        detail: `"${session.title}" en ${groupName(session.groupId)} espera confirmación.`,
        to: `/sesiones/${session.id}`,
      });
    }
  }

  // 3. Confirmed sessions happening today or within the next two days.
  for (const session of data.sessions) {
    if (session.status !== "confirmed" || !session.dateISO || !myGroupIds.has(session.groupId)) continue;
    const days = daysUntil(session.dateISO, now);
    if (days === null || days < 0 || days > 2) continue;
    const when = days === 0 ? "hoy" : days === 1 ? "mañana" : `en ${days} días`;
    notifications.push({
      id: `upcoming-${session.id}`,
      kind: "session_upcoming",
      title: "Próxima sesión",
      detail: `"${session.title}" ${when} a las ${session.start}.`,
      to: `/sesiones/${session.id}`,
    });
  }

  return notifications;
}

function daysUntil(dateISO: string, now: Date): number | null {
  const parts = dateISO.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const target = new Date(year, month - 1, day);
  target.setHours(0, 0, 0, 0);
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - base.getTime()) / 86_400_000);
}
