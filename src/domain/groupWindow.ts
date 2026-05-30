import type { DayKey, GroupWindow, TimeSlot } from "../types/worksync";
import { days as allDays } from "../types/worksync";

// A group's "valid window" narrows the week the recommender is allowed to look
// at. These helpers are the single place that decides whether a given day or
// time slot is inside that window, so both the engine and the UI agree on the
// rule. An undefined window means "no restriction" — every day and slot counts,
// which is how every group behaved before windows existed.

export function dayInWindow(day: DayKey, window?: GroupWindow): boolean {
  // An empty day list is treated as "any day" rather than "no day", so a
  // half-configured window never silently kills all recommendations.
  if (!window || window.days.length === 0) return true;
  return window.days.includes(day);
}

export function slotInWindow(slot: TimeSlot, window?: GroupWindow): boolean {
  if (!window) return true;
  // "HH:MM" strings are zero-padded 24h, so lexicographic compare is chronological.
  return slot.start >= window.from && slot.end <= window.to;
}

// The valid weekdays of a window, in canonical week order (mon..sun).
export function windowDays(window?: GroupWindow): DayKey[] {
  return allDays.filter((day) => dayInWindow(day.key, window)).map((day) => day.key);
}

// The subset of slots that fall inside the window, preserving their order.
export function windowSlots(slots: TimeSlot[], window?: GroupWindow): TimeSlot[] {
  return slots.filter((slot) => slotInWindow(slot, window));
}
