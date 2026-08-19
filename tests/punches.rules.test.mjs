// tests/punches.rules.test.mjs
// Security-rules coverage for the punches collection:
//   - ownership + permission gating (canClockIn own doc / canManageReports)
//   - structural validation (sessions list only, size cap)
//   - document deletion restricted to report managers
// Run with: npm run test:punches-rules  (requires the Firestore emulator)
import { readFile } from "node:fs/promises";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const rules = await readFile("firestore.rules", "utf8");
const testEnv = await initializeTestEnvironment({
  projectId: "shredhills-punches-rules-test",
  firestore: { rules },
});

const clockInClaims = { role: "user", permissions: { canClockIn: true } };
const noClockClaims = { role: "user", permissions: { canSubmitExpenses: true } };
const managerClaims = { role: "user", permissions: { canManageReports: true } };
const adminClaims = { role: "admin", permissions: { canManageReports: true } };
const strippedAdminClaims = { role: "admin", permissions: {} };

const now = Date.now();
const validSessions = [
  { id: "P-A", punchIn: now - 7200000, punchOut: now - 3600000, note: "" },
  { id: "P-B", punchIn: now - 1800000, punchOut: null, note: "" },
];

try {
  // Seed: another employee already has a punch document.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "clocker"), { displayName: "Clocker" });
    await setDoc(doc(db, "users", "other"), { displayName: "Other" });
    await setDoc(doc(db, "users", "noclock"), { displayName: "NoClock" });
    await setDoc(doc(db, "punches", "other"), { sessions: validSessions });
  });

  const clocker = testEnv.authenticatedContext("clocker", clockInClaims).firestore();
  const noclock = testEnv.authenticatedContext("noclock", noClockClaims).firestore();
  const manager = testEnv.authenticatedContext("manager", managerClaims).firestore();
  const admin = testEnv.authenticatedContext("admin", adminClaims).firestore();
  const unauthenticated = testEnv.unauthenticatedContext().firestore();

  // ── Ownership & permission gating ──────────────────────────────────────────
  await assertFails(getDoc(doc(unauthenticated, "punches", "clocker")));
  await assertFails(getDoc(doc(clocker, "punches", "other"))); // someone else's doc
  await assertFails(getDoc(doc(noclock, "punches", "noclock"))); // no canClockIn
  await assertSucceeds(getDoc(doc(manager, "punches", "other")));
  await assertFails(setDoc(doc(clocker, "punches", "other"), { sessions: [] }));

  // ── Valid writes are allowed ───────────────────────────────────────────────
  await assertSucceeds(setDoc(doc(clocker, "punches", "clocker"), { sessions: validSessions }));
  await assertSucceeds(updateDoc(doc(clocker, "punches", "clocker"), { sessions: [...validSessions.slice(0, 1)] }));
  await assertSucceeds(setDoc(doc(manager, "punches", "noclock"), { sessions: [] }));

  // ── Structural validation ──────────────────────────────────────────────────
  // Top-level fields other than `sessions` are rejected.
  await assertFails(setDoc(doc(clocker, "punches", "clocker"), { sessions: [], tamper: true }));
  // `sessions` must be a list.
  await assertFails(setDoc(doc(clocker, "punches", "clocker"), { sessions: "oops" }));
  await assertFails(setDoc(doc(clocker, "punches", "clocker"), { sessions: { 0: "oops" } }));
  // The sessions array is capped.
  await assertFails(setDoc(doc(clocker, "punches", "clocker"), {
    sessions: new Array(10001).fill({ id: "P-X", punchIn: now, punchOut: null }),
  }));
  await assertSucceeds(setDoc(doc(clocker, "punches", "clocker"), {
    sessions: new Array(10000).fill({ id: "P-X", punchIn: now, punchOut: null }),
  }));

  // ── Document deletion is reserved to report managers ──────────────────────
  await assertFails(deleteDoc(doc(clocker, "punches", "clocker")));
  await assertSucceeds(deleteDoc(doc(manager, "punches", "clocker")));
  await assertSucceeds(setDoc(doc(admin, "punches", "clocker"), { sessions: validSessions }));
  await assertSucceeds(deleteDoc(doc(admin, "punches", "clocker")));

  // ── Admin permissions are enforced too ─────────────────────────────────────
  // An admin whose canManageReports permission is unchecked has no more access
  // to other people's punch documents than a regular user.
  const strippedAdmin = testEnv.authenticatedContext("stripped-admin", strippedAdminClaims).firestore();
  await assertFails(getDoc(doc(strippedAdmin, "punches", "other")));
  await assertFails(setDoc(doc(strippedAdmin, "punches", "other"), { sessions: [] }));
  await assertFails(deleteDoc(doc(strippedAdmin, "punches", "other")));

  console.log("Punch security rules tests passed");
} finally {
  await testEnv.cleanup();
}
