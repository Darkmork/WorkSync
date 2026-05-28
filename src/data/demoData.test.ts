import { describe, expect, it } from "vitest";
import { normalizeScheduleBlocks } from "./demoData";

describe("normalizeScheduleBlocks", () => {
  it("adds new calendar slots missing from older saved schedules", () => {
    const blocks = normalizeScheduleBlocks([
      { day: "mon", hour: "08:00", state: "occupied" },
      { day: "mon", hour: "09:00", state: "preferred" },
    ]);

    expect(blocks.find((block) => block.day === "mon" && block.hour === "08:00")?.state).toBe("occupied");
    expect(blocks.find((block) => block.day === "mon" && block.hour === "08:40")?.state).toBe("free");
    expect(blocks.find((block) => block.day === "mon" && block.hour === "13:35")?.state).toBe("avoid");
    expect(blocks.some((block) => block.hour === "09:00")).toBe(false);
  });
});
