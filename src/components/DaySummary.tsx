import { useEffect, useMemo, useState } from "react";
import { CalendarRange, ListChecks, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { buildDaySummary, sortTasks } from "../domain/tasks";
import { loadTasks } from "../services/tasksRepository";
import { useAppData } from "../services/AppDataContext";
import type { Task } from "../types/worksync";

// "Tu día": crosses today's pending tasks with today's free schedule blocks so
// the user sees, at a glance, how loaded their day is and where the gaps are.
export function DaySummary() {
  const { data, currentUser } = useAppData();
  const userId = currentUser?.id;
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    loadTasks(userId)
      .then((loaded) => active && setTasks(sortTasks(loaded)))
      .catch(() => active && setTasks([]));
    return () => {
      active = false;
    };
  }, [userId]);

  const schedule = useMemo(
    () => data?.schedules.find((item) => item.userId === userId) ?? null,
    [data, userId],
  );

  const summary = useMemo(() => buildDaySummary(tasks, schedule), [tasks, schedule]);
  const todaysTasks = useMemo(
    () => tasks.filter((task) => !task.done && task.date === summary.iso),
    [tasks, summary.iso],
  );

  if (!userId) return null;

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="text-primary" />
        <h2 className="text-xl font-bold">Tu día</h2>
      </div>

      <p className="text-on-surface-variant">{summary.message}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface-container-low p-4">
          <div className="flex items-center gap-2 text-text-secondary">
            <ListChecks size={16} />
            <span className="font-mono text-[11px] uppercase tracking-wide">Tareas hoy</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-on-surface">{summary.taskCount}</p>
        </div>
        <div className="rounded-xl bg-surface-container-low p-4">
          <div className="flex items-center gap-2 text-text-secondary">
            <CalendarRange size={16} />
            <span className="font-mono text-[11px] uppercase tracking-wide">Bloques libres</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-on-surface">{summary.freeBlockCount}</p>
        </div>
      </div>

      {todaysTasks.length > 0 && (
        <ul className="mt-4 space-y-2">
          {todaysTasks.slice(0, 4).map((task) => (
            <li key={task.id} className="flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span className="min-w-0 flex-1 truncate">{task.title}</span>
            </li>
          ))}
        </ul>
      )}

      <Link to="/horario" className="mt-4 inline-block font-bold text-primary">
        Ajustar mi horario
      </Link>
    </div>
  );
}
