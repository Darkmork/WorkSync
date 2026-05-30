import { describe, expect, it } from "vitest";
import { normalizeScheduleBlocks } from "./demoData";
import { canonicalSlots } from "../domain/grid";
import { days } from "../types/worksync";

describe("normalizeScheduleBlocks", () => {
  it("fills the canonical grid while preserving saved canonical cells", () => {
    const blocks = normalizeScheduleBlocks([
      { day: "mon", hour: "08:00", state: "occupied" },
      { day: "mon", hour: "09:00", state: "preferred" },
    ]);

    expect(blocks).toHaveLength(days.length * canonicalSlots.length);
    expect(blocks.find((block) => block.day === "mon" && block.hour === "08:00")?.state).toBe("occupied");
    expect(blocks.find((block) => block.day === "mon" && block.hour === "09:00")?.state).toBe("preferred");
    // An untouched cell inside the core span defaults to free.
    expect(blocks.find((block) => block.day === "mon" && block.hour === "09:30")?.state).toBe("free");
    // Non-canonical (old school) hours are not part of the canonical grid.
    expect(blocks.some((block) => block.hour === "08:40")).toBe(false);
  });

  it("migrates an older school-slot schedule onto the canonical axis", () => {
    const migrated = normalizeScheduleBlocks([{ day: "mon", hour: "10:20", state: "preferred" }]);
    // 10:20-11:05 contains the 10:30 and 11:00 canonical cells.
    expect(migrated.find((block) => block.day === "mon" && block.hour === "10:30")?.state).toBe("preferred");
    expect(migrated.find((block) => block.day === "mon" && block.hour === "11:00")?.state).toBe("preferred");
    expect(migrated.some((block) => block.hour === "10:20")).toBe(false);
  });
});
