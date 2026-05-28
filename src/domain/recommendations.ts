import type { DayKey, Recommendation, ScheduleBlock, UserSchedule, WorkGroup, Modality } from "../types/worksync";
import { days, timeSlots } from "../types/worksync";

const stateWeight: Record<ScheduleBlock["state"], number> = {
  preferred: 24,
  free: 18,
  avoid: -8,
  occupied: -24,
};

const dayNames = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const monthAbbr = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const dayKeyToWeekday: Record<DayKey, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function nextDateLabel(day: DayKey, from = new Date()): string {
  const diff = (dayKeyToWeekday[day] - from.getDay() + 7) % 7;
  const date = new Date(from);
  date.setDate(from.getDate() + diff);
  return `${dayNames[date.getDay()]} ${date.getDate()} ${monthAbbr[date.getMonth()]}`;
}

const endForWindow = (start: string, durationBlocks: number) => {
  const index = timeSlots.findIndex((slot) => slot.start === start);
  return timeSlots[index + durationBlocks - 1]?.end ?? timeSlots[index]?.end ?? start;
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

  const candidates: Recommendation[] = [];

  for (const day of days.slice(0, 5)) {
    for (let slotIndex = 0; slotIndex + durationHours <= timeSlots.length; slotIndex += 1) {
      const windowSlots = timeSlots.slice(slotIndex, slotIndex + durationHours);
      if (windowSlots.some((slot) => slot.kind === "lunch")) continue;

      const hour = windowSlots[0].start;
      const windowHours = windowSlots.map((slot) => slot.start);
      const memberScores = groupSchedules.map((schedule) =>
        windowHours.reduce((sum, windowHour) => {
          const block = blockFor(schedule, day.key, windowHour);
          return sum + (block ? stateWeight[block.state] : 0);
        }, 0),
      );
      const availableCount = memberScores.filter((score) => score > 0).length;
      const preferredCount = groupSchedules.filter((schedule) =>
        windowHours.some((windowHour) => blockFor(schedule, day.key, windowHour)?.state === "preferred"),
      ).length;

      const rawScore = memberScores.reduce((sum, score) => sum + score, 0);
      const maxScore = groupSchedules.length * durationHours * stateWeight.preferred;
      const score = Math.max(0, Math.min(100, Math.round((rawScore / maxScore) * 100)));

      const badges = [
        availableCount === groupSchedules.length ? "Todos disponibles" : `${availableCount}/${groupSchedules.length} disponibles`,
        preferredCount > 0 ? `${preferredCount} prefieren este bloque` : "Sin preferencias marcadas",
        durationHours >= 2 ? "Bloque largo" : "Bloque breve",
        modalityLabel(modality),
      ];

      candidates.push({
        id: `${group.id}-${day.key}-${hour}`,
        groupId: group.id,
        day: day.key,
        dateLabel: nextDateLabel(day.key),
        start: hour,
        end: endForWindow(hour, durationHours),
        score,
        modality,
        availableCount,
        memberCount: groupSchedules.length,
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

function modalityLabel(modality: Modality) {
  if (modality === "remote") return "Online";
  if (modality === "in_person") return "Presencial";
  return "Hibrida";
}
