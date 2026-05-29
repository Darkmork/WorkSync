import { beforeEach, describe, expect, it, vi } from "vitest";

// Force the local (demo) persistence path so this stays a pure unit test and
// never touches a real Firestore instance. vi.mock is hoisted above the imports.
vi.mock("./firebase", () => ({ isFirebaseConfigured: false, db: null }));

import { createGroup } from "../domain/mutations";
import type { WorkSyncData } from "../types/worksync";
import { commit } from "./worksyncRepository";

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

const baseData = (): WorkSyncData => ({
  users: [{ id: "u1", name: "Uno", email: "uno@x.com", context: "WorkSync" }],
  currentUserId: "u1",
  schedules: [{ userId: "u1", blocks: [] }],
  groups: [],
  sessions: [],
});

describe("commit (modo local)", () => {
  it("devuelve el next del resultado y lo espeja en localStorage", async () => {
    const result = createGroup(baseData(), "u1", "uno@x.com", { name: "Nuevo", description: "", type: "study" });
    const next = await commit(result);

    expect(next).toBe(result.next);
    const stored = memStore.get("worksync-demo-data");
    expect(stored).toBeDefined();
    expect((JSON.parse(stored as string) as WorkSyncData).groups.map((g) => g.name)).toEqual(["Nuevo"]);
  });
});
