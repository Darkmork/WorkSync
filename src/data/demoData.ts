import type { Poll, ScheduleBlock, UserSchedule, WorkGroup, WorkSyncData, GroupSession } from "../types/worksync";
import { days, timeSlots } from "../types/worksync";
import { migrateScheduleBlocks } from "../domain/grid";

const avatar = (seed: string) => `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=d8e2ff,adc6ff,7ffc97`;

export const createDefaultSchedule = (userId: string): UserSchedule => ({
  userId,
  blocks: normalizeScheduleBlocks([]),
});

// Storage normalization for any schedule. Old school-slot schedules are migrated
// onto the canonical 30-min axis; canonical schedules are just default-filled, so
// every user ends up on one comparable grid for the group engines.
export const normalizeScheduleBlocks = (blocks: ScheduleBlock[]): ScheduleBlock[] => migrateScheduleBlocks(blocks);

const scheduleFromPattern = (userId: string, preferredDays: string[], busyPairs: string[]): UserSchedule => {
  const blocks: ScheduleBlock[] = days.flatMap((day) =>
    timeSlots.map((slot) => {
      const hour = slot.start;
      const pair = `${day.key}-${hour}`;
      if (busyPairs.includes(pair)) return { day: day.key, hour, state: "occupied" };
      if (preferredDays.includes(day.key) && ["10:20", "11:05", "14:55", "16:00"].includes(hour)) {
        return { day: day.key, hour, state: "preferred" };
      }
      if (slot.kind === "lunch" || ["08:00", "19:00", "20:00"].includes(hour)) return { day: day.key, hour, state: "avoid" };
      return { day: day.key, hour, state: "free" };
    }),
  );

  return { userId, blocks };
};

const schedules: UserSchedule[] = [
  scheduleFromPattern("u1", ["tue", "thu"], ["mon-10:20", "mon-11:05", "wed-14:55", "fri-14:10"]),
  scheduleFromPattern("u2", ["tue", "wed"], ["mon-09:20", "tue-12:05", "thu-16:00", "fri-10:20"]),
  scheduleFromPattern("u3", ["tue", "fri"], ["wed-10:20", "wed-11:05", "thu-14:55", "fri-12:50"]),
  scheduleFromPattern("u4", ["mon", "tue"], ["mon-14:55", "wed-16:00", "thu-10:20", "fri-11:05"]),
];

const groups: WorkGroup[] = [
  {
    id: "g1",
    name: "Proyecto Calculo II",
    description: "Grupo de estudio para preparar el parcial y coordinar sesiones semanales.",
    type: "study",
    color: "#0058be",
    ownerId: "u1",
    memberIds: ["u1", "u2", "u3", "u4"],
    status: "active",
  },
  {
    id: "g2",
    name: "Design Team",
    description: "Equipo de producto revisando prototipos y decisiones visuales.",
    type: "work",
    color: "#006b2c",
    ownerId: "u1",
    memberIds: ["u1", "u2", "u3"],
    status: "active",
  },
  {
    id: "g3",
    name: "AI Ethics Workshop",
    description: "Taller pendiente de coordinacion con invitados externos.",
    type: "project",
    color: "#64a8fe",
    ownerId: "u1",
    memberIds: ["u1", "u4"],
    status: "pending",
  },
];

const sessions: GroupSession[] = [
  {
    id: "s1",
    groupId: "g1",
    title: "Repaso Calculo II",
    dateLabel: "Martes 24 Oct",
    start: "15:00",
    end: "17:00",
    modality: "hybrid",
    location: "Biblioteca central + Meet",
    status: "confirmed",
    score: 92,
    justification: "Todos tienen disponibilidad y tres integrantes marcaron el bloque como preferido.",
  },
];

const polls: Poll[] = [
  {
    id: "poll1",
    groupId: "g1",
    title: "Cuando hacemos el repaso de Calculo II?",
    createdBy: "u1",
    status: "open",
    candidates: [
      { id: "pc1", day: "tue", dateLabel: "Martes 24 Oct", start: "15:00", end: "17:00", modality: "hybrid" },
      { id: "pc2", day: "thu", dateLabel: "Jueves 26 Oct", start: "16:00", end: "18:00", modality: "remote" },
    ],
    votes: {
      u1: ["pc1"],
      u2: ["pc1", "pc2"],
      u3: ["pc2"],
    },
    createdAt: 0,
  },
];

export const demoData: WorkSyncData = {
  currentUserId: "u1",
  users: [
    { id: "u1", name: "Mateo Rivera", email: "mateo@worksync.app", avatarUrl: avatar("Mateo Rivera"), context: "Ingenieria" },
    { id: "u2", name: "Sofia Perez", email: "sofia@worksync.app", avatarUrl: avatar("Sofia Perez"), context: "Diseno" },
    { id: "u3", name: "Lucas Martin", email: "lucas@worksync.app", avatarUrl: avatar("Lucas Martin"), context: "Matematicas" },
    { id: "u4", name: "Camila Soto", email: "camila@worksync.app", avatarUrl: avatar("Camila Soto"), context: "Economia" },
  ],
  schedules,
  groups,
  sessions,
  polls,
};
