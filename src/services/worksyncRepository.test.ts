import { beforeEach, describe, expect, it, vi } from "vitest";

// Force the local (demo) persistence path so these stay pure unit tests and
// never touch a real Firestore instance. vi.mock is hoisted above the imports.
vi.mock("./firebase", () => ({ isFirebaseConfigured: false, db: null }));

import { normalizeScheduleBlocks } from "../data/demoData";
import type { GroupSession, WorkGroup, WorkSyncData } from "../types/worksync";
import {
  confirmSession,
  deleteGroup,
  saveGroup,
  saveSchedule,
  saveSession,
  updateGroup,
} from "./worksyncRepository";

// In-memory localStorage so persistLocalData() works under the Node test env.
const memStore = new Map<string, string>();
beforeEach(() => {
  memStore.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memStore.get(k) ?? null,
    setItem: (k: string, v: string) => void memStore.set(k, String(v)),
    removeItem: (k: string) => void memStore.delete(k),
    clear: () => memStore.clear(),
    key: () => null,
    length: 0,
  });
});

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
});

describe("worksyncRepository — transformaciones de datos (modo local)", () => {
  describe("saveSchedule", () => {
    it("reemplaza los bloques de un horario existente y los normaliza", async () => {
      const data = baseData();
      const blocks = [{ day: "mon" as const, hour: "10:00", state: "preferred" as const }];
      const next = await saveSchedule("u1", blocks, data);
      const schedule = next.schedules.find((s) => s.userId === "u1");
      expect(next.schedules).toHaveLength(1);
      expect(schedule?.blocks).toEqual(normalizeScheduleBlocks(blocks));
    });

    it("agrega un horario nuevo cuando el usuario aún no tiene uno", async () => {
      const data = baseData();
      const next = await saveSchedule("u2", [], data);
      expect(next.schedules.map((s) => s.userId).sort()).toEqual(["u1", "u2"]);
    });
  });

  describe("saveGroup", () => {
    it("antepone el grupo nuevo a la lista", async () => {
      const data = baseData();
      const next = await saveGroup(group("g3"), data);
      expect(next.groups.map((g) => g.id)).toEqual(["g3", "g1", "g2"]);
    });
  });

  describe("updateGroup", () => {
    it("reemplaza el grupo con el mismo id y deja intactos los demás", async () => {
      const data = baseData();
      const edited = group("g1", { name: "Renombrado" });
      const next = await updateGroup(edited, data);
      expect(next.groups.find((g) => g.id === "g1")?.name).toBe("Renombrado");
      expect(next.groups.find((g) => g.id === "g2")?.name).toBe("Grupo g2");
      expect(next.groups).toHaveLength(2);
    });
  });

  describe("deleteGroup", () => {
    it("elimina el grupo y arrastra (cascada) sus sesiones", async () => {
      const data = baseData();
      const next = await deleteGroup("g1", data);
      expect(next.groups.map((g) => g.id)).toEqual(["g2"]);
      expect(next.sessions.map((s) => s.id)).toEqual(["s2"]);
    });
  });

  describe("saveSession", () => {
    it("antepone la sesión nueva", async () => {
      const data = baseData();
      const next = await saveSession(session("s3", "g1"), data);
      expect(next.sessions.map((s) => s.id)).toEqual(["s3", "s1", "s2"]);
    });
  });

  describe("confirmSession", () => {
    it("marca como confirmada solo la sesión indicada", async () => {
      const data = baseData();
      const next = await confirmSession("s1", data);
      expect(next.sessions.find((s) => s.id === "s1")?.status).toBe("confirmed");
      expect(next.sessions.find((s) => s.id === "s2")?.status).toBe("proposed");
    });
  });
});
