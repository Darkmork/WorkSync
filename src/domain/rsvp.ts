import type { RsvpStatus } from "../types/worksync";

export type RsvpResponse = RsvpStatus | "pending";

export interface RsvpEntry {
  userId: string;
  status: RsvpResponse;
}

// A display-ready roll-up of a session's attendance answers. Members without an
// answer are surfaced explicitly as "pending" so the UI can show "3 de 5" and a
// per-person list in one pass — the counting logic lives here, not in the view.
export interface RsvpSummary {
  yes: number;
  no: number;
  maybe: number;
  pending: number;
  total: number;
  entries: RsvpEntry[];
}

export function summarizeRsvps(
  memberIds: string[],
  rsvps: Record<string, RsvpStatus> | undefined,
): RsvpSummary {
  const map = rsvps ?? {};
  const entries: RsvpEntry[] = memberIds.map((userId) => ({
    userId,
    status: map[userId] ?? "pending",
  }));

  return {
    yes: entries.filter((entry) => entry.status === "yes").length,
    no: entries.filter((entry) => entry.status === "no").length,
    maybe: entries.filter((entry) => entry.status === "maybe").length,
    pending: entries.filter((entry) => entry.status === "pending").length,
    total: memberIds.length,
    entries,
  };
}
