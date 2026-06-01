import type { RecurringPattern } from "../types/worksync";

export function generateOccurrences(
  startISO: string,
  recurring: RecurringPattern,
  maxCount = 10
): string[] {
  if (recurring.kind === "none") return [startISO];
  const dates: string[] = [startISO];
  const [y, m, d] = startISO.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const stepMs = recurring.kind === "weekly" ? 7 * 86_400_000 : 14 * 86_400_000;
  for (let i = 1; i < (recurring.count ?? maxCount); i++) {
    const next = new Date(base.getTime() + i * stepMs);
    dates.push(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`);
  }
  return dates;
}
