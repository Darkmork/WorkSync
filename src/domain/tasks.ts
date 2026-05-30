import type { DayKey, Task, UserSchedule } from "../types/worksync";
import { timeSlots } from "../types/worksync";

export function createTask(userId: string, title: string, date: string | null): Task {
  return {
    id: `t-${Date.now()}`,
    userId,
    title: title.trim(),
    date: date || null,
    done: false,
    createdAt: Date.now(),
  };
}

// Pending tasks first; within each group, dated before undated, earliest date
// first, then newest created first.
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.date && b.date && a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    return b.createdAt - a.createdAt;
  });
}

// --- Tasks <-> schedule cross-logic ------------------------------------------
// These pure helpers let the UI answer "how does my day look?" by crossing the
// task list with the weekly availability grid, without any React or I/O.

const weekdayToDayKey: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Hours that are not real working windows (lunch), excluded from "free block"
// counts so the summary never promises a slot nobody can actually use.
const nonWorkingHours = new Set(timeSlots.filter((slot) => slot.kind === "lunch").map((slot) => slot.start));

export function dayKeyForDate(date: Date): DayKey {
  return weekdayToDayKey[date.getDay()];
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Open, usable blocks for a given weekday: free or preferred, excluding lunch.
export function countFreeBlocks(schedule: UserSchedule | null | undefined, dayKey: DayKey): number {
  if (!schedule) return 0;
  return schedule.blocks.filter(
    (block) =>
      block.day === dayKey && !nonWorkingHours.has(block.hour) && (block.state === "free" || block.state === "preferred"),
  ).length;
}

// Pending (not done) tasks whose due date matches the given ISO day.
export function pendingTasksForDate(tasks: Task[], iso: string): Task[] {
  return tasks.filter((task) => !task.done && task.date === iso);
}

export interface DaySummary {
  dayKey: DayKey;
  iso: string;
  taskCount: number;
  freeBlockCount: number;
  message: string;
}

// Cross today's tasks with today's availability into a single human-readable
// line: "Hoy tienes N tareas y M bloques libres."
export function buildDaySummary(
  tasks: Task[],
  schedule: UserSchedule | null | undefined,
  date: Date = new Date(),
): DaySummary {
  const dayKey = dayKeyForDate(date);
  const iso = toISODate(date);
  const taskCount = pendingTasksForDate(tasks, iso).length;
  const freeBlockCount = countFreeBlocks(schedule, dayKey);
  const taskText = taskCount === 1 ? "1 tarea" : `${taskCount} tareas`;
  const blockText = freeBlockCount === 1 ? "1 bloque libre" : `${freeBlockCount} bloques libres`;
  return { dayKey, iso, taskCount, freeBlockCount, message: `Hoy tienes ${taskText} y ${blockText}.` };
}
