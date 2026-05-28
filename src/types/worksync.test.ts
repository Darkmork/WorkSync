import { describe, expect, it } from "vitest";
import { timeSlots } from "./worksync";

describe("timeSlots", () => {
  it("uses the requested school calendar blocks", () => {
    expect(timeSlots.map((slot) => `${slot.start}-${slot.end}`)).toEqual([
      "08:00-08:40",
      "08:40-09:20",
      "09:20-10:05",
      "10:20-11:05",
      "11:05-11:50",
      "12:05-12:50",
      "12:50-13:35",
      "13:35-14:10",
      "14:10-14:55",
      "14:55-15:40",
      "16:00-17:00",
      "17:00-18:00",
      "18:00-19:00",
      "19:00-20:00",
      "20:00-21:00",
    ]);
  });

  it("marks the 13:35 to 14:10 block as lunch", () => {
    expect(timeSlots.find((slot) => slot.start === "13:35")).toMatchObject({
      end: "14:10",
      label: "Almuerzo",
      kind: "lunch",
    });
  });
});
