import type { DayKey, Recommendation, ScheduleBlock, UserSchedule, WorkGroup, Modality } from "../types/worksync";
import { days, timeSlots } from "../types/worksync";

const stateWeight: Record<ScheduleBlock["state"], number> = {
  preferred: 24,
  free: 18,
  avoid: -8,
  occupied: -24,
};

const dayDate: Record<DayKey, string> = {
  mon: "Lunes 23 Oct",
  tue: "Martes 24 Oct",
  wed: "Miercoles 25 Oct",
  thu: "Jueves 26 Oct",
  fri: "Viernes 27 Oct",
  sat: "Sabado 28 Oct",
  sun: "Domingo 29 Oct",
};

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
    for (const slot of timeSlots.slice(1, -(durationHours - 1 || 1))) {
      const hour = slot.start;
      const slotIndex = timeSlots.findIndex((item) => item.start === hour);
      const windowSlots = timeSlots.slice(slotIndex, slotIndex + durationHours);
      if (windowSlots.length < durationHours || windowSlots.some((item) => item.kind === "lunch")) continue;
      const windowHours = windowSlots.map((item) => item.start);
      const memberScores = groupSchedules.map((schedule) => {
        const blocks = windowHours.map((windowHour) => blockFor(schedule, day.key, windowHour));
        return blocks.reduce((sum, block) => sum + (block ? stateWeight[block.state] : 0), 0);
      });
      const availableCount = memberScores.filter((score) => score > 0).length;
      const preferredCount = groupSchedules.filter((schedule) =>
        windowHours.some((windowHour) => blockFor(schedule, day.key, windowHour)?.state === "preferred"),
      ).length;
      const occupiedCount = groupSchedules.filter((schedule) =>
        windowHours.some((windowHour) => blockFor(schedule, day.key, windowHour)?.state === "occupied"),
      ).length;
      const rawScore = memberScores.reduce((sum, score) => sum + score, 0) + preferredCount * 8 - occupiedCount * 18;
      const maxScore = groupSchedules.length * durationHours * stateWeight.preferred;
      const score = Math.max(0, Math.min(99, Math.round((rawScore / maxScore) * 100)));

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
        dateLabel: dayDate[day.key],
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
