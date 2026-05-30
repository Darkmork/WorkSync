import type { Poll, PollCandidate, PollResult, Recommendation } from "../types/worksync";

// --- Pure poll logic ---------------------------------------------------------
// A poll proposes several candidate meeting slots; members approve the ones they
// can attend (approval voting). These helpers never touch React or I/O — they
// turn a Poll into the tallies the UI shows and the winner a session is built
// from. The matching persistence intents live in domain/mutations.ts.

// Toggle one member's approval of one candidate. Returns a new Poll.
export function toggleVote(poll: Poll, userId: string, candidateId: string): Poll {
  const current = poll.votes[userId] ?? [];
  const next = current.includes(candidateId)
    ? current.filter((id) => id !== candidateId)
    : [...current, candidateId];
  return { ...poll, votes: { ...poll.votes, [userId]: next } };
}

// Whether a member has approved a given candidate.
export function hasApproved(poll: Poll, userId: string, candidateId: string): boolean {
  return (poll.votes[userId] ?? []).includes(candidateId);
}

// Count approvals per candidate, preserving the proposer's candidate order so
// ties resolve deterministically toward the earlier option.
export function summarizePoll(poll: Poll): PollResult[] {
  const voters = new Map<string, string[]>();
  for (const candidate of poll.candidates) voters.set(candidate.id, []);
  for (const [userId, candidateIds] of Object.entries(poll.votes)) {
    for (const candidateId of candidateIds) {
      voters.get(candidateId)?.push(userId);
    }
  }
  return poll.candidates.map((candidate) => {
    const voterIds = voters.get(candidate.id) ?? [];
    return { candidate, voterIds, count: voterIds.length };
  });
}

// The candidate with the most approvals. Ties break toward earlier candidate
// order; undefined when nobody has voted yet.
export function winningCandidate(poll: Poll): PollCandidate | undefined {
  let best: PollResult | undefined;
  for (const result of summarizePoll(poll)) {
    if (result.count > 0 && (!best || result.count > best.count)) best = result;
  }
  return best?.candidate;
}

// How many distinct members have cast at least one approval.
export function voterCount(poll: Poll): number {
  return Object.values(poll.votes).filter((candidateIds) => candidateIds.length > 0).length;
}

// Build a candidate slot from a recommendation, so a proposer can turn engine
// suggestions straight into poll options. The id is supplied by the caller
// (deterministic under test).
export function candidateFromRecommendation(id: string, recommendation: Recommendation): PollCandidate {
  const candidate: PollCandidate = {
    id,
    day: recommendation.day,
    dateLabel: recommendation.dateLabel,
    start: recommendation.start,
    end: recommendation.end,
    modality: recommendation.modality,
  };
  // Never carry an undefined key (Firestore rejects them); only set when present.
  if (recommendation.dateISO) candidate.dateISO = recommendation.dateISO;
  return candidate;
}
