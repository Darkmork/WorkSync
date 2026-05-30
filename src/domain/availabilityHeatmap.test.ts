import { describe, expect, it } from "vitest";
import { cellAt, computeAvailabilityHeatmap } from "./availabilityHeatmap";
import { days, timeSlots } from "../types/worksync";
import type { ScheduleState, UserSchedule, WorkGroup } from "../types/worksync";

function schedule(userId: string, overrides: Record<string, ScheduleState> = {}): UserSchedule {
  return {
    userId,
    blocks: Object.entries(overrides).map(([key, state]) => {
      const [day, hour] = key.split("@");
      return { day: day as UserSchedule["blocks"][number]["day"], hour, state };
    }),
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

describe("computeAvailabilityHeatmap", () => {
  it("emits one cell per day x slot in grid order", () => {
    const hm = computeAvailabilityHeatmap(group(["u1"]), []);
    expect(hm.cells).toHaveLength(days.length * timeSlots.length);
    expect(hm.cells[0].day).toBe("mon");
    expect(hm.cells[0].hour).toBe(timeSlots[0].start);
  });

  it("returns memberCount 0 and zero availability when no member has a schedule", () => {
    const hm = computeAvailabilityHeatmap(group(["u1"]), []);
    expect(hm.memberCount).toBe(0);
    expect(hm.cells.every((cell) => cell.available === 0 && cell.ratio === 0)).toBe(true);
  });

  it("counts available, preferred and occupied per cell", () => {
    const hm = computeAvailabilityHeatmap(group(["u1", "u2"]), [
      schedule("u1", { "mon@08:00": "preferred" }),
      schedule("u2", { "mon@08:00": "free", "tue@08:00": "occupied" }),
    ]);

    const monday = cellAt(hm, "mon", "08:00")!;
    expect(hm.memberCount).toBe(2);
    expect(monday.available).toBe(2);
    expect(monday.availableMemberIds).toEqual(["u1", "u2"]);
    expect(monday.preferred).toBe(1);
    expect(monday.ratio).toBe(1);

    const tuesday = cellAt(hm, "tue", "08:00")!;
    expect(tuesday.available).toBe(0);
    expect(tuesday.occupied).toBe(1);
    expect(tuesday.ratio).toBe(0);
  });

  it("ignores schedules of users that are not group members", () => {
    const hm = computeAvailabilityHeatmap(group(["u1"]), [
      schedule("u1", { "wed@09:20": "free" }),
      schedule("u9", { "wed@09:20": "free" }),
    ]);
    expect(hm.memberCount).toBe(1);
    expect(cellAt(hm, "wed", "09:20")!.available).toBe(1);
  });
});
