import { describe, expect, it } from "vitest";
import { normalizeScheduleBlocks } from "../data/demoData";
import type { GridConfig, GroupSession, Poll, Recommendation, WorkGroup, WorkSyncData } from "../types/worksync";
import {
  castVote,
  closePoll,
  confirmSession,
  createGroup,
  createPoll,
  createSessionFromRecommendation,
  dedupeInvitedEmails,
  deleteGroup,
  saveSchedule,
  setRsvp,
  updateGroup,
  type MutationDeps,
} from "./mutations";

const deps: MutationDeps = { id: (prefix) => `${prefix}-TEST` };

const group = (id: string, overrides: Partial<WorkGroup> = {}): WorkGroup => ({
  id,
  name: `Grupo ${id}`,
  description: "",
  type: "study",
  color: "#0058be",
  ownerId: "u1",
  memberIds: ["u1"],
  invitedEmails: [],
  status: "active",
  ...overrides,
});

const session = (id: string, groupId: string, overrides: Partial<GroupSession> = {}): GroupSession => ({
  id,
  groupId,
  title: `Sesion ${id}`,
  dateLabel: "Lun 1",
  start: "10:00",
  end: "12:00",
  modality: "hybrid",
  location: "Biblioteca",
  status: "proposed",
  score: 1,
  justification: "",
  ...overrides,
});

const baseData = (): WorkSyncData => ({
  users: [{ id: "u1", name: "Uno", email: "uno@x.com", context: "WorkSync" }],
  currentUserId: "u1",
  schedules: [{ userId: "u1", blocks: [] }],
  groups: [group("g1"), group("g2")],
  sessions: [session("s1", "g1"), session("s2", "g2")],
  polls: [],
});

const recommendation = (overrides: Partial<Recommendation> = {}): Recommendation => ({
  id: "r1",
  groupId: "g1",
  day: "mon",
  dateLabel: "Lun 1 jun",
  dateISO: "2026-06-01",
  start: "10:00",
  end: "12:00",
  score: 88,
  modality: "hybrid",
  availableCount: 3,
  memberCount: 4,
  availableMemberIds: ["u1", "u2", "u3"],
  availabilityPct: 75,
  badges: [],
  justification: "Buena franja",
  ...overrides,
});

describe("dedupeInvitedEmails", () => {
  it("recorta, baja a minúsculas, deduplica y descarta el email propio", () => {
    expect(dedupeInvitedEmails([" A@x.com ", "a@x.com", "B@x.com", "uno@x.com"], "uno@x.com")).toEqual([
      "a@x.com",
      "b@x.com",
    ]);
  });
  it("tolera undefined y vacíos", () => {
    expect(dedupeInvitedEmails(undefined)).toEqual([]);
    expect(dedupeInvitedEmails(["", "  "])).toEqual([]);
  });
});

describe("createGroup", () => {
  it("genera id por deps, incluye al dueño, deduplica invitados y antepone el grupo", () => {
    const { next, write } = createGroup(
      baseData(),
      "u1",
      "uno@x.com",
      { name: "Nuevo", description: "d", type: "study", memberIds: ["u1", "u2"], invitedEmails: ["X@x.com", "x@x.com", "uno@x.com"] },
      deps,
    );
    const created = next.groups[0];
    expect(created.id).toBe("g-TEST");
    expect(created.memberIds).toEqual(["u1", "u2"]);
    expect(created.invitedEmails).toEqual(["x@x.com"]);
    expect(created.color).toBe("#0058be");
    expect(next.groups.map((g) => g.id)).toEqual(["g-TEST", "g1", "g2"]);
    expect(write).toEqual({ kind: "set", collection: "groups", id: "g-TEST", value: created });
  });
  it("asigna color verde a grupos que no son de estudio", () => {
    const { next } = createGroup(baseData(), "u1", undefined, { name: "Proj", description: "", type: "project" }, deps);
    expect(next.groups[0].color).toBe("#006b2c");
  });
});

