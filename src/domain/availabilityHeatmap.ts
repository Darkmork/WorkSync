import type { DayKey, UserSchedule, WorkGroup } from "../types/worksync";
import { days, timeSlots } from "../types/worksync";

// One slot of the week, aggregated across a group's members. `available` =
// members who marked the slot free or preferred; `occupied` = members who
// marked it occupied or avoid; `ratio` = available / memberCount. This is the
// data behind the heatmap that makes a recommendation's score transparent.
export interface HeatmapCell {
  day: DayKey;
  hour: string;
  available: number;
  preferred: number;
  occupied: number;
  ratio: number;
  // userIds of the members free (free or preferred) in this slot, in member
  // order, so the UI can name exactly who is available instead of a bare count.
  availableMemberIds: string[];
}

export interface AvailabilityHeatmap {
  memberCount: number; // members of the group that actually have a schedule
  cells: HeatmapCell[]; // one per day x timeSlot, in grid order
}

export function computeAvailabilityHeatmap(group: WorkGroup, schedules: UserSchedule[]): AvailabilityHeatmap {
  const groupSchedules = schedules.filter((schedule) => group.memberIds.includes(schedule.userId));
  const memberCount = groupSchedules.length;
  const cells: HeatmapCell[] = [];

  for (const day of days) {
    for (const slot of timeSlots) {
      const availableMemberIds: string[] = [];
      let preferred = 0;
      let occupied = 0;
      for (const schedule of groupSchedules) {
        const state = schedule.blocks.find((block) => block.day === day.key && block.hour === slot.start)?.state;
        if (state === "free" || state === "preferred") availableMemberIds.push(schedule.userId);
        if (state === "preferred") preferred += 1;
        if (state === "occupied" || state === "avoid") occupied += 1;
      }
      const available = availableMemberIds.length;
      cells.push({
        day: day.key,
        hour: slot.start,
        available,
        preferred,
        occupied,
        ratio: memberCount > 0 ? available / memberCount : 0,
        availableMemberIds,
      });
    }
  }

  return { memberCount, cells };
}

export function cellAt(heatmap: AvailabilityHeatmap, day: DayKey, hour: string): HeatmapCell | undefined {
  return heatmap.cells.find((cell) => cell.day === day && cell.hour === hour);
}
