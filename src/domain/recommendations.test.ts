import { describe, expect, it } from "vitest";
import { buildPersonalRecommendations, buildRecommendations } from "./recommendations";
import { days, timeSlots } from "../types/worksync";
import type { ScheduleState, UserSchedule, WorkGroup } from "../types/worksync";

function schedule(userId: string, overrides: Record<string, ScheduleState> = {}, fallback: ScheduleState = "free"): UserSchedule {
  return {
    userId,
    blocks: days.flatMap((day) =>
      timeSlots.map((slot) => ({
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

const windowSlots = (start: string, durationHours: number) => {
  const index = timeSlots.findIndex((slot) => slot.start === start);
  return timeSlots.slice(index, index + durationHours);
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
      expect(rec.score).toBeLessThanOrEqual(99);
    });
  });

  it("ranks a window everyone prefers above plain free time", () => {
    const preferred = { "mon-10:20": "preferred" as const, "mon-11:05": "preferred" as const };
    const recs = buildRecommendations(group(["u1", "u2"]), [schedule("u1", preferred), schedule("u2", preferred)]);
    const top = recs[0];

    expect(top.day).toBe("mon");
    // The fully-preferred 10:20-11:50 window is the unique best (score 100),
    // ahead of windows that only partially overlap the preferred blocks.
    expect(top.start).toBe("10:20");
    expect(top.score).toBe(100);
    expect(top.availableCount).toBe(top.memberCount);
    expect(top.memberCount).toBe(2);
    expect(top.badges).toContain("Todos disponibles");
    expect(top.justification).toContain("todo el grupo");
  });

  it("never proposes a window that overlaps the lunch block", () => {
    const aroundLunch = {
      "mon-12:50": "preferred" as const,
      "mon-13:35": "preferred" as const,
      "mon-14:10": "preferred" as const,
    };
    const recs = buildRecommendations(
      group(["u1", "u2"]),
      [schedule("u1", aroundLunch, "avoid"), schedule("u2", aroundLunch, "avoid")],
      2,
      "hybrid",
    );

    expect(recs.length).toBeGreaterThan(0);
    recs.forEach((rec) => {
      expect(rec.start).not.toBe("12:50");
      expect(rec.start).not.toBe("13:35");
      expect(windowSlots(rec.start, 2).some((slot) => slot.kind === "lunch")).toBe(false);
    });
  });

  it("prefers a window where everyone is free over one where a member is occupied", () => {
    const free = { "tue-10:20": "free" as const, "tue-11:05": "free" as const };
    const recs = buildRecommendations(
      group(["u1", "u2"]),
      [
        schedule("u1", { ...free, "mon-10:20": "preferred", "mon-11:05": "preferred" }, "avoid"),
        schedule("u2", { ...free, "mon-10:20": "occupied", "mon-11:05": "occupied" }, "avoid"),
      ],
      2,
      "hybrid",
    );
    const top = recs[0];

    expect(top.day).toBe("tue");
    expect(top.start).toBe("10:20");
    expect(top.availableCount).toBe(2);
  });

  it("names exactly the available members and reports a real availability percentage", () => {
    const prefer = { "tue-10:20": "preferred" as const, "tue-11:05": "preferred" as const };
    const recs = buildRecommendations(
      group(["u1", "u2", "u3"]),
      [
        schedule("u1", prefer, "avoid"),
        schedule("u2", prefer, "avoid"),
        schedule("u3", { "tue-10:20": "occupied", "tue-11:05": "occupied" }, "avoid"),
      ],
      2,
      "hybrid",
    );
    const top = recs[0];

    expect(top.day).toBe("tue");
    expect(top.start).toBe("10:20");
    // Two of three members are free here: name them and report 67%.
    expect(top.availableMemberIds).toEqual(["u1", "u2"]);
    expect(top.availabilityPct).toBe(67);
    expect(top.availableCount).toBe(2);
    expect(top.memberCount).toBe(3);
  });

  it("can recommend a weekend window when that is where availability lines up", () => {
    const preferred = { "sat-10:20": "preferred" as const, "sat-11:05": "preferred" as const };
    const recs = buildRecommendations(
      group(["u1", "u2"]),
      [schedule("u1", preferred, "avoid"), schedule("u2", preferred, "avoid")],
      2,
      "hybrid",
    );
    const top = recs[0];

    expect(top.day).toBe("sat");
    expect(top.start).toBe("10:20");
    expect(top.availableCount).toBe(2);
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
    const preferred = { "mon-10:20": "preferred" as const, "mon-11:05": "preferred" as const };
    const recs = buildPersonalRecommendations(schedule("u1", preferred));

    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].day).toBe("mon");
    expect(recs[0].start).toBe("10:20");
    expect(recs[0].memberCount).toBe(1);
    expect(recs[0].score).toBe(100);
  });
});
