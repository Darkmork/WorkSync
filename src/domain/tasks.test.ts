import { describe, expect, it } from "vitest";
import { createTask, sortTasks } from "./tasks";
import type { Task } from "../types/worksync";

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
