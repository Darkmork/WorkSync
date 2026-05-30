import { describe, expect, it } from "vitest";
import { buildPersonalRecommendations, buildRecommendations } from "./recommendations";
import { canonicalSlots } from "./grid";
import { days } from "../types/worksync";
import type { ScheduleState, UserSchedule, WorkGroup } from "../types/worksync";

// Build a schedule on the canonical 30-min axis. Overrides are keyed
// "<day>-<HH:MM>" against the canonical cell starts.
function schedule(userId: string, overrides: Record<string, ScheduleState> = {}, fallback: ScheduleState = "free"): UserSchedule {
  return {
    userId,
    blocks: days.flatMap((day) =>
      canonicalSlots.map((slot) => ({
        day: day.key,
        hour: slot.start,
        state: overrides[`${day.key}-${slot.start}`] ?? fallback,
      })),
    ),
  };
}

function group(memberIds: string[]): WorkGroup {
  return {
    id: "gT",
    name: "Grupo de prueba",
    description: "",
    type: "study",
    color: "#0058be",
    ownerId: memberIds[0] ?? "owner",
    memberIds,
    status: "active",
  };
}

// A contiguous 2-hour (4 canonical cells) window of one state on a given day.
const windowOverrides = (day: string, start: string, state: ScheduleState): Record<string, ScheduleState> => {
  const index = canonicalSlots.findIndex((slot) => slot.start === start);
  const result: Record<string, ScheduleState> = {};
  for (const slot of canonicalSlots.slice(index, index + 4)) result[`${day}-${slot.start}`] = state;
  return result;
};

