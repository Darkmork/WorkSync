import type { GroupSession, WorkGroup } from "../types/worksync";

export function filterGroups(groups: WorkGroup[], query: string): WorkGroup[] {
  if (!query.trim()) return groups;
  const q = query.toLowerCase();
  return groups.filter(
    (g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
  );
}

export function filterSessions(sessions: GroupSession[], query: string): GroupSession[] {
  if (!query.trim()) return sessions;
  const q = query.toLowerCase();
  return sessions.filter((s) => s.title.toLowerCase().includes(q));
}

export function filterRecommendations(recommendations: { title: string; groupName?: string }[], query: string) {
  if (!query.trim()) return recommendations;
  const q = query.toLowerCase();
  return recommendations.filter(
    (r) => r.title.toLowerCase().includes(q) || (r.groupName && r.groupName.toLowerCase().includes(q))
  );
}
