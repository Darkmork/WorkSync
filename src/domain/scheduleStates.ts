import type { ScheduleState } from "../types/worksync";

// The order a block walks through on each tap. Mirrors the legend top-to-bottom
// so a user can predict the next colour: libre -> preferido -> ocupado -> evitar.
export const scheduleStateOrder: ScheduleState[] = ["free", "preferred", "occupied", "avoid"];

export const scheduleStateLabel: Record<ScheduleState, string> = {
  free: "Libre",
  preferred: "Preferido",
  occupied: "Ocupado",
  avoid: "Evitar",
};

// Advance a state `steps` positions around the cycle. `steps` defaults to one
// (a single tap). Passing `scheduleStateOrder.length - 1` walks one step back,
// which is how a double-tap undoes the cycle it accidentally triggered.
export function cycleScheduleState(state: ScheduleState, steps = 1): ScheduleState {
  const index = scheduleStateOrder.indexOf(state);
  const from = index === -1 ? 0 : index;
  const length = scheduleStateOrder.length;
  return scheduleStateOrder[(from + ((steps % length) + length)) % length];
}
