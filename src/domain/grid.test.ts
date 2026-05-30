import { describe, expect, it } from "vitest";
import {
  blocksByKey,
  buildViewSlots,
  canonicalSlots,
  canonicalStartsForView,
  coreCanonicalSlots,
  defaultGridConfig,
  defaultStateAt,
  hhmmToMinutes,
  isLegacyBlocks,
  migrateLegacyBlocks,
  migrateScheduleBlocks,
  minutesToHHMM,
  normalizeCanonicalBlocks,
  normalizeGridConfig,
  setViewCellState,
  viewCellState,
} from "./grid";
import type { GridConfig } from "./grid";
import { days, timeSlots } from "../types/worksync";
import type { ScheduleBlock } from "../types/worksync";

describe("time helpers", () => {
  it("round-trips minutes and HH:MM", () => {
    expect(hhmmToMinutes("08:00")).toBe(480);
    expect(hhmmToMinutes("13:30")).toBe(810);
    expect(minutesToHHMM(480)).toBe("08:00");
    expect(minutesToHHMM(810)).toBe("13:30");
    expect(minutesToHHMM(hhmmToMinutes("22:30"))).toBe("22:30");
  });
});

describe("canonical axis", () => {
  it("is a uniform 30-min grid from 06:00 to 23:00", () => {
    expect(canonicalSlots[0].start).toBe("06:00");
    expect(canonicalSlots[canonicalSlots.length - 1].end).toBe("23:00");
    expect(canonicalSlots).toHaveLength((23 - 6) * 2);
    canonicalSlots.forEach((slot) => {
      expect(hhmmToMinutes(slot.end) - hhmmToMinutes(slot.start)).toBe(30);
      expect(slot.kind).toBe("hour");
    });
  });

  it("defaults cells inside the core span to free and the rest to avoid", () => {
    expect(defaultStateAt(hhmmToMinutes("06:30"))).toBe("avoid");
    expect(defaultStateAt(hhmmToMinutes("08:00"))).toBe("free");
    expect(defaultStateAt(hhmmToMinutes("20:30"))).toBe("free");
    expect(defaultStateAt(hhmmToMinutes("21:00"))).toBe("avoid");
    expect(defaultStateAt(hhmmToMinutes("22:30"))).toBe("avoid");
  });
});

describe("buildViewSlots", () => {
  it("builds 1h slots across the default 08:00-21:00 day", () => {
    const slots = buildViewSlots(defaultGridConfig);
    expect(slots).toHaveLength(13);
    expect(slots[0].start).toBe("08:00");
    expect(slots[0].end).toBe("09:00");
    expect(slots[slots.length - 1].end).toBe("21:00");
  });

  it("builds 30-min slots when granularity is 30", () => {
    const config: GridConfig = { granularityMinutes: 30, startHour: 16, endHour: 19, days: ["mon"] };
    const slots = buildViewSlots(config);
    expect(slots).toHaveLength(6);
    expect(slots[0].start).toBe("16:00");
    expect(slots[1].start).toBe("16:30");
    expect(slots[slots.length - 1].end).toBe("19:00");
  });

  it("clamps an inverted or out-of-range config to something usable", () => {
    const slots = buildViewSlots({ granularityMinutes: 60, startHour: 22, endHour: 6, days: [] });
    expect(slots.length).toBeGreaterThan(0);
    expect(normalizeGridConfig({ granularityMinutes: 60, startHour: 22, endHour: 6, days: [] }).days.length).toBeGreaterThan(0);
  });
});

describe("canonicalStartsForView", () => {
  it("splits a 1h view slot into two 30-min canonical starts", () => {
    const [slot] = buildViewSlots(defaultGridConfig);
    expect(canonicalStartsForView(slot)).toEqual(["08:00", "08:30"]);
  });

  it("maps a 30-min view slot to a single canonical start", () => {
    const [slot] = buildViewSlots({ granularityMinutes: 30, startHour: 16, endHour: 17, days: ["mon"] });
    expect(canonicalStartsForView(slot)).toEqual(["16:00"]);
  });
});

describe("viewCellState", () => {
  const [hourSlot] = buildViewSlots(defaultGridConfig); // 08:00-09:00 -> 08:00 & 08:30

  const withSubStates = (a: ScheduleBlock["state"], b: ScheduleBlock["state"]): Map<string, ScheduleBlock> =>
    blocksByKey([
      { day: "mon", hour: "08:00", state: a },
      { day: "mon", hour: "08:30", state: b },
    ]);

  it("shows occupied when any sub-cell is occupied", () => {
    expect(viewCellState(withSubStates("free", "occupied"), "mon", hourSlot)).toBe("occupied");
  });

  it("prefers a positive preferred over a plain avoid", () => {
    expect(viewCellState(withSubStates("preferred", "avoid"), "mon", hourSlot)).toBe("preferred");
  });

  it("falls back to each sub-cell's default when unset", () => {
    // No blocks at all -> both sub-cells default to free inside the core span.
    expect(viewCellState(new Map(), "mon", hourSlot)).toBe("free");
  });
});