describe("updateGroup", () => {
  it("deduplica invitados, reemplaza por id y deja intactos los demás", () => {
    const edited = group("g1", { name: "Renombrado", invitedEmails: ["A@x.com", "a@x.com"] });
    const { next, write } = updateGroup(baseData(), edited, "uno@x.com");
    expect(next.groups.find((g) => g.id === "g1")?.name).toBe("Renombrado");
    expect(next.groups.find((g) => g.id === "g1")?.invitedEmails).toEqual(["a@x.com"]);
    expect(next.groups.find((g) => g.id === "g2")?.name).toBe("Grupo g2");
    expect(write.kind).toBe("set");
    expect(write.collection).toBe("groups");
    expect(write.id).toBe("g1");
  });
});

describe("deleteGroup", () => {
  it("elimina el grupo, arrastra (cascada) sus sesiones y emite un write delete", () => {
    const { next, write } = deleteGroup(baseData(), "g1");
    expect(next.groups.map((g) => g.id)).toEqual(["g2"]);
    expect(next.sessions.map((s) => s.id)).toEqual(["s2"]);
    expect(write).toEqual({ kind: "delete", collection: "groups", id: "g1" });
  });
});

describe("createSessionFromRecommendation", () => {
  it("construye la sesión, antepone, devuelve la sesión y emite write set", () => {
    const result = createSessionFromRecommendation(baseData(), recommendation(), deps);
    expect(result.session.id).toBe("s-TEST");
    expect(result.session.title).toBe("Sesion Grupo g1");
    expect(result.session.location).toBe("Biblioteca central + Meet");
    expect(result.session.status).toBe("proposed");
    expect(result.next.sessions.map((s) => s.id)).toEqual(["s-TEST", "s1", "s2"]);
    expect(result.write).toEqual({ kind: "set", collection: "sessions", id: "s-TEST", value: result.session });
  });
  it("ubica según modalidad y usa título fallback si el grupo no existe", () => {
    expect(createSessionFromRecommendation(baseData(), recommendation({ modality: "remote" }), deps).session.location).toBe("Google Meet");
    expect(createSessionFromRecommendation(baseData(), recommendation({ modality: "in_person" }), deps).session.location).toBe("Biblioteca central");
    expect(createSessionFromRecommendation(baseData(), recommendation({ groupId: "zzz" }), deps).session.title).toBe("Sesion WorkSync");
  });
});

describe("confirmSession", () => {
  it("marca confirmada solo la sesión indicada y emite write update", () => {
    const { next, write } = confirmSession(baseData(), "s1");
    expect(next.sessions.find((s) => s.id === "s1")?.status).toBe("confirmed");
    expect(next.sessions.find((s) => s.id === "s2")?.status).toBe("proposed");
    expect(write).toEqual({ kind: "update", collection: "sessions", id: "s1", value: { status: "confirmed" } });
  });
});

describe("setRsvp", () => {
  it("añade la respuesta del usuario y emite un write con path anidado por usuario", () => {
    const { next, write } = setRsvp(baseData(), "s1", "u1", "yes");
    expect(next.sessions.find((s) => s.id === "s1")?.rsvps).toEqual({ u1: "yes" });
    expect(next.sessions.find((s) => s.id === "s2")?.rsvps).toBeUndefined();
    expect(write).toEqual({ kind: "update", collection: "sessions", id: "s1", value: { "rsvps.u1": "yes" } });
  });

  it("cambia la propia respuesta sin tocar la de otros integrantes", () => {
    const data = baseData();
    data.sessions[0].rsvps = { u1: "yes", u2: "no" };
    const { next, write } = setRsvp(data, "s1", "u1", "maybe");
    expect(next.sessions.find((s) => s.id === "s1")?.rsvps).toEqual({ u1: "maybe", u2: "no" });
    expect(write).toEqual({ kind: "update", collection: "sessions", id: "s1", value: { "rsvps.u1": "maybe" } });
  });
});

