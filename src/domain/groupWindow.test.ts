import { describe, expect, it } from "vitest";
import { dayInWindow, slotInWindow, windowDays, windowSlots } from "./groupWindow";
import { timeSlots } from "../types/worksync";
import type { GroupWindow } from "../types/worksync";

const weekend: GroupWindow = { days: ["sat", "sun"], from: "08:00", to: "21:00" };
const afternoon: GroupWindow = { days: ["mon", "tue", "wed", "thu", "fri"], from: "16:00", to: "21:00" };

describe("dayInWindow", () => {
  it("accepts every day when there is no window", () => {
    expect(dayInWindow("sat")).toBe(true);
    expect(dayInWindow("mon", undefined)).toBe(true);
  });

  it("accepts only the listed days", () => {
    expect(dayInWindow("sat", weekend)).toBe(true);
    expect(dayInWindow("mon", weekend)).toBe(false);
  });

  it("treats an empty day list as 'any day' rather than 'no day'", () => {
    expect(dayInWindow("wed", { days: [], from: "08:00", to: "21:00" })).toBe(true);
  });
});

describe("slotInWindow", () => {
  const morningSlot = timeSlots.find((slot) => slot.start === "08:00")!;
  const eveningSlot = timeSlots.find((slot) => slot.start === "16:00")!;
  const lastSlot = timeSlots.find((slot) => slot.start === "20:00")!;

  it("accepts every slot when there is no window", () => {
    expect(slotInWindow(morningSlot)).toBe(true);
    expect(slotInWindow(eveningSlot, undefined)).toBe(true);
  });

  it("keeps slots inside the time bounds and drops the rest", () => {
    expect(slotInWindow(morningSlot, afternoon)).toBe(false);
    expect(slotInWindow(eveningSlot, afternoon)).toBe(true);
    expect(slotInWindow(lastSlot, afternoon)).toBe(true);
  });

  it("includes a slot whose end exactly matches the upper bound", () => {
    expect(lastSlot.end).toBe("21:00");
    expect(slotInWindow(lastSlot, afternoon)).toBe(true);
  });
});

describe("windowDays / windowSlots", () => {
  it("returns all days in week order when unrestricted", () => {
    expect(windowDays()).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  });

  it("returns only the window's days in week order", () => {
    expect(windowDays(weekend)).toEqual(["sat", "sun"]);
  });

  it("filters the slot list to those inside the window, preserving order", () => {
    const slots = windowSlots(timeSlots, afternoon);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((slot) => slot.start >= "16:00")).toBe(true);
    expect(slots[0].start).toBe("16:00");
  });
});
