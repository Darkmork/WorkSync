import { describe, expect, it } from "vitest";
import { eventsToBusyBlocks, toEventDateTime } from "./calendarMapping";
import { canonicalSlots } from "./grid";
import { days } from "../types/worksync";
import type { CalendarEvent, ScheduleBlock } from "../types/worksync";

const allFree = (): ScheduleBlock[] =>
  days.flatMap((day) => canonicalSlots.map((slot) => ({ day: day.key, hour: slot.start, state: "free" as const })));

describe("toEventDateTime", () => {
  it("combines a date and time into a valid ISO instant", () => {
    const iso = toEventDateTime("2026-06-01", "10:20");
    const back = new Date(iso);
    expect(back.getFullYear()).toBe(2026);
    expect(back.getHours()).toBe(10);
    expect(back.getMinutes()).toBe(20);
  });
});

describe("eventsToBusyBlocks", () => {
  it("marks overlapping blocks as occupied with the event title", () => {
    // A Monday 10:00-11:30 event covers the 10:00, 10:30 and 11:00 canonical cells.
    const monday = new Date(2026, 5, 1, 10, 0); // 2026-06-01 is a Monday
    const end = new Date(2026, 5, 1, 11, 30);
    const events: CalendarEvent[] = [{ id: "e1", summary: "Reunion equipo", start: monday.toISOString(), end: end.toISOString() }];

    const result = eventsToBusyBlocks(events, allFree());
    const at = (day: string, hour: string) => result.find((b) => b.day === day && b.hour === hour);

    expect(at("mon", "10:00")).toMatchObject({ state: "occupied", note: "Reunion equipo" });
    expect(at("mon", "10:30")).toMatchObject({ state: "occupied", note: "Reunion equipo" });
    expect(at("mon", "11:00")).toMatchObject({ state: "occupied", note: "Reunion equipo" });
    // 11:30 starts exactly at the event end, so it stays free.
    expect(at("mon", "11:30")?.state).toBe("free");
    expect(at("mon", "08:30")?.state).toBe("free");
    expect(at("tue", "10:00")?.state).toBe("free");
  });

  it("ignores all-day events and leaves blocks unchanged", () => {
    const events: CalendarEvent[] = [{ id: "e2", summary: "Feriado", start: "2026-06-01", end: "2026-06-02" }];
    expect(eventsToBusyBlocks(events, allFree())).toEqual(allFree());
  });
});
