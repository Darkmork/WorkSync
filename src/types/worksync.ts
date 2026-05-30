export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type ScheduleState = "free" | "preferred" | "occupied" | "avoid";

export type GroupType = "study" | "project" | "work" | "personal" | "sports";

export type SessionStatus = "proposed" | "confirmed" | "cancelled";

export type Modality = "remote" | "in_person" | "hybrid";

// A member's attendance answer for a session.
export type RsvpStatus = "yes" | "no" | "maybe";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  context: string;
}

export interface ScheduleBlock {
  day: DayKey;
  hour: string;
  state: ScheduleState;
  note?: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  date: string | null;
  done: boolean;
  createdAt: number;
}

export interface TimeSlot {
  start: string;
  end: string;
  label: string;
  kind: "class" | "lunch" | "hour";
}

// A per-user VIEW over the canonical 30-min storage axis: how wide each editable
// cell is, which hour range to show, and which weekdays. Storage stays canonical;
// this only shapes how the owner edits their week. See domain/grid.ts.
export interface GridConfig {
  granularityMinutes: 30 | 60;
  startHour: number;
  endHour: number;
  days: DayKey[];
}

export interface UserSchedule {
  userId: string;
  blocks: ScheduleBlock[];
  // The owner's editing preference. Absent means "use the default grid".
  gridConfig?: GridConfig;
}

// The slice of the week a group is willing to meet in. `days` are the valid
// weekdays; `from`/`to` bound the time of day ("HH:MM", 24h, zero-padded so
// they compare lexicographically). Absent/undefined means "no restriction" —
// the group can meet any day at any school slot, which keeps every existing
// group working unchanged.
export interface GroupWindow {
  days: DayKey[];
  from: string;
  to: string;
}

export interface WorkGroup {
  id: string;
  name: string;
  description: string;
  type: GroupType;
  color: string;
  ownerId: string;
  memberIds: string[];
  invitedEmails?: string[];
  status: "active" | "pending" | "inactive";
  window?: GroupWindow;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
}

export interface Recommendation {
  id: string;
  groupId: string;
  day: DayKey;
  dateLabel: string;
  dateISO?: string;
  start: string;
  end: string;
  score: number;
  modality: Modality;
  availableCount: number;
  memberCount: number;
  // userIds of the members who are actually free in this window.
  availableMemberIds: string[];
  // Real availability ratio as a percentage: availableCount / memberCount.
  availabilityPct: number;
  badges: string[];
  justification: string;
}

export interface GroupSession {
  id: string;
  groupId: string;
  title: string;
  dateLabel: string;
  dateISO?: string;
  start: string;
  end: string;
  modality: Modality;
  location: string;
  status: SessionStatus;
  score: number;
  justification: string;
  // Per-member attendance answers, keyed by userId. Absent until someone responds.
  rsvps?: Record<string, RsvpStatus>;
}

export type PollStatus = "open" | "closed";

// One proposed meeting slot inside a poll. Mirrors the time fields of a
// Recommendation so a candidate can be built straight from one.
export interface PollCandidate {
  id: string;
  day: DayKey;
  dateLabel: string;
  dateISO?: string;
  start: string;
  end: string;
  modality: Modality;
}

// A lightweight vote among several candidate slots. Uses approval voting: each
// member approves the candidate slots they can attend, so `votes` maps a userId
// to the candidate ids they picked. Keying by userId (not candidate) lets a vote
// write touch only `votes.<uid>`, which the security rule uses to allow members
// to change their own vote without touching anyone else's.
export interface Poll {
  id: string;
  groupId: string;
  title: string;
  createdBy: string;
  status: PollStatus;
  candidates: PollCandidate[];
  votes: Record<string, string[]>;
  createdAt: number;
  // Set when the poll is closed: the winning candidate id (most approvals).
  winnerCandidateId?: string;
}

// A tallied candidate, ready for the UI: how many members approved it and who.
export interface PollResult {
  candidate: PollCandidate;
  voterIds: string[];
  count: number;
}

export interface WorkSyncData {
  users: UserProfile[];
  currentUserId: string;
  schedules: UserSchedule[];
  groups: WorkGroup[];
  sessions: GroupSession[];
  polls: Poll[];
}

export const days: Array<{ key: DayKey; short: string; label: string }> = [
  { key: "mon", short: "LUN", label: "Lunes" },
  { key: "tue", short: "MAR", label: "Martes" },
  { key: "wed", short: "MIE", label: "Miercoles" },
  { key: "thu", short: "JUE", label: "Jueves" },
  { key: "fri", short: "VIE", label: "Viernes" },
  { key: "sat", short: "SAB", label: "Sabado" },
  { key: "sun", short: "DOM", label: "Domingo" },
];

export const timeSlots: TimeSlot[] = [
  { start: "08:00", end: "08:40", label: "08:00 - 08:40", kind: "class" },
  { start: "08:40", end: "09:20", label: "08:40 - 09:20", kind: "class" },
  { start: "09:20", end: "10:05", label: "09:20 - 10:05", kind: "class" },
  { start: "10:20", end: "11:05", label: "10:20 - 11:05", kind: "class" },
  { start: "11:05", end: "11:50", label: "11:05 - 11:50", kind: "class" },
  { start: "12:05", end: "12:50", label: "12:05 - 12:50", kind: "class" },
  { start: "12:50", end: "13:35", label: "12:50 - 13:35", kind: "class" },
  { start: "13:35", end: "14:10", label: "Almuerzo", kind: "lunch" },
  { start: "14:10", end: "14:55", label: "14:10 - 14:55", kind: "class" },
  { start: "14:55", end: "15:40", label: "14:55 - 15:40", kind: "class" },
  { start: "16:00", end: "17:00", label: "16:00 - 17:00", kind: "hour" },
  { start: "17:00", end: "18:00", label: "17:00 - 18:00", kind: "hour" },
  { start: "18:00", end: "19:00", label: "18:00 - 19:00", kind: "hour" },
  { start: "19:00", end: "20:00", label: "19:00 - 20:00", kind: "hour" },
  { start: "20:00", end: "21:00", label: "20:00 - 21:00", kind: "hour" },
];

export const workHours = timeSlots.map((slot) => slot.start);