describe("saveSchedule", () => {
  it("normaliza y reemplaza el horario existente", () => {
    const blocks = [{ day: "mon" as const, hour: "10:00", state: "preferred" as const }];
    const { next, write } = saveSchedule(baseData(), "u1", blocks);
    const normalized = normalizeScheduleBlocks(blocks);
    expect(next.schedules).toHaveLength(1);
    expect(next.schedules[0].blocks).toEqual(normalized);
    expect(write).toEqual({ kind: "set", collection: "schedules", id: "u1", value: { blocks: normalized } });
  });
  it("agrega un horario nuevo cuando el usuario aún no tiene uno", () => {
    const { next } = saveSchedule(baseData(), "u2", []);
    expect(next.schedules.map((s) => s.userId).sort()).toEqual(["u1", "u2"]);
  });
  it("persiste el gridConfig cuando se entrega", () => {
    const gridConfig: GridConfig = { granularityMinutes: 30, startHour: 16, endHour: 22, days: ["mon", "tue"] };
    const { next, write } = saveSchedule(baseData(), "u1", [], gridConfig);
    expect(next.schedules[0].gridConfig).toEqual(gridConfig);
    expect((write as { value: Record<string, unknown> }).value.gridConfig).toEqual(gridConfig);
  });
  it("conserva el gridConfig existente al guardar solo bloques", () => {
    const gridConfig: GridConfig = { granularityMinutes: 60, startHour: 9, endHour: 18, days: ["mon"] };
    const data = baseData();
    data.schedules = [{ userId: "u1", blocks: [], gridConfig }];
    const { next, write } = saveSchedule(data, "u1", []);
    expect(next.schedules[0].gridConfig).toEqual(gridConfig);
    expect((write as { value: Record<string, unknown> }).value.gridConfig).toEqual(gridConfig);
  });
  it("no escribe la clave gridConfig cuando no hay ninguno", () => {
    const { write } = saveSchedule(baseData(), "u1", []);
    expect("gridConfig" in (write as { value: Record<string, unknown> }).value).toBe(false);
  });
});

const samplePoll = (over: Partial<Poll> = {}): Poll => ({
  id: "poll1",
  groupId: "g1",
  title: "Cuando?",
  createdBy: "u1",
  status: "open",
  candidates: [
    { id: "c1", day: "tue", dateLabel: "Mar 24", start: "15:00", end: "17:00", modality: "hybrid" },
    { id: "c2", day: "thu", dateLabel: "Jue 26", start: "16:00", end: "18:00", modality: "remote" },
  ],
  votes: {},
  createdAt: 0,
  ...over,
});

const pollData = (poll: Poll): WorkSyncData => ({ ...baseData(), polls: [poll] });

describe("createPoll", () => {
  it("crea un poll abierto sin votos y emite un set", () => {
    const { next, write } = createPoll(baseData(), "u1", { groupId: "g1", title: "Cuando?", candidates: samplePoll().candidates }, deps);
    expect(next.polls).toHaveLength(1);
    expect(next.polls[0]).toMatchObject({ id: "poll-TEST", groupId: "g1", status: "open", votes: {}, createdBy: "u1" });
    expect(write).toMatchObject({ kind: "set", collection: "polls", id: "poll-TEST" });
  });
});

describe("castVote", () => {
  it("agrega la aprobación del usuario y apunta solo a su propia clave", () => {
    const { next, write } = castVote(pollData(samplePoll()), "poll1", "u2", "c1");
    expect(next.polls[0].votes.u2).toEqual(["c1"]);
    expect(write).toEqual({ kind: "update", collection: "polls", id: "poll1", value: { "votes.u2": ["c1"] } });
  });
  it("quita la aprobación al votar de nuevo el mismo candidato", () => {
    const { next } = castVote(pollData(samplePoll({ votes: { u2: ["c1"] } })), "poll1", "u2", "c1");
    expect(next.polls[0].votes.u2).toEqual([]);
  });
});

describe("closePoll", () => {
  it("cierra el poll y registra el candidato ganador", () => {
    const { next, write } = closePoll(pollData(samplePoll({ votes: { u1: ["c2"], u2: ["c2"], u3: ["c1"] } })), "poll1");
    expect(next.polls[0].status).toBe("closed");
    expect(next.polls[0].winnerCandidateId).toBe("c2");
    expect(write).toEqual({ kind: "update", collection: "polls", id: "poll1", value: { status: "closed", winnerCandidateId: "c2" } });
  });
  it("cierra sin ganador cuando no hubo votos", () => {
    const { next, write } = closePoll(pollData(samplePoll()), "poll1");
    expect(next.polls[0].status).toBe("closed");
    expect(next.polls[0].winnerCandidateId).toBeUndefined();
    expect((write as { value: Record<string, unknown> }).value).toEqual({ status: "closed" });
  });
});
