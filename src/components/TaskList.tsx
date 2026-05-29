import { useEffect, useState } from "react";
import { Check, ListTodo, Plus, Trash2 } from "lucide-react";
import { createTask, sortTasks } from "../domain/tasks";
import { addTask, deleteTask, loadTasks, persistTasks, updateTaskDone } from "../services/tasksRepository";
import { useAppData } from "../services/AppDataContext";
import type { Task } from "../types/worksync";

const dateFormatter = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" });

const formatDate = (date: string | null) => {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : dateFormatter.format(parsed);
};

export function TaskList() {
  const { currentUser } = useAppData();
  const userId = currentUser?.id;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    let active = true;
    loadTasks(userId)
      .then((loaded) => active && setTasks(sortTasks(loaded)))
      .catch(() => active && setError("No se pudieron cargar las tareas."));
    return () => {
      active = false;
    };
  }, [userId]);

  if (!userId) return null;

  const apply = (next: Task[]) => {
    setTasks(sortTasks(next));
    persistTasks(userId, next);
  };

  const add = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    const task = createTask(userId, title, date || null);
    apply([task, ...tasks]);
    setTitle("");
    setDate("");
    setError("");
    try {
      await addTask(task);
    } catch {
      setError("No se pudo guardar la tarea.");
    }
  };

  const toggle = async (task: Task) => {
    apply(tasks.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item)));
    try {
      await updateTaskDone(task.id, !task.done);
    } catch {
      setError("No se pudo actualizar la tarea.");
    }
  };

  const remove = async (id: string) => {
    apply(tasks.filter((item) => item.id !== id));
    try {
      await deleteTask(id);
    } catch {
      setError("No se pudo borrar la tarea.");
    }
  };

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <ListTodo className="text-primary" />
        <h2 className="text-xl font-bold">Tareas rapidas</h2>
      </div>

      <form onSubmit={add} className="flex flex-col gap-2">
        <input
          className="rounded-lg border border-border-subtle bg-surface-container-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="Nueva tarea..."
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <div className="flex gap-2">
          <input
            type="date"
            className="flex-1 rounded-lg border border-border-subtle bg-surface-container-low px-3 py-2 text-sm text-text-secondary outline-none focus:ring-2 focus:ring-primary"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">
            <Plus size={16} />
            Agregar
          </button>
        </div>
      </form>

      {error && <p className="mt-3 rounded-lg bg-status-occupied/15 px-3 py-2 text-xs text-error-red">{error}</p>}

      <ul className="mt-4 space-y-2">
        {tasks.length === 0 && <li className="rounded-lg bg-surface-container-low px-3 py-4 text-center text-sm text-text-secondary">Sin tareas. Agrega la primera.</li>}
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-3 rounded-lg border border-border-subtle px-3 py-2">
            <button
              type="button"
              onClick={() => toggle(task)}
              aria-label={task.done ? "Marcar como pendiente" : "Marcar como hecha"}
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
                task.done ? "border-primary bg-primary text-white" : "border-border-subtle text-transparent hover:border-primary"
              }`}
            >
              <Check size={13} />
            </button>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm ${task.done ? "text-text-secondary line-through" : "text-on-surface"}`}>{task.title}</p>
              {formatDate(task.date) && <p className="font-mono text-[11px] text-text-secondary">{formatDate(task.date)}</p>}
            </div>
            <button type="button" onClick={() => remove(task.id)} aria-label="Borrar tarea" className="text-text-secondary transition hover:text-error-red">
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