describe("setViewCellState / coreCanonicalSlots", () => {
  const [hourSlot] = buildViewSlots(defaultGridConfig); // 08:00-09:00 -> 08:00 & 08:30

  it("writes the state to every canonical sub-cell of a 1h view slot", () => {
    const next = setViewCellState([], "mon", hourSlot, "preferred");
    const sub = next.filter((block) => block.day === "mon" && (block.hour === "08:00" || block.hour === "08:30"));
    expect(sub).toHaveLength(2);
    expect(sub.every((block) => block.state === "preferred")).toBe(true);
  });

  it("preserves a sub-cell's note while changing its state", () => {
    const next = setViewCellState(
      [{ day: "mon", hour: "08:00", state: "free", note: "Calculo" }],
      "mon",
      hourSlot,
      "occupied",
    );
    const kept = next.find((block) => block.day === "mon" && block.hour === "08:00");
    expect(kept?.state).toBe("occupied");
    expect(kept?.note).toBe("Calculo");
  });

  it("limits coreCanonicalSlots to the 08:00-21:00 span", () => {
    expect(coreCanonicalSlots[0].start).toBe("08:00");
    expect(coreCanonicalSlots[coreCanonicalSlots.length - 1].end).toBe("21:00");
    expect(coreCanonicalSlots).toHaveLength((21 - 8) * 2);
  });
});

describe("normalizeCanonicalBlocks", () => {
  it("fills every day and canonical cell with sensible defaults", () => {
    const filled = normalizeCanonicalBlocks([]);
    expect(filled).toHaveLength(days.length * canonicalSlots.length);
    const monMorning = filled.find((block) => block.day === "mon" && block.hour === "09:00");
    const monEarly = filled.find((block) => block.day === "mon" && block.hour === "06:30");
    expect(monMorning?.state).toBe("free");
    expect(monEarly?.state).toBe("avoid");
  });

  it("preserves blocks already on the canonical axis", () => {
    const filled = normalizeCanonicalBlocks([{ day: "tue", hour: "10:00", state: "preferred", note: "ok" }]);
    const kept = filled.find((block) => block.day === "tue" && block.hour === "10:00");
    expect(kept?.state).toBe("preferred");
    expect(kept?.note).toBe("ok");
  });
});

describe("isLegacyBlocks", () => {
  it("flags school-slot hours as legacy", () => {
    expect(isLegacyBlocks([{ day: "mon", hour: "08:40", state: "free" }])).toBe(true);
    expect(isLegacyBlocks([{ day: "mon", hour: "10:20", state: "free" }])).toBe(true);
  });

  it("treats canonical and empty schedules as non-legacy", () => {
    expect(isLegacyBlocks([{ day: "mon", hour: "08:00", state: "free" }])).toBe(false);
    expect(isLegacyBlocks([])).toBe(false);
  });
});

describe("migrateLegacyBlocks", () => {
  // Build a full school-axis schedule, then override a couple of slots.
  const legacy: ScheduleBlock[] = days.flatMap((day) =>
    timeSlots.map((slot) => ({
      day: day.key,
      hour: slot.start,
      state:
        day.key === "mon" && slot.start === "10:20"
          ? ("preferred" as const)
          : day.key === "mon" && slot.start === "13:35"
            ? ("occupied" as const)
            : ("free" as const),
    })),
  );

  it("lands all blocks on the canonical axis", () => {
    const migrated = migrateLegacyBlocks(legacy);
    expect(migrated).toHaveLength(days.length * canonicalSlots.length);
    expect(isLegacyBlocks(migrated)).toBe(false);
  });

  it("carries a preferred school block onto the canonical cells it contains", () => {
    const migrated = migrateLegacyBlocks(legacy);
    // 10:20-11:05 contains canonical starts 10:30 and 11:00.
    const at1030 = migrated.find((block) => block.day === "mon" && block.hour === "10:30");
    const at1100 = migrated.find((block) => block.day === "mon" && block.hour === "11:00");
    expect(at1030?.state).toBe("preferred");
    expect(at1100?.state).toBe("preferred");
  });

  it("carries the lunch slot's state onto the cell containing it", () => {
    const migrated = migrateLegacyBlocks(legacy);
    // 13:35-14:10 (lunch) contains canonical start 14:00.
    const at1400 = migrated.find((block) => block.day === "mon" && block.hour === "14:00");
    expect(at1400?.state).toBe("occupied");
  });

  it("uses default state for cells outside any school slot", () => {
    const migrated = migrateLegacyBlocks(legacy);
    const at0630 = migrated.find((block) => block.day === "mon" && block.hour === "06:30");
    const at2200 = migrated.find((block) => block.day === "mon" && block.hour === "22:00");
    expect(at0630?.state).toBe("avoid");
    expect(at2200?.state).toBe("avoid");
  });
});

describe("migrateScheduleBlocks", () => {
  it("routes legacy schedules through migration and canonical ones through normalization", () => {
    const legacyOut = migrateScheduleBlocks([{ day: "mon", hour: "10:20", state: "preferred" }]);
    expect(isLegacyBlocks(legacyOut)).toBe(false);
    expect(legacyOut).toHaveLength(days.length * canonicalSlots.length);

    const canonicalOut = migrateScheduleBlocks([{ day: "mon", hour: "10:00", state: "preferred" }]);
    expect(canonicalOut.find((block) => block.day === "mon" && block.hour === "10:00")?.state).toBe("preferred");
  });
});
