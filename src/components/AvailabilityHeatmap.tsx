import { useMemo, useState } from "react";
import type { DayKey, UserSchedule, WorkGroup } from "../types/worksync";
import { days, timeSlots } from "../types/worksync";
import { cellAt, computeAvailabilityHeatmap } from "../domain/availabilityHeatmap";

// Brand green (#006b2c) with alpha scaled by how many members are available.
function cellStyle(ratio: number, available: number): React.CSSProperties {
  if (available === 0) return { backgroundColor: "rgba(15, 23, 42, 0.04)" };
  return { backgroundColor: `rgba(0, 107, 44, ${0.18 + ratio * 0.72})` };
}

const weekdayToDayKey: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function AvailabilityHeatmap({ group, schedules }: { group: WorkGroup; schedules: UserSchedule[] }) {
  const heatmap = useMemo(() => computeAvailabilityHeatmap(group, schedules), [group, schedules]);
  // Phones get one day at a time with tabs, mirroring the schedule calendar.
  const [activeDay, setActiveDay] = useState<DayKey>(weekdayToDayKey[new Date().getDay()]);

  if (heatmap.memberCount === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-white p-6 text-text-secondary shadow-soft">
        Aún no hay horarios cargados en este grupo, así que no se puede dibujar el mapa de disponibilidad.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Disponibilidad del grupo</h2>
          <p className="text-sm text-text-secondary">
            Cuántos de {heatmap.memberCount} integrantes están libres en cada bloque. Más verde = más gente disponible.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-text-secondary">
          <span>0</span>
          <span className="h-3 w-24 rounded-full" style={{ background: "linear-gradient(to right, rgba(15,23,42,0.06), rgba(0,107,44,0.9))" }} />
          <span>{heatmap.memberCount}</span>
        </div>
      </div>

      {/* Mobile: single-day view with day tabs, like the schedule calendar. */}
      <div className="lg:hidden">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border-subtle bg-surface-container-low p-1">
          {days.map((day) => (
            <button
              key={day.key}
              type="button"
              onClick={() => setActiveDay(day.key)}
              className={`min-w-[44px] flex-1 rounded-lg px-2 py-2 font-mono text-xs font-bold transition ${
                activeDay === day.key ? "bg-primary text-white" : "text-on-surface-variant hover:bg-white"
              }`}
            >
              {day.short}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {timeSlots.map((slot) => {
            const cell = cellAt(heatmap, activeDay, slot.start);
            const available = cell?.available ?? 0;
            const preferred = cell?.preferred ?? 0;
            return (
              <div
                key={`${activeDay}-${slot.start}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle px-4 py-3"
                style={cellStyle(cell?.ratio ?? 0, available)}
              >
                <div className="min-w-0">
                  <span className="block font-mono text-xs font-bold text-on-surface">{slot.label}</span>
                  {preferred > 0 && <span className="block text-[11px] font-semibold text-on-surface/70">{preferred} prefieren</span>}
                </div>
                <span className="shrink-0 rounded-full bg-white/65 px-2.5 py-1 font-mono text-[11px] font-bold text-on-surface">
                  {available}/{heatmap.memberCount}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: the full weekly heatmap grid. */}
      <div className="hidden overflow-hidden rounded-xl border border-border-subtle lg:block">
        <div className="grid grid-cols-[92px_repeat(7,minmax(48px,1fr))] border-b border-border-subtle bg-surface-container-low">
          <div className="h-10 border-r border-border-subtle" />
          {days.map((day) => (
            <div key={day.key} className="flex h-10 items-center justify-center border-r border-border-subtle font-mono text-xs font-bold text-primary last:border-r-0">
              {day.short}
            </div>
          ))}
        </div>
        <div className="custom-scrollbar max-h-[560px] overflow-auto">
          <div className="grid min-w-[640px] grid-cols-[92px_repeat(7,minmax(48px,1fr))] gap-px bg-border-subtle">
            {timeSlots.map((slot) => (
              <div className="contents" key={slot.start}>
                <div className="flex h-11 items-center justify-center bg-white px-1 text-center font-mono text-[10px] leading-tight text-outline">
                  {slot.label}
                </div>
                {days.map((day) => {
                  const cell = cellAt(heatmap, day.key, slot.start);
                  const available = cell?.available ?? 0;
                  const preferred = cell?.preferred ?? 0;
                  return (
                    <div
                      key={`${day.key}-${slot.start}`}
                      className="flex h-11 items-center justify-center text-[11px] font-bold text-on-surface/80"
                      style={cellStyle(cell?.ratio ?? 0, available)}
                      title={`${day.label} ${slot.label}: ${available}/${heatmap.memberCount} disponibles${preferred ? `, ${preferred} prefieren` : ""}`}
                    >
                      {available > 0 ? available : ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
