import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

const GROUP = {
  id: "g1",
  name: "Cálculo II",
  description: "Grupo de estudio",
  type: "study",
  color: "#0058be",
  ownerId: "owner",
  memberIds: ["owner", "member"],
  invitedEmails: ["invited@x.com"],
  status: "active",
};

// Helpers create a fresh client per call; cheap and avoids shared state.
const ownerDb = () => testEnv.authenticatedContext("owner", { email: "owner@x.com" }).firestore();
const memberDb = () => testEnv.authenticatedContext("member", { email: "member@x.com" }).firestore();
const invitedDb = () => testEnv.authenticatedContext("invited", { email: "invited@x.com" }).firestore();
const outsiderDb = () => testEnv.authenticatedContext("outsider", { email: "outsider@x.com" }).firestore();
const anonDb = () => testEnv.unauthenticatedContext().firestore();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "worksync-rules-test",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "groups", "g1"), GROUP);
    await setDoc(doc(db, "sessions", "s1"), { id: "s1", groupId: "g1", title: "Sesión", status: "proposed" });
    await setDoc(doc(db, "schedules", "owner"), { blocks: [] });
    await setDoc(doc(db, "users", "owner"), { name: "Dueño", email: "owner@x.com" });
  });
});

describe("groups: lectura por pertenencia", () => {
  it("el dueño puede leer su grupo", async () => {
    await assertSucceeds(getDoc(doc(ownerDb(), "groups", "g1")));
  });
  it("un miembro puede leer el grupo", async () => {
    await assertSucceeds(getDoc(doc(memberDb(), "groups", "g1")));
  });
  it("un invitado por email puede leer el grupo", async () => {
    await assertSucceeds(getDoc(doc(invitedDb(), "groups", "g1")));
  });
  it("un usuario ajeno NO puede leer el grupo", async () => {
    await assertFails(getDoc(doc(outsiderDb(), "groups", "g1")));
  });
  it("sin sesión iniciada NO puede leer el grupo", async () => {
    await assertFails(getDoc(doc(anonDb(), "groups", "g1")));
  });
  it("una list query sin acotar es rechazada incluso para un miembro", async () => {
    await assertFails(getDocs(collection(memberDb(), "groups")));
  });
  it("la list query acotada por memberIds funciona para el miembro", async () => {
    await assertSucceeds(getDocs(query(collection(memberDb(), "groups"), where("memberIds", "array-contains", "member"))));
  });
  it("la list query acotada por invitedEmails funciona para el invitado", async () => {
    await assertSucceeds(getDocs(query(collection(invitedDb(), "groups"), where("invitedEmails", "array-contains", "invited@x.com"))));
  });
});

describe("groups: auto-join del invitado", () => {
  it("un invitado puede unirse solo (agregar uid y limpiar su email)", async () => {
    await assertSucceeds(
      updateDoc(doc(invitedDb(), "groups", "g1"), { memberIds: ["owner", "member", "invited"], invitedEmails: [] }),
    );
  });
  it("un ajeno NO puede agregarse al grupo", async () => {
    await assertFails(
      updateDoc(doc(outsiderDb(), "groups", "g1"), { memberIds: ["owner", "member", "outsider"] }),
    );
  });
});

describe("sessions: escritura por pertenencia al grupo", () => {
  it("un miembro puede crear una sesión en su grupo", async () => {
    await assertSucceeds(
      setDoc(doc(memberDb(), "sessions", "s2"), { id: "s2", groupId: "g1", title: "Nueva", status: "proposed" }),
    );
  });
  it("un ajeno NO puede crear una sesión en el grupo", async () => {
    await assertFails(
      setDoc(doc(outsiderDb(), "sessions", "s3"), { id: "s3", groupId: "g1", title: "Intrusa", status: "proposed" }),
    );
  });
  it("un miembro puede confirmar (update) una sesión", async () => {
    await assertSucceeds(updateDoc(doc(memberDb(), "sessions", "s1"), { status: "confirmed" }));
  });
  it("un ajeno NO puede confirmar una sesión", async () => {
    await assertFails(updateDoc(doc(outsiderDb(), "sessions", "s1"), { status: "confirmed" }));
  });
});

describe("sessions: RSVP solo sobre la propia respuesta", () => {
  it("un miembro puede fijar su propio RSVP", async () => {
    await assertSucceeds(updateDoc(doc(memberDb(), "sessions", "s1"), { "rsvps.member": "yes" }));
  });
  it("un miembro NO puede editar el RSVP de otro integrante", async () => {
    await assertFails(updateDoc(doc(memberDb(), "sessions", "s1"), { "rsvps.owner": "no" }));
  });
  it("un ajeno NO puede fijar ningún RSVP", async () => {
    await assertFails(updateDoc(doc(outsiderDb(), "sessions", "s1"), { "rsvps.outsider": "yes" }));
  });
  it("un miembro puede cambiar su RSVP dejando intacto el de otro", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "sessions", "s1"), {
        id: "s1",
        groupId: "g1",
        title: "Sesión",
        status: "proposed",
        rsvps: { owner: "yes", member: "maybe" },
      });
    });
    await assertSucceeds(updateDoc(doc(memberDb(), "sessions", "s1"), { "rsvps.member": "no" }));
  });
});

describe("schedules/users: legibles por cualquier autenticado (limitación documentada)", () => {
  it("un autenticado ajeno puede leer un horario", async () => {
    await assertSucceeds(getDoc(doc(outsiderDb(), "schedules", "owner")));
  });
  it("sin sesión NO puede leer un horario", async () => {
    await assertFails(getDoc(doc(anonDb(), "schedules", "owner")));
  });
});
