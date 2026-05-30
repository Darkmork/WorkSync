import { describe, expect, it } from "vitest";
import { cycleScheduleState, scheduleStateOrder } from "./scheduleStates";

describe("cycleScheduleState", () => {
  it("advances one step through the cycle and wraps around", () => {
    expect(cycleScheduleState("free")).toBe("preferred");
    expect(cycleScheduleState("preferred")).toBe("occupied");
    expect(cycleScheduleState("occupied")).toBe("avoid");
    expect(cycleScheduleState("avoid")).toBe("free");
  });

  it("steps backwards when asked to walk length-1 positions (double-tap undo)", () => {
    const back = scheduleStateOrder.length - 1;
    expect(cycleScheduleState("preferred", back)).toBe("free");
    expect(cycleScheduleState("free", back)).toBe("avoid");
  });

  it("a forward step followed by an undo returns the original state", () => {
    const back = scheduleStateOrder.length - 1;
    for (const state of scheduleStateOrder) {
      expect(cycleScheduleState(cycleScheduleState(state), back)).toBe(state);
    }
  });
});
