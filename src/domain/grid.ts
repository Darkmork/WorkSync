import type { DayKey, GridConfig, ScheduleBlock, ScheduleState, TimeSlot } from "../types/worksync";
import { days as allDays, timeSlots } from "../types/worksync";

// GridConfig lives in the shared types module (UserSchedule carries one); re-export
// it here so callers that think in grid terms can import it alongside the helpers.
export type { GridConfig } from "../types/worksync";

// ---------------------------------------------------------------------------
// Canonical availability axis
// ---------------------------------------------------------------------------
// Every user shares ONE storage axis so the group engines (recommendations,
// heatmap) can aggregate availability by comparing identical `hour` strings.
// That axis is a uniform 30-minute grid from 06:00 to 23:00. A user may *view*
// and *edit* their week at a coarser granularity (e.g. 1h blocks from 08:00 to
// 21:00) through a `GridConfig`, but what gets stored is always canonical
// 30-min cells. A 1h edit simply writes both 30-min sub-cells. This keeps the
// per-user grid a pure VIEW concern and leaves cross-user alignment intact.

export const CANONICAL_MINUTES = 30;

// Storage axis bounds. Wide enough to hold early/late edits; the "core" range
// below only decides the default state of an untouched cell.
const CANON_START_MIN = 6 * 60; // 06:00
const CANON_END_MIN = 23 * 60; // 23:00

// Inside the core span an untouched cell defaults to "free"; outside it defaults
// to "avoid" (nobody assumes you want a 06:30 study block unless you say so).
const CORE_START_MIN = 8 * 60; // 08:00
const CORE_END_MIN = 21 * 60; // 21:00

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Default state of an untouched cell, by its start minute-of-day.
export function defaultStateAt(startMin: number): ScheduleState {
  return startMin >= CORE_START_MIN && startMin < CORE_END_MIN ? "free" : "avoid";
}

const makeSlot = (startMin: number, lengthMin: number): TimeSlot => {
  const start = minutesToHHMM(startMin);
  const end = minutesToHHMM(startMin + lengthMin);
  return { start, end, label: `${start} - ${end}`, kind: "hour" };
};

// The full canonical axis: uniform 30-min cells covering the storage range.
export const canonicalSlots: TimeSlot[] = (() => {
  const slots: TimeSlot[] = [];
  for (let min = CANON_START_MIN; min + CANONICAL_MINUTES <= CANON_END_MIN; min += CANONICAL_MINUTES) {
    slots.push(makeSlot(min, CANONICAL_MINUTES));
  }
  return slots;
})();

export const canonicalStarts: string[] = canonicalSlots.map((slot) => slot.start);
export const canonicalStartSet: ReadonlySet<string> = new Set(canonicalStarts);

// How many canonical cells make up one hour. The recommendation engine works in
// canonical cells, so a "2 hour" window is `2 * SLOTS_PER_HOUR` cells.
export const SLOTS_PER_HOUR = 60 / CANONICAL_MINUTES;

// The canonical cells inside the core span (08:00-21:00). Used where showing the
// full 06:00-23:00 axis would be mostly empty rows (the group heatmap).
export const coreCanonicalSlots: TimeSlot[] = canonicalSlots.filter((slot) => {
  const startMin = hhmmToMinutes(slot.start);
  return startMin >= CORE_START_MIN && startMin < CORE_END_MIN;
});

// ---------------------------------------------------------------------------
// Per-user grid configuration (a VIEW over the canonical axis)
// ---------------------------------------------------------------------------

export const defaultGridConfig: GridConfig = {
  granularityMinutes: 60,
  startHour: 8,
  endHour: 21,
  days: allDays.map((day) => day.key),
};

// A few ready-made shapes the UI can offer as presets.
export const gridPresets: Record<string, GridConfig> = {
  colegio: { granularityMinutes: 60, startHour: 8, endHour: 21, days: allDays.map((day) => day.key) },
  jornada: { granularityMinutes: 60, startHour: 9, endHour: 18, days: ["mon", "tue", "wed", "thu", "fri"] },
  tarde: { granularityMinutes: 30, startHour: 16, endHour: 22, days: allDays.map((day) => day.key) },
};

// Clamp a config so it always produces at least one valid slot inside the
// canonical range and a sane day list.
export function normalizeGridConfig(config: GridConfig): GridConfig {
  const granularityMinutes: 30 | 60 = config.granularityMinutes === 30 ? 30 : 60;
  const startHour = Math.min(Math.max(config.startHour, CANON_START_MIN / 60), CANON_END_MIN / 60 - 1);
  const endHour = Math.min(Math.max(config.endHour, startHour + 1), CANON_END_MIN / 60);
  const days = config.days.length > 0 ? config.days : defaultGridConfig.days;
  return { granularityMinutes, startHour, endHour, days };
}

// The editable slots a given config exposes, in time order.
export function buildViewSlots(config: GridConfig): TimeSlot[] {
  const { granularityMinutes, startHour, endHour } = normalizeGridConfig(config);
  const slots: TimeSlot[] = [];
  const startMin = startHour * 60;
  const endMin = endHour * 60;
  for (let min = startMin; min + granularityMinutes <= endMin; min += granularityMinutes) {
    slots.push(makeSlot(min, granularityMinutes));
  }
  return slots;
}

