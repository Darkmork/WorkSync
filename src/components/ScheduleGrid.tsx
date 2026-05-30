import { useMemo, useRef, useState } from "react";
import type { DayKey, ScheduleBlock, ScheduleState, TimeSlot } from "../types/worksync";
import { days } from "../types/worksync";
import { blocksByKey, buildViewSlots, defaultGridConfig, setViewCellState, viewCellState } from "../domain/grid";
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
  // The editable slots to render. Each maps to one or more canonical sub-cells;
  // defaults to a 1h view over the day.
  slots?: TimeSlot[];
  // Which weekdays to show. Defaults to all 7; a grid config can narrow it.
  visibleDays?: DayKey[];
  // Highlighted cell (e.g. the block whose note is being edited).
  selectedKey?: string;
  onChange?: (blocks: ScheduleBlock[]) => void;
  // The user asked to annotate this cell (double-click or long-press). The hour
  // is the view slot's start, which is always a real canonical cell.
  onRequestNote?: (day: DayKey, hour: string) => void;
}

export function ScheduleGrid({
  blocks,
  editable = false,
  slots = buildViewSlots(defaultGridConfig),
  visibleDays,
  selectedKey,
  onChange,
  onRequestNote,
}: ScheduleGridProps) {
  // Restrict the columns/tabs to the configured weekdays, keeping canonical order.
  const shownDays = useMemo(
    () => (visibleDays ? days.filter((day) => visibleDays.includes(day.key)) : days),
    [visibleDays],
  );
  // Desktop uses an explicit column count, so the template adapts to fewer days.
  const desktopCols = { gridTemplateColumns: `92px repeat(${shownDays.length}, minmax(82px, 1fr))` };
  // On phones the 7-column grid is unusable, so we show one day at a time and
  // let the user switch days with tabs. Default to today (weekends included).
  const [activeDay, setActiveDay] = useState<DayKey>(weekdayToDayKey[new Date().getDay()]);

  // Tap = cycle colour; double-tap (within 300ms) = undo that cycle and open
  // the note editor; long-press (touch) = open the note editor directly.
  const lastTap = useRef<{ key: string; time: number } | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const suppressNextTap = useRef(false);

  // Each edit replaces `blocks`, so recompute the lookup whenever it changes.
  const byKey = useMemo(() => blocksByKey(blocks), [blocks]);
  const noteFor = (day: DayKey, slot: TimeSlot) => byKey.get(`${day}-${slot.start}`)?.note;

  const applyState = (day: DayKey, slot: TimeSlot, nextOf: (state: ScheduleState) => ScheduleState) => {
    if (!onChange) return;
    const current = viewCellState(byKey, day, slot);
    onChange(setViewCellState(blocks, day, slot, nextOf(current)));
  };

  const handleTap = (day: DayKey, slot: TimeSlot) => {
    if (!editable) return;
    if (suppressNextTap.current) {
      suppressNextTap.current = false;
      return;
    }
    const key = `${day}-${slot.start}`;
    const now = Date.now();
    const last = lastTap.current;
    if (last && last.key === key && now - last.time < 300) {
      // Second tap of a double: undo the colour change and edit the note.
      lastTap.current = null;
      applyState(day, slot, (state) => cycleScheduleState(state, scheduleStateOrder.length - 1));
      onRequestNote?.(day, slot.start);
      return;
    }
    lastTap.current = { key, time: now };
    applyState(day, slot, (state) => cycleScheduleState(state));
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (day: DayKey, slot: TimeSlot) => {
    if (!editable) return;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      suppressNextTap.current = true; // swallow the click that follows touchend
      onRequestNote?.(day, slot.start);
    }, 500);
  };

  const touchHandlers = (day: DayKey, slot: TimeSlot) =>
    editable
      ? {
          onTouchStart: () => startLongPress(day, slot),
          onTouchEnd: clearLongPress,
          onTouchMove: clearLongPress,
          onTouchCancel: clearLongPress,
        }
      : {};

  // The single-day mobile view must land on a visible day; fall back to the first
  // shown day when the configured days exclude today.
  const mobileDay = shownDays.some((day) => day.key === activeDay) ? activeDay : shownDays[0]?.key ?? activeDay;

  return (
    <div>
      {/* Mobile: single-day view with day tabs and full-width tappable rows. */}
      <div className="lg:hidden">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border-subtle bg-surface-container-low p-1">
          {shownDays.map((day) => (
            <button
              key={day.key}
              type="button"
              onClick={() => setActiveDay(day.key)}
              className={`min-w-[44px] flex-1 rounded-lg px-2 py-2 font-mono text-xs font-bold transition ${
                mobileDay === day.key ? "bg-primary text-white" : "text-on-surface-variant hover:bg-white"
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
          {slots.map((slot) => {
            const state = viewCellState(byKey, mobileDay, slot);
            const note = noteFor(mobileDay, slot);
            const key = `${mobileDay}-${slot.start}`;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTap(mobileDay, slot)}
                {...touchHandlers(mobileDay, slot)}
                disabled={!editable}
                aria-label={`${slot.label} ${scheduleStateLabel[state]}${note ? ` ${note}` : ""}`}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition active:scale-[0.99] ${stateClasses[state]} ${
                  selectedKey === key ? "ring-2 ring-inset ring-primary" : ""
                } ${editable ? "" : "cursor-default"}`}
              >
                <div className="min-w-0">
                  <span className="block font-mono text-xs font-bold text-on-surface">{slot.label}</span>
                  {note && <span className="block truncate text-xs font-semibold text-on-surface/80">{note}</span>}
                </div>
                <span className="shrink-0 rounded-full bg-white/55 px-2.5 py-1 font-mono text-[11px] font-bold text-on-surface">
                  {scheduleStateLabel[state]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: the full weekly grid. */}
      <div className="hidden overflow-hidden rounded-xl border border-border-subtle bg-white shadow-soft lg:block">
        <div className="grid overflow-x-auto border-b border-border-subtle bg-surface-container-low" style={desktopCols}>
          <div className="h-12 border-r border-border-subtle" />
          {shownDays.map((day) => (
            <div key={day.key} className="flex h-12 min-w-20 flex-col items-center justify-center border-r border-border-subtle font-mono text-xs last:border-r-0">
              <span className="text-on-surface-variant">{day.short}</span>
              <span className="font-bold text-primary">{day.label.slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <div className="custom-scrollbar max-h-[650px] overflow-auto">
          <div className="grid min-w-[780px] gap-px bg-border-subtle" style={desktopCols}>
            {slots.map((slot) => (
              <div className="contents" key={slot.start}>
                <div className="flex h-12 flex-col items-center justify-center bg-white px-1 text-center font-mono text-[10px] leading-tight text-outline">
                  <span>{slot.label}</span>
                </div>
                {shownDays.map((day) => {
                  const state = viewCellState(byKey, day.key, slot);
                  const note = noteFor(day.key, slot);
                  const key = `${day.key}-${slot.start}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTap(day.key, slot)}
                      {...touchHandlers(day.key, slot)}
                      className={`relative h-12 min-w-20 px-1 text-left transition ${stateClasses[state]} ${
                        selectedKey === key ? "ring-2 ring-inset ring-primary" : ""
                      }`}
                      aria-label={`${day.label} ${slot.label} ${scheduleStateLabel[state]}${note ? ` ${note}` : ""}`}
                    >
                      {note && <span className="block truncate text-[9px] font-semibold leading-tight text-on-surface/80">{note}</span>}
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
