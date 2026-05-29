import { describe, expect, it } from "vitest";
import type { WorkGroup } from "../types/worksync";
import { resolveInvitations } from "./invitations";

const group = (id: string, overrides: Partial<WorkGroup> = {}): WorkGroup => ({
  id,
  name: `Grupo ${id}`,
  description: "",
  type: "study",
  color: "#0058be",
  ownerId: "owner",
  memberIds: ["owner"],
  invitedEmails: [],
  status: "active",
  ...overrides,
});

describe("resolveInvitations", () => {
  it("auto-une a un invitado: agrega su uid y quita su email (case-insensitive)", () => {
    const groups = [group("g1", { invitedEmails: ["Invited@X.com"] })];
    const { groups: resolved, writes } = resolveInvitations(groups, "u2", "invited@x.com");
    expect(resolved[0].memberIds).toEqual(["owner", "u2"]);
    expect(resolved[0].invitedEmails).toEqual([]);
    expect(writes).toEqual([
      { kind: "update", collection: "groups", id: "g1", value: { memberIds: ["owner", "u2"], invitedEmails: [] } },
    ]);
  });

  it("no hace nada si ya es miembro", () => {
    const groups = [group("g1", { memberIds: ["owner", "u2"], invitedEmails: ["invited@x.com"] })];
    const { groups: resolved, writes } = resolveInvitations(groups, "u2", "invited@x.com");
    expect(resolved[0]).toEqual(groups[0]);
    expect(writes).toEqual([]);
  });

  it("no hace nada para un ajeno (no invitado)", () => {
    const groups = [group("g1", { invitedEmails: ["otra@x.com"] })];
    const { writes } = resolveInvitations(groups, "u2", "ajeno@x.com");
    expect(writes).toEqual([]);
  });

  it("no hace nada con email vacío", () => {
    const groups = [group("g1", { invitedEmails: ["invited@x.com"] })];
    const { writes } = resolveInvitations(groups, "u2", "");
    expect(writes).toEqual([]);
  });

  it("solo emite writes para los grupos donde está invitado", () => {
    const groups = [
      group("g1", { invitedEmails: ["invited@x.com"] }),
      group("g2", { invitedEmails: ["otra@x.com"] }),
      group("g3", { memberIds: ["owner", "u2"] }),
    ];
    const { writes } = resolveInvitations(groups, "u2", "invited@x.com");
    expect(writes.map((w) => w.id)).toEqual(["g1"]);
  });
});
