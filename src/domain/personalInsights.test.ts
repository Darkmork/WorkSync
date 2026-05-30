import { describe, expect, it } from "vitest";
import { computePersonalInsights } from "./personalInsights";
import type { ScheduleBlock, UserSchedule } from "../types/worksync";

const sched = (blocks: ScheduleBlock[]): UserSchedule => ({ userId: "u1", blocks });

describe("computePersonalInsights", () => {
  it("returns zeros for an empty schedule", () => {
    const out = computePersonalInsights(sched([]));
    expect(out.marked).toBe(0);
    expect(out.available).toBe(0);
    expect(out.committed).toBe(0);
    expect(out.busiestDay).toBeNull();
    expect(out.freestDay).toBeNull();
  });

  it("treats null/undefined schedule as empty", () => {
    expect(computePersonalInsights(undefined).marked).toBe(0);
    expect(computePersonalInsights(null).marked).toBe(0);
  });

  it("counts blocks by state and derives available/committed", () => {
    const out = computePersonalInsights(
      sched([
        { day: "mon", hour: "08:00", state: "free" },
        { day: "mon", hour: "08:40", state: "preferred" },
        { day: "mon", hour: "09:20", state: "occupied" },
        { day: "tue", hour: "08:00", state: "avoid" },
      ]),
    );
    expect(out.free).toBe(1);
    expect(out.preferred).toBe(1);
    expect(out.occupied).toBe(1);
    expect(out.avoid).toBe(1);
    expect(out.available).toBe(2); // free + preferred
    expect(out.committed).toBe(2); // occupied + avoid
    expect(out.marked).toBe(4);
  });

  it("identifies the busiest (most committed) and freest (most available) days", () => {
    const out = computePersonalInsights(
      sched([
        { day: "wed", hour: "08:00", state: "occupied" },
        { day: "wed", hour: "08:40", state: "occupied" },
        { day: "fri", hour: "08:00", state: "free" },
        { day: "fri", hour: "08:40", state: "preferred" },
        { day: "fri", hour: "09:20", state: "free" },
      ]),
    );
    expect(out.busiestDay).toBe("wed");
    expect(out.freestDay).toBe("fri");
  });

  it("exposes a per-day breakdown for all seven days in week order", () => {
    const out = computePersonalInsights(sched([]));
    expect(out.perDay).toHaveLength(7);
    expect(out.perDay.map((d) => d.day)).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  });
});
