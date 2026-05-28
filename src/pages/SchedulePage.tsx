import { useMemo, useState } from "react";
import { Brush, Lightbulb } from "lucide-react";
import { ScheduleGrid } from "../components/ScheduleGrid";
import { useAppData } from "../services/AppDataContext";
import type { ScheduleState } from "../types/worksync";

const brushes: Array<{ state: ScheduleState; label: string; color: string }> = [
  { state: "free", label: "Libre", color: "bg-status-free" },
  { state: "preferred", label: "Preferido", color: "bg-status-preferred" },
  { state: "occupied", label: "Ocupado", color: "bg-status-occupied" },
  { state: "avoid", label: "Evitar", color: "bg-status-avoid" },
];

export function SchedulePage() {
  const { data, updateSchedule } = useAppData();
  const [activeBrush, setActiveBrush] = useState<ScheduleState>("free");
  const currentSchedule = useMemo(
    () => data?.schedules.find((schedule) => schedule.userId === data.currentUserId),
    [data],
  );
  const [draft, setDraft] = useState(currentSchedule?.blocks ?? []);

  if (!data || !currentSchedule) return <div className="rounded-xl bg-white p-8 shadow-soft">Cargando horario...</div>;

  const blocks = draft.length ? draft : currentSchedule.blocks;

  return (
    <div className="flex flex-col gap-8 pb-20 lg:flex-row lg:items-start lg:pb-0">
      <aside className="w-full space-y-6 lg:sticky lg:top-24 lg:w-64">
        <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <Brush className="text-primary" />
            Pinceles
          </h2>
          <div className="space-y-3">
            {brushes.map((brush) => (
              <button
                key={brush.state}
                type="button"
                onClick={() => setActiveBrush(brush.state)}
                className={`flex w-full items-center gap-3 rounded-lg border border-border-subtle p-3 text-left transition ${
                  activeBrush === brush.state ? "bg-surface-container-high ring-2 ring-primary ring-offset-2" : "hover:bg-surface-container-low"
                }`}
              >
                <span className={`h-4 w-4 rounded-full ${brush.color}`} />
                <span className="font-mono text-xs font-semibold">{brush.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary-container/10 p-5">
          <Lightbulb className="mb-2 text-primary" />
          <h3 className="font-bold text-primary">Pro tip</h3>
          <p className="mt-2 font-mono text-xs leading-6 text-on-surface-variant">Marca tus bloques preferidos. WorkSync los prioriza al recomendar.</p>
        </div>
        <button onClick={() => updateSchedule(blocks)} className="w-full rounded-lg bg-primary px-5 py-3 font-bold text-white shadow-soft transition-transform active:scale-95">
          Guardar cambios
        </button>
      </aside>
      <section className="min-w-0 flex-1">
        <div className="mb-5">
          <h1 className="text-4xl font-bold">Mi horario</h1>
          <p className="mt-2 text-text-secondary">Pinta tu disponibilidad semanal para que WorkSync pueda cruzarla con tus grupos.</p>
        </div>
        <ScheduleGrid blocks={blocks} activeState={activeBrush} editable onChange={setDraft} />
      </section>
    </div>
  );
}

