import { describe, expect, it } from "vitest";
import { summarizeRsvps } from "./rsvp";

describe("summarizeRsvps", () => {
  it("treats every member without an answer as pending", () => {
    const summary = summarizeRsvps(["u1", "u2", "u3"], undefined);
    expect(summary.total).toBe(3);
    expect(summary.pending).toBe(3);
    expect(summary.yes).toBe(0);
    expect(summary.entries).toEqual([
      { userId: "u1", status: "pending" },
      { userId: "u2", status: "pending" },
      { userId: "u3", status: "pending" },
    ]);
  });

  it("counts yes / no / maybe and keeps member order", () => {
    const summary = summarizeRsvps(["u1", "u2", "u3", "u4"], { u1: "yes", u2: "no", u4: "maybe" });
    expect(summary).toMatchObject({ yes: 1, no: 1, maybe: 1, pending: 1, total: 4 });
    expect(summary.entries.map((entry) => entry.status)).toEqual(["yes", "no", "pending", "maybe"]);
  });

  it("ignores answers from users who are no longer members", () => {
    const summary = summarizeRsvps(["u1"], { u1: "yes", uX: "yes" });
    expect(summary.yes).toBe(1);
    expect(summary.total).toBe(1);
    expect(summary.entries).toEqual([{ userId: "u1", status: "yes" }]);
  });
});
