import { useRef, useState } from "react";
import type { DayKey, ScheduleBlock, ScheduleState } from "../types/worksync";
import { days, timeSlots } from "../types/worksync";
import { cycleScheduleState, scheduleStateLabel, scheduleStateOrder } from "../domain/scheduleStates";

const stateClasses: Record<ScheduleState, string> = {
  free: "bg-status-free/75 hover:bg-status-free",
  preferred: "bg-status-preferred/75 hover:bg-status-preferred",
  occupied: "bg-status-occupied/75 hover:bg-status-occupied",
  avoid: "bg-status-avoid/80 hover:bg-status-avoid",
};

const weekdayToDayKey: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

interface ScheduleGridProps {
  blocks: ScheduleBlock[];
  editable?: boolean;
  // Highlighted cell (e.g. the block whose note is being edited).
  selectedKey?: string;
  onChange?: (blocks: ScheduleBlock[]) => void;
  // The user asked to annotate this cell (double-click or long-press).
  onRequestNote?: (day: DayKey, hour: string) => void;
}

export function ScheduleGrid({ blocks, editable = false, selectedKey, onChange, onRequestNote }: ScheduleGridProps) {
  // On phones the 7-column grid is unusable, so we show one day at a time and
  // let the user switch days with tabs. Default to today (weekends included).
  const [activeDay, setActiveDay] = useState<DayKey>(weekdayToDayKey[new Date().getDay()]);

  // Tap = cycle colour; double-tap (within 300ms) = undo that cycle and open
  // the note editor; long-press (touch) = open the note editor directly.
  const lastTap = useRef<{ key: string; time: number } | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const suppressNextTap = useRef(false);

  const blockFor = (day: string, hour: string) => blocks.find((block) => block.day === day && block.hour === hour);

  const applyState = (day: DayKey, hour: string, nextOf: (state: ScheduleState) => ScheduleState) => {
    if (!onChange) return;
    const existing = blockFor(day, hour);
    if (existing) {
      onChange(blocks.map((block) => (block === existing ? { ...block, state: nextOf(block.state) } : block)));
    } else {
      onChange([...blocks, { day, hour, state: nextOf("free") }]);
    }
  };

  const handleTap = (day: DayKey, hour: string) => {
    if (!editable) return;
    if (suppressNextTap.current) {
      suppressNextTap.current = false;
      return;
    }
    const key = `${day}-${hour}`;
    const now = Date.now();
    const last = lastTap.current;
    if (last && last.key === key && now - last.time < 300) {
      // Second tap of a double: undo the colour change and edit the note.
      lastTap.current = null;
      applyState(day, hour, (state) => cycleScheduleState(state, scheduleStateOrder.length - 1));
      onRequestNote?.(day, hour);
      return;
    }
    lastTap.current = { key, time: now };
    applyState(day, hour, (state) => cycleScheduleState(state));
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (day: DayKey, hour: string) => {
    if (!editable) return;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      suppressNextTap.current = true; // swallow the click that follows touchend
      onRequestNote?.(day, hour);
    }, 500);
  };

  const touchHandlers = (day: DayKey, hour: string) =>
    editable
      ? {
          onTouchStart: () => startLongPress(day, hour),
          onTouchEnd: clearLongPress,
          onTouchMove: clearLongPress,
          onTouchCancel: clearLongPress,
        }
      : {};

  return (
    <div>
      {/* Mobile: single-day view with day tabs and full-width tappable rows. */}
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

        {editable && (
          <p className="mt-2 px-1 text-[11px] text-text-secondary">Toca para cambiar el color · mantén presionado para una nota.</p>
        )}

        <div className="mt-2 space-y-2">
          {timeSlots.map((slot) => {
            const block = blockFor(activeDay, slot.start);
            const state = block?.state ?? "free";
            const key = `${activeDay}-${slot.start}`;
            const isLunch = slot.kind === "lunch";
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTap(activeDay, slot.start)}
                {...touchHandlers(activeDay, slot.start)}
                disabled={!editable}
                aria-label={`${slot.label} ${scheduleStateLabel[state]}${block?.note ? ` ${block.note}` : ""}`}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition active:scale-[0.99] ${
                  isLunch ? "border-dashed border-border-subtle bg-surface-container-low" : `border-transparent ${stateClasses[state]}`
                } ${selectedKey === key ? "ring-2 ring-inset ring-primary" : ""} ${editable ? "" : "cursor-default"}`}
              >
                <div className="min-w-0">
                  <span className="block font-mono text-xs font-bold text-on-surface">{slot.label}</span>
                  {block?.note && <span className="block truncate text-xs font-semibold text-on-surface/80">{block.note}</span>}
                </div>
                <span className="shrink-0 rounded-full bg-white/55 px-2.5 py-1 font-mono text-[11px] font-bold text-on-surface">
                  {isLunch ? "Almuerzo" : scheduleStateLabel[state]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: the full weekly grid. */}
      <div className="hidden overflow-hidden rounded-xl border border-border-subtle bg-white shadow-soft lg:block">
        <div className="grid grid-cols-[92px_repeat(7,minmax(82px,1fr))] overflow-x-auto border-b border-border-subtle bg-surface-container-low">
          <div className="h-12 border-r border-border-subtle" />
          {days.map((day) => (
            <div key={day.key} className="flex h-12 min-w-20 flex-col items-center justify-center border-r border-border-subtle font-mono text-xs last:border-r-0">
              <span className="text-on-surface-variant">{day.short}</span>
              <span className="font-bold text-primary">{day.label.slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <div className="custom-scrollbar max-h-[650px] overflow-auto">
          <div className="grid min-w-[780px] grid-cols-[92px_repeat(7,minmax(82px,1fr))] gap-px bg-border-subtle">
            {timeSlots.map((slot) => (
              <div className="contents" key={slot.start}>
                <div className="flex h-12 flex-col items-center justify-center bg-white px-1 text-center font-mono text-[10px] leading-tight text-outline">
                  <span>{slot.label}</span>
                  {slot.kind === "lunch" && <span className="mt-0.5 rounded-full bg-status-avoid/30 px-1.5 text-[9px] text-on-surface-variant">13:35 - 14:10</span>}
                </div>
                {days.map((day) => {
                  const block = blockFor(day.key, slot.start);
                  const state = block?.state ?? "free";
                  const key = `${day.key}-${slot.start}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTap(day.key, slot.start)}
                      {...touchHandlers(day.key, slot.start)}
                      className={`relative h-12 min-w-20 px-1 text-left transition ${stateClasses[state]} ${
                        selectedKey === key ? "ring-2 ring-inset ring-primary" : ""
                      }`}
                      aria-label={`${day.label} ${slot.label} ${scheduleStateLabel[state]}${block?.note ? ` ${block.note}` : ""}`}
                    >
                      {block?.note && <span className="block truncate text-[9px] font-semibold leading-tight text-on-surface/80">{block.note}</span>}
                    </button>
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
