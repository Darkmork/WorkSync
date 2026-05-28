export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type ScheduleState = "free" | "preferred" | "occupied" | "avoid";

export type GroupType = "study" | "project" | "work" | "personal" | "sports";

export type SessionStatus = "proposed" | "confirmed" | "cancelled";

export type Modality = "remote" | "in_person" | "hybrid";

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
}

export interface TimeSlot {
  start: string;
  end: string;
  label: string;
  kind: "class" | "lunch" | "hour";
}

export interface UserSchedule {
  userId: string;
  blocks: ScheduleBlock[];
}

export interface WorkGroup {
  id: string;
  name: string;
  description: string;
  type: GroupType;
  color: string;
  ownerId: string;
  memberIds: string[];
  status: "active" | "pending" | "inactive";
}

export interface Recommendation {
  id: string;
  groupId: string;
  day: DayKey;
  dateLabel: string;
  start: string;
  end: string;
  score: number;
  modality: Modality;
  availableCount: number;
  memberCount: number;
  badges: string[];
  justification: string;
}

export interface GroupSession {
  id: string;
  groupId: string;
  title: string;
  dateLabel: string;
  start: string;
  end: string;
  modality: Modality;
  location: string;
  status: SessionStatus;
  score: number;
  justification: string;
}

export interface WorkSyncData {
  users: UserProfile[];
  currentUserId: string;
  schedules: UserSchedule[];
  groups: WorkGroup[];
  sessions: GroupSession[];
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
