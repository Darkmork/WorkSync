import { useMemo, useState } from "react";
import { CalendarDays, Lightbulb, X } from "lucide-react";
import { ScheduleGrid } from "../components/ScheduleGrid";
import { useAppData } from "../services/AppDataContext";
import { connectCalendar } from "../services/auth";
import { CalendarAuthError, fetchWeekEvents, hasCalendarToken } from "../services/calendar";
import { eventsToBusyBlocks } from "../domain/calendarMapping";
import { scheduleStateLabel, scheduleStateOrder } from "../domain/scheduleStates";
import { days, timeSlots } from "../types/worksync";
import type { ScheduleBlock } from "../types/worksync";

const legendColor: Record<(typeof scheduleStateOrder)[number], string> = {
  free: "bg-status-free",
  preferred: "bg-status-preferred",
  occupied: "bg-status-occupied",
  avoid: "bg-status-avoid",
};

export function SchedulePage() {
  const { data, updateSchedule } = useAppData();
  const [noteEditKey, setNoteEditKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [importMsg, setImportMsg] = useState("");
  const currentSchedule = useMemo(
    () => data?.schedules.find((schedule) => schedule.userId === data.currentUserId),
    [data],
  );
  const [draft, setDraft] = useState<ScheduleBlock[]>(currentSchedule?.blocks ?? []);

  if (!data || !currentSchedule) return <div className="rounded-xl bg-white p-8 shadow-soft">Cargando horario...</div>;

  const blocks = draft.length ? draft : currentSchedule.blocks;
  const noteBlock = blocks.find((block) => `${block.day}-${block.hour}` === noteEditKey);
  const noteLabel = noteBlock
    ? `${days.find((day) => day.key === noteBlock.day)?.label ?? ""} · ${timeSlots.find((slot) => slot.start === noteBlock.hour)?.label ?? noteBlock.hour}`
    : "";

  const edit = (next: ScheduleBlock[]) => {
    setDraft(next);
    setStatus("idle");
  };

  const setNote = (note: string) => {
    if (!noteEditKey) return;
    edit(blocks.map((block) => (`${block.day}-${block.hour}` === noteEditKey ? { ...block, note: note || undefined } : block)));
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
          <h2 className="mb-4 font-bold">Colores</h2>
          <div className="space-y-3">
            {scheduleStateOrder.map((state) => (
              <div key={state} className="flex items-center gap-3">
                <span className={`h-4 w-4 rounded-full ${legendColor[state]}`} />
                <span className="font-mono text-xs font-semibold">{scheduleStateLabel[state]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary-container/10 p-5">
          <Lightbulb className="mb-2 text-primary" />
          <h3 className="font-bold text-primary">Cómo editar</h3>
          <p className="mt-2 font-mono text-xs leading-6 text-on-surface-variant">
            Toca un bloque para ir cambiando su color. Haz doble clic o mantenlo presionado para agregar una nota
            (ej. "Cálculo II"). WorkSync prioriza tus bloques preferidos al recomendar.
          </p>
        </div>
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
          <p className="mt-2 text-text-secondary">
            Toca cada bloque para marcar tu disponibilidad. Doble clic o mantén presionado para anotar qué haces en esa hora.
          </p>
        </div>
        <ScheduleGrid
          blocks={blocks}
          editable
          selectedKey={noteEditKey}
          onChange={edit}
          onRequestNote={(day, hour) => setNoteEditKey(`${day}-${hour}`)}
        />
      </section>

      {noteEditKey && noteBlock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setNoteEditKey("")}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lift" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-primary">Nota del bloque</h3>
                <p className="mt-1 font-mono text-[11px] uppercase text-text-secondary">{noteLabel}</p>
              </div>
              <button type="button" onClick={() => setNoteEditKey("")} aria-label="Cerrar" className="text-text-secondary transition hover:text-on-surface">
                <X size={18} />
              </button>
            </div>
            <input
              autoFocus
              className="mt-4 w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ej. Cálculo II"
              value={noteBlock.note ?? ""}
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && setNoteEditKey("")}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setNote("");
                  setNoteEditKey("");
                }}
                className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-bold text-text-secondary transition hover:bg-surface-container-low"
              >
                Quitar
              </button>
              <button
                type="button"
                onClick={() => setNoteEditKey("")}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-transform active:scale-95"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