describe("buildRecommendations", () => {
  it("returns nothing when no group member has a schedule", () => {
    expect(buildRecommendations(group(["u1"]), [])).toEqual([]);
    expect(buildRecommendations(group(["u1"]), [schedule("u2")])).toEqual([]);
  });

  it("returns at most three candidates sorted by descending score", () => {
    const recs = buildRecommendations(group(["u1", "u2"]), [schedule("u1"), schedule("u2")]);

    expect(recs.length).toBeLessThanOrEqual(3);
    expect(recs.length).toBeGreaterThan(0);
    for (let i = 1; i < recs.length; i += 1) {
      expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
    }
    recs.forEach((rec) => {
      expect(rec.score).toBeGreaterThanOrEqual(0);
      expect(rec.score).toBeLessThanOrEqual(100);
    });
  });

  it("ranks a window everyone prefers above plain free time", () => {
    const preferred = windowOverrides("mon", "10:00", "preferred");
    const recs = buildRecommendations(group(["u1", "u2"]), [schedule("u1", preferred), schedule("u2", preferred)]);
    const top = recs[0];

    expect(top.day).toBe("mon");
    // The fully-preferred 10:00-12:00 window is the unique best (score 100),
    // ahead of windows that only partially overlap the preferred cells.
    expect(top.start).toBe("10:00");
    expect(top.end).toBe("12:00");
    expect(top.score).toBe(100);
    expect(top.availableCount).toBe(top.memberCount);
    expect(top.memberCount).toBe(2);
    expect(top.badges).toContain("Todos disponibles");
    expect(top.justification).toContain("todo el grupo");
  });

  it("prefers a window where everyone is free over one where a member is occupied", () => {
    const recs = buildRecommendations(
      group(["u1", "u2"]),
      [
        schedule("u1", { ...windowOverrides("tue", "10:00", "free"), ...windowOverrides("mon", "10:00", "preferred") }, "avoid"),
        schedule("u2", { ...windowOverrides("tue", "10:00", "free"), ...windowOverrides("mon", "10:00", "occupied") }, "avoid"),
      ],
      2,
      "hybrid",
    );
    const top = recs[0];

    expect(top.day).toBe("tue");
    expect(top.start).toBe("10:00");
    expect(top.availableCount).toBe(2);
  });

  it("names exactly the available members and reports a real availability percentage", () => {
    const prefer = windowOverrides("tue", "10:00", "preferred");
    const recs = buildRecommendations(
      group(["u1", "u2", "u3"]),
      [
        schedule("u1", prefer, "avoid"),
        schedule("u2", prefer, "avoid"),
        schedule("u3", windowOverrides("tue", "10:00", "occupied"), "avoid"),
      ],
      2,
      "hybrid",
    );
    const top = recs[0];

    expect(top.day).toBe("tue");
    expect(top.start).toBe("10:00");
    // Two of three members are free here: name them and report 67%.
    expect(top.availableMemberIds).toEqual(["u1", "u2"]);
    expect(top.availabilityPct).toBe(67);
    expect(top.availableCount).toBe(2);
    expect(top.memberCount).toBe(3);
  });

  it("can recommend a weekend window when that is where availability lines up", () => {
    const preferred = windowOverrides("sat", "10:00", "preferred");
    const recs = buildRecommendations(
      group(["u1", "u2"]),
      [schedule("u1", preferred, "avoid"), schedule("u2", preferred, "avoid")],
      2,
      "hybrid",
    );
    const top = recs[0];

    expect(top.day).toBe("sat");
    expect(top.start).toBe("10:00");
    expect(top.availableCount).toBe(2);
  });

  it("restricts candidates to the group's valid window (weekday evenings)", () => {
    const windowed: WorkGroup = {
      ...group(["u1", "u2"]),
      window: { days: ["mon", "tue", "wed", "thu", "fri"], from: "16:00", to: "21:00" },
    };
    // u1 prefers a morning block that would normally win, but it is outside the
    // evening window, so it must never be proposed.
    const recs = buildRecommendations(windowed, [
      schedule("u1", { "mon-08:00": "preferred", "mon-08:30": "preferred" }),
      schedule("u2"),
    ]);

    expect(recs.length).toBeGreaterThan(0);
    recs.forEach((rec) => {
      expect(rec.start >= "16:00").toBe(true);
      expect(["mon", "tue", "wed", "thu", "fri"]).toContain(rec.day);
    });
  });

  it("only proposes weekend windows when the group window is weekend-only", () => {
    const windowed: WorkGroup = {
      ...group(["u1", "u2"]),
      window: { days: ["sat", "sun"], from: "08:00", to: "21:00" },
    };
    // A strongly preferred Monday block must be ignored: Monday is not in the window.
    const recs = buildRecommendations(windowed, [
      schedule("u1", windowOverrides("mon", "10:00", "preferred")),
      schedule("u2", windowOverrides("mon", "10:00", "preferred")),
    ]);

    expect(recs.length).toBeGreaterThan(0);
    recs.forEach((rec) => {
      expect(["sat", "sun"]).toContain(rec.day);
    });
  });

  it("labels the requested modality on every candidate", () => {
    const recs = buildRecommendations(group(["u1", "u2"]), [schedule("u1"), schedule("u2")], 2, "remote");

    expect(recs.length).toBeGreaterThan(0);
    recs.forEach((rec) => {
      expect(rec.modality).toBe("remote");
      expect(rec.badges).toContain("Online");
    });
  });
});

describe("buildPersonalRecommendations", () => {
  it("returns nothing without a schedule or with empty blocks", () => {
    expect(buildPersonalRecommendations(undefined)).toEqual([]);
    expect(buildPersonalRecommendations(null)).toEqual([]);
    expect(buildPersonalRecommendations({ userId: "u1", blocks: [] })).toEqual([]);
  });

  it("surfaces the user's preferred window as the top personal block", () => {
    const preferred = windowOverrides("mon", "10:00", "preferred");
    const recs = buildPersonalRecommendations(schedule("u1", preferred));

    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].day).toBe("mon");
    expect(recs[0].start).toBe("10:00");
    expect(recs[0].memberCount).toBe(1);
    expect(recs[0].score).toBe(100);
  });
});
