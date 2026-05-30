import { useMemo } from "react";
import type { UserSchedule, WorkGroup } from "../types/worksync";
import { days, timeSlots } from "../types/worksync";
import { cellAt, computeAvailabilityHeatmap } from "../domain/availabilityHeatmap";

// Brand green (#006b2c) with alpha scaled by how many members are available.
function cellStyle(ratio: number, available: number): React.CSSProperties {
  if (available === 0) return { backgroundColor: "rgba(15, 23, 42, 0.04)" };
  return { backgroundColor: `rgba(0, 107, 44, ${0.18 + ratio * 0.72})` };
}

export function AvailabilityHeatmap({ group, schedules }: { group: WorkGroup; schedules: UserSchedule[] }) {
  const heatmap = useMemo(() => computeAvailabilityHeatmap(group, schedules), [group, schedules]);

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

      <div className="overflow-hidden rounded-xl border border-border-subtle">
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
