import type { DayKey, UserSchedule } from "../types/worksync";
import { days } from "../types/worksync";

// Per-day rollup of how the user painted their week. `available` = focus time
// they could give (free + preferred); `committed` = time already taken
// (occupied + avoid).
export interface DayInsight {
  day: DayKey;
  available: number;
  committed: number;
  preferred: number;
}

// A pure, weekly read of a single user's schedule. This is what powers the
// personal dashboard: it turns painted blocks into a sense of "how my week
// looks" without needing a group.
export interface PersonalInsights {
  free: number;
  preferred: number;
  occupied: number;
  avoid: number;
  available: number; // free + preferred
  committed: number; // occupied + avoid
  marked: number; // total blocks with any state
  busiestDay: DayKey | null; // most committed blocks (null when nothing committed)
  freestDay: DayKey | null; // most available blocks (null when nothing available)
  perDay: DayInsight[];
}

export function computePersonalInsights(schedule: UserSchedule | null | undefined): PersonalInsights {
  const perDayMap = new Map<DayKey, DayInsight>(
    days.map((day) => [day.key, { day: day.key, available: 0, committed: 0, preferred: 0 }]),
  );

  let free = 0;
  let preferred = 0;
  let occupied = 0;
  let avoid = 0;

  for (const block of schedule?.blocks ?? []) {
    const entry = perDayMap.get(block.day);
    if (!entry) continue;
    switch (block.state) {
      case "free":
        free += 1;
        entry.available += 1;
        break;
      case "preferred":
        preferred += 1;
        entry.available += 1;
        entry.preferred += 1;
        break;
      case "occupied":
        occupied += 1;
        entry.committed += 1;
        break;
      case "avoid":
        avoid += 1;
        entry.committed += 1;
        break;
    }
  }

  const perDay = days.map((day) => perDayMap.get(day.key)!);
  const available = free + preferred;
  const committed = occupied + avoid;

  let busiestDay: DayKey | null = null;
  let freestDay: DayKey | null = null;
  let maxCommitted = 0;
  let maxAvailable = 0;
  for (const entry of perDay) {
    if (entry.committed > maxCommitted) {
      maxCommitted = entry.committed;
      busiestDay = entry.day;
    }
    if (entry.available > maxAvailable) {
      maxAvailable = entry.available;
      freestDay = entry.day;
    }
  }

  return {
    free,
    preferred,
    occupied,
    avoid,
    available,
    committed,
    marked: available + committed,
    busiestDay,
    freestDay,
    perDay,
  };
}
