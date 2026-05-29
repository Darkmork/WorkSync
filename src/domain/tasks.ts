import type { Task } from "../types/worksync";

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
