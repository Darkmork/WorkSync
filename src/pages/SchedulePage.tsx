import { useMemo, useState } from "react";
import { Brush, CalendarDays, Lightbulb } from "lucide-react";
import { ScheduleGrid } from "../components/ScheduleGrid";
import { useAppData } from "../services/AppDataContext";
import { connectCalendar } from "../services/auth";
import { CalendarAuthError, fetchWeekEvents, hasCalendarToken } from "../services/calendar";
import { eventsToBusyBlocks } from "../domain/calendarMapping";
import type { ScheduleBlock, ScheduleState } from "../types/worksync";

type BrushMode = ScheduleState | "note";

const brushes: Array<{ mode: BrushMode; label: string; color: string }> = [
  { mode: "free", label: "Libre", color: "bg-status-free" },
  { mode: "preferred", label: "Preferido", color: "bg-status-preferred" },
  { mode: "occupied", label: "Ocupado", color: "bg-status-occupied" },
  { mode: "avoid", label: "Evitar", color: "bg-status-avoid" },
  { mode: "note", label: "Nota", color: "bg-primary" },
];

export function SchedulePage() {
  const { data, updateSchedule } = useAppData();
  const [activeBrush, setActiveBrush] = useState<BrushMode>("free");
  const [selectedKey, setSelectedKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [importMsg, setImportMsg] = useState("");
  const currentSchedule = useMemo(
    () => data?.schedules.find((schedule) => schedule.userId === data.currentUserId),
    [data],
  );
  const [draft, setDraft] = useState<ScheduleBlock[]>(currentSchedule?.blocks ?? []);

  if (!data || !currentSchedule) return <div className="rounded-xl bg-white p-8 shadow-soft">Cargando horario...</div>;

  const blocks = draft.length ? draft : currentSchedule.blocks;
  const selectedBlock = blocks.find((block) => `${block.day}-${block.hour}` === selectedKey);

  const edit = (next: ScheduleBlock[]) => {
    setDraft(next);
    setStatus("idle");
  };

  const setNote = (note: string) => {
    if (!selectedKey) return;
    edit(blocks.map((block) => (`${block.day}-${block.hour}` === selectedKey ? { ...block, note: note || undefined } : block)));
  };

  const save = async () => {
    setStatus("saving");
    try {
      await updateSchedule(blocks);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  const importFromCalendar = async () => {
    setImportMsg("Importando...");
    try {
      if (!hasCalendarToken()) {
        const ok = await connectCalendar();
        if (!ok) {
          setImportMsg("No se pudo conectar Google Calendar.");
          return;
        }
      }
      const events = await fetchWeekEvents();
      edit(eventsToBusyBlocks(events, blocks));
      setImportMsg("Eventos importados como 'ocupado'. Revisa y guarda.");
    } catch (error) {
      setImportMsg(error instanceof CalendarAuthError ? "Reconecta Google Calendar e intenta de nuevo." : "No se pudo importar de Calendar.");
    }
  };

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
                key={brush.mode}
                type="button"
                onClick={() => setActiveBrush(brush.mode)}
                className={`flex w-full items-center gap-3 rounded-lg border border-border-subtle p-3 text-left transition ${
                  activeBrush === brush.mode ? "bg-surface-container-high ring-2 ring-primary ring-offset-2" : "hover:bg-surface-container-low"
                }`}
              >
                <span className={`h-4 w-4 rounded-full ${brush.color}`} />
                <span className="font-mono text-xs font-semibold">{brush.label}</span>
              </button>
            ))}
          </div>
        </div>
        {activeBrush === "note" ? (
          <div className="rounded-xl border border-primary/20 bg-primary-container/10 p-5">
            <h3 className="font-bold text-primary">Nota del bloque</h3>
            {selectedBlock ? (
              <>
                <p className="mt-1 font-mono text-[11px] uppercase text-text-secondary">{selectedKey}</p>
                <input
                  className="mt-3 w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ej. Calculo II"
                  value={selectedBlock.note ?? ""}
                  onChange={(event) => setNote(event.target.value)}
                />
              </>
            ) : (
              <p className="mt-2 font-mono text-xs leading-6 text-on-surface-variant">Toca un bloque del horario para escribir que haces en esa hora.</p>
            )}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary-container/10 p-5">
            <Lightbulb className="mb-2 text-primary" />
            <h3 className="font-bold text-primary">Pro tip</h3>
            <p className="mt-2 font-mono text-xs leading-6 text-on-surface-variant">Marca tus bloques preferidos. WorkSync los prioriza al recomendar. Usa "Nota" para anotar que ocurre en cada hora.</p>
          </div>
        )}
        <button
          onClick={save}
          disabled={status === "saving"}
          className="w-full rounded-lg bg-primary px-5 py-3 font-bold text-white shadow-soft transition-transform active:scale-95 disabled:opacity-70"
        >
          {status === "saving" ? "Guardando..." : status === "saved" ? "Guardado ✓" : "Guardar cambios"}
        </button>
        {status === "error" && <p className="rounded-lg bg-status-occupied/15 px-3 py-2 text-center text-xs text-error-red">No se pudo guardar. Intenta de nuevo.</p>}
        <button
          type="button"
          onClick={importFromCalendar}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-subtle px-5 py-3 text-sm font-bold text-primary transition hover:bg-surface-container-low"
        >
          <CalendarDays size={16} />
          Importar de Google Calendar
        </button>
        {importMsg && <p className="rounded-lg bg-primary-fixed px-3 py-2 text-center text-xs text-primary">{importMsg}</p>}
      </aside>
      <section className="min-w-0 flex-1">
        <div className="mb-5">
          <h1 className="text-4xl font-bold">Mi horario</h1>
          <p className="mt-2 text-text-secondary">Pinta tu disponibilidad semanal para que WorkSync pueda cruzarla con tus grupos.</p>
        </div>
        <ScheduleGrid
          blocks={blocks}
          activeState={activeBrush === "note" ? "free" : activeBrush}
          editable
          noteMode={activeBrush === "note"}
          selectedKey={activeBrush === "note" ? selectedKey : ""}
          onChange={edit}
          onSelect={(day, hour) => setSelectedKey(`${day}-${hour}`)}
        />
      </section>
    </div>
  );
}

