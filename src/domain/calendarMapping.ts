import { timeSlots } from "../types/worksync";
import type { CalendarEvent, DayKey, ScheduleBlock } from "../types/worksync";

const weekdayToDayKey: Record<number, DayKey> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Build a local ISO datetime string from a YYYY-MM-DD date and an HH:MM time.
export function toEventDateTime(dateISO: string, hhmm: string): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hour, minute] = hhmm.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

// Mark blocks that overlap timed calendar events as "occupied" with the event
// title as note. All-day events are ignored. Non-destructive: returns new blocks.
export function eventsToBusyBlocks(events: CalendarEvent[], blocks: ScheduleBlock[]): ScheduleBlock[] {
  const busy = new Map<string, string>();

  for (const event of events) {
    if (!event.start || !event.start.includes("T") || !event.end) continue;
    const start = new Date(event.start);
    const end = new Date(event.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    const dayKey = weekdayToDayKey[start.getDay()];
    if (!dayKey) continue;

    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin = end.getHours() * 60 + end.getMinutes();

    for (const slot of timeSlots) {
      if (slot.kind === "lunch") continue;
      const slotStart = toMinutes(slot.start);
      const slotEnd = toMinutes(slot.end);
      if (slotStart < endMin && slotEnd > startMin) {
        busy.set(`${dayKey}-${slot.start}`, event.summary);
      }
    }
  }

  if (busy.size === 0) return blocks;

  return blocks.map((block) => {
    const note = busy.get(`${block.day}-${block.hour}`);
    return note ? { ...block, state: "occupied", note } : block;
  });
}
