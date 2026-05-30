import { describe, expect, it } from "vitest";
import { computeNotifications } from "./notifications";
import type { GroupSession, WorkGroup, WorkSyncData } from "../types/worksync";

const group = (over: Partial<WorkGroup> = {}): WorkGroup => ({
  id: "g1",
  name: "Equipo Alfa",
  description: "",
  type: "study",
  color: "#0058be",
  ownerId: "u1",
  memberIds: ["u1"],
  status: "active",
  ...over,
});

const session = (over: Partial<GroupSession> = {}): GroupSession => ({
  id: "s1",
  groupId: "g1",
  title: "Repaso",
  dateLabel: "Lunes 1 Jun",
  dateISO: "2026-06-01",
  start: "10:20",
  end: "11:50",
  modality: "hybrid",
  location: "Biblioteca",
  status: "proposed",
  score: 90,
  justification: "",
  ...over,
});

const data = (over: Partial<WorkSyncData> = {}): WorkSyncData => ({
  users: [{ id: "u1", name: "Uno", email: "uno@x.com", context: "WorkSync" }],
  currentUserId: "u1",
  schedules: [],
  groups: [group()],
  sessions: [],
  ...over,
});

describe("computeNotifications", () => {
  it("returns nothing without data or user", () => {
    expect(computeNotifications(null, "u1", "uno@x.com")).toEqual([]);
    expect(computeNotifications(data(), undefined, "uno@x.com")).toEqual([]);
  });

  it("flags a proposed session in my group", () => {
    const out = computeNotifications(data({ sessions: [session()] }), "u1", "uno@x.com");
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("session_proposed");
    expect(out[0].to).toBe("/sesiones/s1");
  });

  it("ignores proposed sessions of groups I'm not in", () => {
    const out = computeNotifications(
      data({ groups: [group({ memberIds: ["u9"] })], sessions: [session()] }),
      "u1",
      "uno@x.com",
    );
    expect(out).toEqual([]);
  });

  it("flags a pending invitation by email", () => {
    const out = computeNotifications(
      data({ groups: [group({ memberIds: ["u9"], invitedEmails: ["UNO@x.com"] })] }),
      "u1",
      "uno@x.com",
    );
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("invitation_pending");
  });

  it("flags a confirmed session within two days but not far-future or past ones", () => {
    const now = new Date("2026-06-01T09:00:00");
    const soon = computeNotifications(
      data({ sessions: [session({ id: "s2", status: "confirmed", dateISO: "2026-06-02" })] }),
      "u1",
      "uno@x.com",
      now,
    );
    expect(soon[0].kind).toBe("session_upcoming");
    expect(soon[0].detail).toContain("mañana");

    const far = computeNotifications(
      data({ sessions: [session({ id: "s3", status: "confirmed", dateISO: "2026-06-20" })] }),
      "u1",
      "uno@x.com",
      now,
    );
    expect(far).toEqual([]);

    const past = computeNotifications(
      data({ sessions: [session({ id: "s4", status: "confirmed", dateISO: "2026-05-30" })] }),
      "u1",
      "uno@x.com",
      now,
    );
    expect(past).toEqual([]);
  });
});