// The canonical 30-min starts a view slot is composed of.
export function canonicalStartsForView(slot: TimeSlot): string[] {
  const startMin = hhmmToMinutes(slot.start);
  const endMin = hhmmToMinutes(slot.end);
  const starts: string[] = [];
  for (let min = startMin; min < endMin; min += CANONICAL_MINUTES) {
    starts.push(minutesToHHMM(min));
  }
  return starts;
}

// ---------------------------------------------------------------------------
// Block lookups + view-cell collapsing
// ---------------------------------------------------------------------------

export const blockKey = (day: DayKey, hour: string) => `${day}-${hour}`;

export function blocksByKey(blocks: ScheduleBlock[]): Map<string, ScheduleBlock> {
  const map = new Map<string, ScheduleBlock>();
  for (const block of blocks) map.set(blockKey(block.day, block.hour), block);
  return map;
}

// When a view cell spans several canonical sub-cells that disagree, show the
// most decision-relevant state. "occupied" is the most restrictive (you are
// busy part of the hour), then a positive "preferred" signal, then "avoid",
// then plain "free".
const displayPrecedence: ScheduleState[] = ["occupied", "preferred", "avoid", "free"];

export function viewCellState(
  byKey: Map<string, ScheduleBlock>,
  day: DayKey,
  slot: TimeSlot,
): ScheduleState {
  const subStates = canonicalStartsForView(slot).map((hour) => {
    const block = byKey.get(blockKey(day, hour));
    return block ? block.state : defaultStateAt(hhmmToMinutes(hour));
  });
  for (const state of displayPrecedence) {
    if (subStates.includes(state)) return state;
  }
  return "free";
}

// Write `state` to every canonical sub-cell a view cell covers, preserving each
// sub-cell's note. Missing sub-cells are created so a coarse edit always lands
// on the canonical axis even if the stored schedule was sparse.
export function setViewCellState(
  blocks: ScheduleBlock[],
  day: DayKey,
  slot: TimeSlot,
  state: ScheduleState,
): ScheduleBlock[] {
  const starts = new Set(canonicalStartsForView(slot));
  const touched = new Set<string>();
  const next = blocks.map((block) => {
    if (block.day === day && starts.has(block.hour)) {
      touched.add(block.hour);
      return { ...block, state };
    }
    return block;
  });
  for (const hour of starts) {
    if (!touched.has(hour)) next.push({ day, hour, state });
  }
  return next;
}

// ---------------------------------------------------------------------------
// Normalization + legacy migration
// ---------------------------------------------------------------------------

// Fill every day × canonical cell, defaulting untouched cells. Existing blocks
// already on the canonical axis are preserved (note included).
export function normalizeCanonicalBlocks(blocks: ScheduleBlock[]): ScheduleBlock[] {
  const byKey = blocksByKey(blocks);
  return allDays.flatMap((day) =>
    canonicalSlots.map((slot) => {
      const existing = byKey.get(blockKey(day.key, slot.start));
      if (existing) return { ...existing, day: day.key, hour: slot.start };
      return { day: day.key, hour: slot.start, state: defaultStateAt(hhmmToMinutes(slot.start)) };
    }),
  );
}

// A schedule is "legacy" (still on the old school-slot axis) if it carries any
// block whose hour is not a canonical 30-min start. Empty schedules are treated
// as already-canonical and simply get default-filled.
export function isLegacyBlocks(blocks: ScheduleBlock[]): boolean {
  return blocks.some((block) => !canonicalStartSet.has(block.hour));
}

// Find the school slot whose [start, end) interval contains a minute-of-day.
const schoolSlotContaining = (timeMin: number): TimeSlot | undefined =>
  timeSlots.find((slot) => hhmmToMinutes(slot.start) <= timeMin && timeMin < hhmmToMinutes(slot.end));

// Map an old school-slot schedule onto the canonical axis. Each canonical cell
// inherits the state of the school slot that contains its start minute; cells
// that fall in a gap (recess) or outside school hours take the default state.
export function migrateLegacyBlocks(blocks: ScheduleBlock[]): ScheduleBlock[] {
  const byKey = blocksByKey(blocks);
  return allDays.flatMap((day) =>
    canonicalSlots.map((slot) => {
      const startMin = hhmmToMinutes(slot.start);
      const school = schoolSlotContaining(startMin);
      const source = school ? byKey.get(blockKey(day.key, school.start)) : undefined;
      const state = source ? source.state : defaultStateAt(startMin);
      const note = source?.note;
      const cell: ScheduleBlock = { day: day.key, hour: slot.start, state };
      if (note) cell.note = note;
      return cell;
    }),
  );
}

// Single entry point: normalize a stored schedule to canonical cells, migrating
// from the old school axis when needed. Safe to call on any schedule shape.
export function migrateScheduleBlocks(blocks: ScheduleBlock[] | undefined): ScheduleBlock[] {
  if (!blocks || blocks.length === 0) return normalizeCanonicalBlocks([]);
  return isLegacyBlocks(blocks) ? migrateLegacyBlocks(blocks) : normalizeCanonicalBlocks(blocks);
}
