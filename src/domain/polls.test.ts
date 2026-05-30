import { describe, expect, it } from "vitest";
import {
  candidateFromRecommendation,
  hasApproved,
  summarizePoll,
  toggleVote,
  voterCount,
  winningCandidate,
} from "./polls";
import type { Poll, PollCandidate, Recommendation } from "../types/worksync";

const candidate = (id: string): PollCandidate => ({
  id,
  day: "tue",
  dateLabel: "Martes 24 Oct",
  start: "15:00",
  end: "17:00",
  modality: "hybrid",
});

const make = (over: Partial<Poll> = {}): Poll => ({
  id: "poll1",
  groupId: "g1",
  title: "Cuando?",
  createdBy: "u1",
  status: "open",
  candidates: [candidate("c1"), candidate("c2")],
  votes: {},
  createdAt: 0,
  ...over,
});

describe("toggleVote", () => {
  it("adds an approval, then removes it on a second toggle", () => {
    const once = toggleVote(make(), "u1", "c1");
    expect(once.votes.u1).toEqual(["c1"]);
    const twice = toggleVote(once, "u1", "c1");
    expect(twice.votes.u1).toEqual([]);
  });

  it("lets a member approve several candidates (approval voting)", () => {
    let poll = toggleVote(make(), "u1", "c1");
    poll = toggleVote(poll, "u1", "c2");
    expect(poll.votes.u1).toEqual(["c1", "c2"]);
    expect(hasApproved(poll, "u1", "c2")).toBe(true);
    expect(hasApproved(poll, "u1", "cX")).toBe(false);
  });

  it("does not mutate the original poll", () => {
    const original = make();
    toggleVote(original, "u1", "c1");
    expect(original.votes).toEqual({});
  });
});

describe("summarizePoll", () => {
  it("counts approvals per candidate, preserving candidate order", () => {
    const poll = make({ votes: { u1: ["c1"], u2: ["c1", "c2"], u3: ["c2"] } });
    const results = summarizePoll(poll);
    expect(results.map((r) => r.candidate.id)).toEqual(["c1", "c2"]);
    expect(results.map((r) => r.count)).toEqual([2, 2]);
    expect(results[0].voterIds.sort()).toEqual(["u1", "u2"]);
  });

  it("returns zero counts when nobody has voted", () => {
    expect(summarizePoll(make()).map((r) => r.count)).toEqual([0, 0]);
  });
});

describe("winningCandidate", () => {
  it("picks the candidate with the most approvals", () => {
    const poll = make({ votes: { u1: ["c2"], u2: ["c2"], u3: ["c1"] } });
    expect(winningCandidate(poll)?.id).toBe("c2");
  });

  it("breaks ties toward the earlier candidate", () => {
    const poll = make({ votes: { u1: ["c1"], u2: ["c2"] } });
    expect(winningCandidate(poll)?.id).toBe("c1");
  });

  it("returns undefined when there are no votes", () => {
    expect(winningCandidate(make())).toBeUndefined();
  });
});

describe("voterCount", () => {
  it("counts members with at least one approval", () => {
    const poll = make({ votes: { u1: ["c1"], u2: [], u3: ["c2"] } });
    expect(voterCount(poll)).toBe(2);
  });
});

describe("candidateFromRecommendation", () => {
  const recommendation = (over: Partial<Recommendation> = {}): Recommendation => ({
    id: "r1",
    groupId: "g1",
    day: "thu",
    dateLabel: "Jueves 26 Oct",
    start: "16:00",
    end: "18:00",
    score: 90,
    modality: "remote",
    availableCount: 3,
    memberCount: 4,
    availableMemberIds: ["u1", "u2", "u3"],
    availabilityPct: 75,
    badges: [],
    justification: "",
    ...over,
  });

  it("maps the time fields and keeps the supplied id", () => {
    const built = candidateFromRecommendation("c9", recommendation({ dateISO: "2026-10-26" }));
    expect(built).toEqual({
      id: "c9",
      day: "thu",
      dateLabel: "Jueves 26 Oct",
      dateISO: "2026-10-26",
      start: "16:00",
      end: "18:00",
      modality: "remote",
    });
  });

  it("omits dateISO entirely when the recommendation has none (no undefined keys)", () => {
    const built = candidateFromRecommendation("c9", recommendation());
    expect("dateISO" in built).toBe(false);
  });
});
