import { useMemo, useState } from "react";
import type { DayKey, UserProfile, UserSchedule, WorkGroup } from "../types/worksync";
import { days } from "../types/worksync";
import { coreCanonicalSlots } from "../domain/grid";
import { cellAt, computeAvailabilityHeatmap } from "../domain/availabilityHeatmap";

// Brand green (#006b2c) with alpha scaled by how many members are available.
function cellStyle(ratio: number, available: number): React.CSSProperties {
  if (available === 0) return { backgroundColor: "rgba(15, 23, 42, 0.04)" };
  return { backgroundColor: `rgba(0, 107, 44, ${0.18 + ratio * 0.72})` };
}

const weekdayToDayKey: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function AvailabilityHeatmap({
  group,
  schedules,
  users = [],
}: {
  group: WorkGroup;
  schedules: UserSchedule[];
  users?: UserProfile[];
}) {
  const heatmap = useMemo(() => computeAvailabilityHeatmap(group, schedules), [group, schedules]);
  // Phones get one day at a time with tabs, mirroring the schedule calendar.
  const [activeDay, setActiveDay] = useState<DayKey>(weekdayToDayKey[new Date().getDay()]);

  // Resolve member ids to readable labels. First name keeps grid chips compact;
  // the full name still feeds tooltips and the aria description.
  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const fullName = (id: string) => userById.get(id)?.name ?? "Integrante";
  const shortName = (id: string) => fullName(id).split(" ")[0];

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
            Quiénes de los {heatmap.memberCount} integrantes están libres en cada bloque. Más verde = más gente disponible.
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
          {coreCanonicalSlots.map((slot) => {
            const cell = cellAt(heatmap, activeDay, slot.start);
            const ids = cell?.availableMemberIds ?? [];
            const preferred = cell?.preferred ?? 0;
            return (
              <div
                key={`${activeDay}-${slot.start}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-border-subtle px-4 py-3"
                style={cellStyle(cell?.ratio ?? 0, ids.length)}
              >
                <div className="min-w-0">
                  <span className="block font-mono text-xs font-bold text-on-surface">{slot.label}</span>
                  {ids.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {ids.map((id) => (
                        <span key={id} className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-on-surface">
                          {fullName(id)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="mt-1 block text-[11px] text-on-surface/70">Nadie disponible</span>
                  )}
                </div>
                {preferred > 0 && (
                  <span className="shrink-0 rounded-full bg-white/65 px-2.5 py-1 font-mono text-[11px] font-bold text-on-surface">
                    {preferred} ★
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: the full weekly grid; each cell names who is free. */}
      <div className="hidden overflow-hidden rounded-xl border border-border-subtle lg:block">
        <div className="grid grid-cols-[92px_repeat(7,minmax(70px,1fr))] border-b border-border-subtle bg-surface-container-low">
          <div className="h-10 border-r border-border-subtle" />
          {days.map((day) => (
            <div key={day.key} className="flex h-10 items-center justify-center border-r border-border-subtle font-mono text-xs font-bold text-primary last:border-r-0">
              {day.short}
            </div>
          ))}
        </div>
        <div className="custom-scrollbar max-h-[560px] overflow-auto">
          <div className="grid min-w-[760px] grid-cols-[92px_repeat(7,minmax(70px,1fr))] gap-px bg-border-subtle">
            {coreCanonicalSlots.map((slot) => (
              <div className="contents" key={slot.start}>
                <div className="flex h-12 items-center justify-center bg-white px-1 text-center font-mono text-[10px] leading-tight text-outline">
                  {slot.label}
                </div>
                {days.map((day) => {
                  const cell = cellAt(heatmap, day.key, slot.start);
                  const ids = cell?.availableMemberIds ?? [];
                  const preferred = cell?.preferred ?? 0;
                  return (
                    <div
                      key={`${day.key}-${slot.start}`}
                      className="flex h-12 flex-col items-center justify-center gap-0.5 overflow-hidden px-1 text-center text-[10px] font-semibold leading-tight text-on-surface/85"
                      style={cellStyle(cell?.ratio ?? 0, ids.length)}
                      title={
                        ids.length > 0
                          ? `${day.label} ${slot.label}: ${ids.map(fullName).join(", ")}${preferred ? ` (${preferred} prefieren)` : ""}`
                          : `${day.label} ${slot.label}: nadie disponible`
                      }
                    >
                      {ids.slice(0, 2).map((id) => (
                        <span key={id} className="block w-full truncate">{shortName(id)}</span>
                      ))}
                      {ids.length > 2 && <span className="block text-[9px] text-on-surface/70">+{ids.length - 2}</span>}
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
