// Emulator smoke test: drives the notification triggers end-to-end.
// Run via: firebase emulators:exec --only firestore,functions "node functions/smoke.js"
// emulators:exec sets FIRESTORE_EMULATOR_HOST automatically, so the Admin SDK
// writes land in the emulator and the deployed triggers fire against them.
const admin = require("firebase-admin");

admin.initializeApp({ projectId: "worksync-gangale" });
const db = admin.firestore();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uid = "u-test-1";

async function inbox() {
  const snap = await db.collection("notifications").doc(uid).collection("items").get();
  return snap.docs.map((d) => ({ id: d.id, kind: d.data().kind }));
}

async function main() {
  await db.collection("groups").doc("g-test").set({
    name: "Equipo Test",
    ownerId: uid,
    memberIds: [uid],
    status: "active",
  });

  // 1) Proposed session -> onSessionCreated
  await db.collection("sessions").doc("s-test").set({
    groupId: "g-test",
    title: "Repaso emulador",
    status: "proposed",
    start: "10:20",
    dateISO: "2026-06-01",
    dateLabel: "Lunes 1 Jun",
    location: "Biblioteca",
  });
  await sleep(5000);
  const afterProposed = await inbox();
  console.log("After proposed:", JSON.stringify(afterProposed));

  // 2) Confirm session -> onSessionConfirmed
  await db.collection("sessions").doc("s-test").update({ status: "confirmed" });
  await sleep(5000);
  const afterConfirmed = await inbox();
  console.log("After confirmed:", JSON.stringify(afterConfirmed));

  const hasProposed = afterConfirmed.some((n) => n.id === "proposed-s-test" && n.kind === "session_proposed");
  const hasConfirmed = afterConfirmed.some((n) => n.id === "confirmed-s-test" && n.kind === "session_confirmed");

  if (hasProposed && hasConfirmed) {
    console.log("SMOKE OK");
    process.exit(0);
  } else {
    console.log("SMOKE FAIL", { hasProposed, hasConfirmed });
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
