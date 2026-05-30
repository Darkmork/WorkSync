import type { DayKey, Recommendation, ScheduleBlock, UserSchedule, WorkGroup, Modality } from "../types/worksync";
import { days } from "../types/worksync";
import { canonicalSlots, SLOTS_PER_HOUR } from "./grid";
import { dayInWindow, slotInWindow } from "./groupWindow";
import { modalityLabel } from "./labels";

const stateWeight: Record<ScheduleBlock["state"], number> = {
  preferred: 24,
  free: 18,
  avoid: -8,
  occupied: -24,
};

const dayNames = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const monthAbbr = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const dayKeyToWeekday: Record<DayKey, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function nextDate(day: DayKey, from = new Date()): Date {
  const diff = (dayKeyToWeekday[day] - from.getDay() + 7) % 7;
  const date = new Date(from);
  date.setDate(from.getDate() + diff);
  return date;
}

function dateLabelOf(date: Date): string {
  return `${dayNames[date.getDay()]} ${date.getDate()} ${monthAbbr[date.getMonth()]}`;
}

function isoDateOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const endForWindow = (start: string, durationSlots: number) => {
  const index = canonicalSlots.findIndex((slot) => slot.start === start);
  return canonicalSlots[index + durationSlots - 1]?.end ?? canonicalSlots[index]?.end ?? start;
};

const blockFor = (schedule: UserSchedule, day: DayKey, hour: string) =>
  schedule.blocks.find((block) => block.day === day && block.hour === hour);

export function buildRecommendations(
  group: WorkGroup,
  schedules: UserSchedule[],
  durationHours = 2,
  modality: Modality = "hybrid",
): Recommendation[] {
  const groupSchedules = schedules.filter((schedule) => group.memberIds.includes(schedule.userId));
  if (groupSchedules.length === 0) return [];

  // The engine works in canonical 30-min cells; `durationHours` is the
  // human-facing length, so convert it to a cell count (2h -> 4 cells).
  const durationSlots = Math.max(1, Math.round(durationHours * SLOTS_PER_HOUR));

  const candidates: Recommendation[] = [];

  // Every day of the week is fair game, weekends included: a study group may
  // only line up on a Saturday morning, so the engine must be able to surface
  // those windows instead of being silently capped at Mon-Fri. A group can
  // narrow this further with its own valid window (e.g. weekends only, or
  // weekday evenings); days and slots outside that window are skipped.
  for (const day of days) {
    if (!dayInWindow(day.key, group.window)) continue;
    for (let slotIndex = 0; slotIndex + durationSlots <= canonicalSlots.length; slotIndex += 1) {
      const windowSlots = canonicalSlots.slice(slotIndex, slotIndex + durationSlots);
      if (windowSlots.some((slot) => !slotInWindow(slot, group.window))) continue;

      const hour = windowSlots[0].start;
      const windowHours = windowSlots.map((slot) => slot.start);
      const memberScores = groupSchedules.map((schedule) =>
        windowHours.reduce((sum, windowHour) => {
          const block = blockFor(schedule, day.key, windowHour);
          return sum + (block ? stateWeight[block.state] : 0);
        }, 0),
      );
      // A member counts as available when their window score is positive (no
      // heavy occupied/avoid blocks dragging it under zero). Keep their ids so
      // the UI can name exactly who is free.
      const availableMemberIds = groupSchedules
        .filter((_, index) => memberScores[index] > 0)
        .map((schedule) => schedule.userId);
      const availableCount = availableMemberIds.length;
      const availabilityPct = Math.round((availableCount / groupSchedules.length) * 100);
      const preferredCount = groupSchedules.filter((schedule) =>
        windowHours.some((windowHour) => blockFor(schedule, day.key, windowHour)?.state === "preferred"),
      ).length;

      const rawScore = memberScores.reduce((sum, score) => sum + score, 0);
      const maxScore = groupSchedules.length * durationSlots * stateWeight.preferred;
      const score = Math.max(0, Math.min(100, Math.round((rawScore / maxScore) * 100)));

      const badges = [
        availableCount === groupSchedules.length ? "Todos disponibles" : `${availableCount}/${groupSchedules.length} disponibles`,
        preferredCount > 0 ? `${preferredCount} prefieren este bloque` : "Sin preferencias marcadas",
        durationHours >= 2 ? "Bloque largo" : "Bloque breve",
        modalityLabel(modality),
      ];

      const recDate = nextDate(day.key);
      candidates.push({
        id: `${group.id}-${day.key}-${hour}`,
        groupId: group.id,
        day: day.key,
        dateLabel: dateLabelOf(recDate),
        dateISO: isoDateOf(recDate),
        start: hour,
        end: endForWindow(hour, durationSlots),
        score,
        modality,
        availableCount,
        memberCount: groupSchedules.length,
        availableMemberIds,
        availabilityPct,
        badges,
        justification:
          availableCount === groupSchedules.length
            ? `Este bloque funciona para todo el grupo y suma ${preferredCount} preferencias positivas.`
            : `Es el mejor compromiso disponible: ${availableCount} de ${groupSchedules.length} integrantes pueden asistir.`,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 3);
}

// Personal recommender: reuse the group engine for a "group of one" so a solo
// user (with no group) still gets "your best blocks this week". The synthetic
// group has a single member — the schedule's own owner — so the scoring and
// ranking all behave identically to the group case.
export function buildPersonalRecommendations(
  schedule: UserSchedule | null | undefined,
  durationHours = 2,
  modality: Modality = "hybrid",
): Recommendation[] {
  if (!schedule || schedule.blocks.length === 0) return [];
  const personalGroup: WorkGroup = {
    id: "personal",
    name: "Tu agenda personal",
    description: "",
    type: "personal",
    color: "#0058be",
    ownerId: schedule.userId,
    memberIds: [schedule.userId],
    status: "active",
  };
  return buildRecommendations(personalGroup, [schedule], durationHours, modality);
}
