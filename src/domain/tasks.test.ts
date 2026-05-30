import { describe, expect, it } from "vitest";
import {
  buildDaySummary,
  countFreeBlocks,
  createTask,
  dayKeyForDate,
  pendingTasksForDate,
  sortTasks,
  toISODate,
} from "./tasks";
import type { Task, UserSchedule } from "../types/worksync";

const make = (over: Partial<Task>): Task => ({
  id: over.id ?? "t-1",
  userId: "u1",
  title: "Tarea",
  date: null,
  done: false,
  createdAt: 0,
  ...over,
});

describe("createTask", () => {
  it("trims the title and normalizes empty dates to null", () => {
    const task = createTask("u9", "  Comprar pan  ", "");
    expect(task.title).toBe("Comprar pan");
    expect(task.date).toBeNull();
    expect(task.userId).toBe("u9");
    expect(task.done).toBe(false);
  });
});

describe("sortTasks", () => {
  it("puts pending tasks before done ones", () => {
    const sorted = sortTasks([
      make({ id: "done", done: true, createdAt: 100 }),
      make({ id: "pending", done: false, createdAt: 50 }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["pending", "done"]);
  });

  it("orders dated tasks by earliest date, undated last", () => {
    const sorted = sortTasks([
      make({ id: "none" }),
      make({ id: "late", date: "2026-06-10" }),
      make({ id: "soon", date: "2026-06-01" }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["soon", "late", "none"]);
  });
});

describe("dayKeyForDate / toISODate", () => {
  it("maps weekdays (including weekends) to day keys", () => {
    expect(dayKeyForDate(new Date("2026-06-01T09:00:00"))).toBe("mon");
    expect(dayKeyForDate(new Date("2026-06-06T09:00:00"))).toBe("sat");
    expect(dayKeyForDate(new Date("2026-06-07T09:00:00"))).toBe("sun");
  });

  it("formats a local date as YYYY-MM-DD", () => {
    expect(toISODate(new Date("2026-06-07T23:30:00"))).toBe("2026-06-07");
  });
});

describe("countFreeBlocks", () => {
  const schedule: UserSchedule = {
    userId: "u1",
    blocks: [
      { day: "sat", hour: "08:00", state: "free" },
      { day: "sat", hour: "08:30", state: "preferred" },
      { day: "sat", hour: "13:30", state: "free" },
      { day: "sat", hour: "14:00", state: "occupied" },
      { day: "sat", hour: "14:30", state: "avoid" },
      { day: "sun", hour: "08:00", state: "free" },
    ],
  };

  it("counts free and preferred blocks, ignoring busy states", () => {
    expect(countFreeBlocks(schedule, "sat")).toBe(3);
    expect(countFreeBlocks(schedule, "sun")).toBe(1);
  });

  it("returns 0 without a schedule", () => {
    expect(countFreeBlocks(null, "sat")).toBe(0);
    expect(countFreeBlocks(undefined, "sat")).toBe(0);
  });
});

describe("pendingTasksForDate", () => {
  it("keeps only pending tasks whose date matches", () => {
    const tasks = [
      make({ id: "today", date: "2026-06-07" }),
      make({ id: "today-done", date: "2026-06-07", done: true }),
      make({ id: "other", date: "2026-06-08" }),
      make({ id: "undated" }),
    ];
    expect(pendingTasksForDate(tasks, "2026-06-07").map((t) => t.id)).toEqual(["today"]);
  });
});

describe("buildDaySummary", () => {
  it("crosses today's tasks with today's free blocks into one message", () => {
    const date = new Date("2026-06-06T10:00:00"); // Saturday
    const tasks = [
      make({ id: "a", date: "2026-06-06" }),
      make({ id: "b", date: "2026-06-06" }),
      make({ id: "c", date: "2026-06-06", done: true }),
    ];
    const schedule: UserSchedule = {
      userId: "u1",
      blocks: [
        { day: "sat", hour: "08:00", state: "free" },
        { day: "sat", hour: "08:40", state: "preferred" },
        { day: "sat", hour: "09:20", state: "occupied" },
      ],
    };
    const summary = buildDaySummary(tasks, schedule, date);
    expect(summary.dayKey).toBe("sat");
    expect(summary.iso).toBe("2026-06-06");
    expect(summary.taskCount).toBe(2);
    expect(summary.freeBlockCount).toBe(2);
    expect(summary.message).toBe("Hoy tienes 2 tareas y 2 bloques libres.");
  });

  it("uses singular wording for a single task and block", () => {
    const date = new Date("2026-06-01T10:00:00"); // Monday
    const tasks = [make({ id: "a", date: "2026-06-01" })];
    const schedule: UserSchedule = { userId: "u1", blocks: [{ day: "mon", hour: "08:00", state: "free" }] };
    expect(buildDaySummary(tasks, schedule, date).message).toBe("Hoy tienes 1 tarea y 1 bloque libre.");
  });
});
