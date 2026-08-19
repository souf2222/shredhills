// tests/punches.race.test.mjs
// Race-condition and invariant tests for the punch system, run against the
// Firestore emulator. The transaction bodies below mirror useFirestore.js
// and share its production logic (punchLogic.js), so they exercise the real
// validation instead of a drifting re-implementation.
// Run with: npm run test:punches  (requires the Firestore emulator)
import { readFile } from "node:fs/promises";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, runTransaction } from "firebase/firestore";
import {
  autoCloseOrphans,
  findOpenSession,
  findOverlap,
  normalizeSessions,
  sanitizeSession,
  validateSession,
  MAX_SESSIONS,
} from "../src/utils/punchLogic.js";
import { dayStart } from "../src/utils/helpers.js";

const DAY = 24 * 60 * 60 * 1000;

const rules = await readFile("firestore.rules", "utf8");
const testEnv = await initializeTestEnvironment({
  projectId: "shredhills-punches-test",
  firestore: { rules },
});

const employeeClaims = {
  role: "user",
  permissions: { canClockIn: true },
};

const adminClaims = {
  role: "admin",
  permissions: { canManageReports: true },
};

// ── Production logic mirrors (see addPunchSession & friends in useFirestore.js) ──

async function addPunchSessionLike(db, empId, session) {
  const err = validateSession(session);
  if (err) throw new Error(err);
  const clean = sanitizeSession(session);
  const punchRef = doc(db, "punches", empId);
  await runTransaction(db, async (transaction) => {
    const punchDoc = await transaction.get(punchRef);
    let serverSessions = normalizeSessions(punchDoc.exists() ? punchDoc.data().sessions : null);
    if (serverSessions.length >= MAX_SESSIONS) throw new Error("PUNCH_DOC_FULL");
    serverSessions = autoCloseOrphans(serverSessions);
    if (clean.punchOut == null && findOpenSession(serverSessions)) {
      throw new Error("ALREADY_ACTIVE_SESSION");
    }
    if (findOverlap(serverSessions, clean)) {
      throw new Error("OVERLAPPING_SESSION");
    }
    transaction.set(punchRef, { sessions: [...serverSessions, clean] }, { merge: true });
  });
}

async function updatePunchSessionLike(db, empId, updatedSession) {
  const err = validateSession(updatedSession);
  if (err) throw new Error(err);
  const clean = sanitizeSession(updatedSession);
  const punchRef = doc(db, "punches", empId);
  await runTransaction(db, async (transaction) => {
    const punchDoc = await transaction.get(punchRef);
    const serverSessions = normalizeSessions(punchDoc.exists() ? punchDoc.data().sessions : null);
    if (!serverSessions.some(s => s.id === clean.id)) throw new Error("SESSION_NOT_FOUND");
    if (clean.punchOut == null && findOpenSession(serverSessions, clean.id)) {
      throw new Error("ALREADY_ACTIVE_SESSION");
    }
    if (findOverlap(serverSessions, clean, clean.id)) {
      throw new Error("OVERLAPPING_SESSION");
    }
    transaction.set(
      punchRef,
      { sessions: serverSessions.map(s => (s.id === clean.id ? clean : s)) },
      { merge: true }
    );
  });
}

async function closePunchSessionLike(db, empId, sessionId) {
  const punchRef = doc(db, "punches", empId);
  await runTransaction(db, async (transaction) => {
    const punchDoc = await transaction.get(punchRef);
    const serverSessions = normalizeSessions(punchDoc.exists() ? punchDoc.data().sessions : null);
    const target = serverSessions.find(s => s.id === sessionId);
    if (!target) throw new Error("SESSION_NOT_FOUND");
    if (target.punchOut != null) return;
    const now = Date.now();
    const punchOut = now > target.punchIn ? now : target.punchIn + 1000;
    transaction.set(
      punchRef,
      { sessions: serverSessions.map(s => (s.id === sessionId ? { ...s, punchOut } : s)) },
      { merge: true }
    );
  });
}

async function deletePunchSessionLike(db, empId, sessionId) {
  const punchRef = doc(db, "punches", empId);
  await runTransaction(db, async (transaction) => {
    const punchDoc = await transaction.get(punchRef);
    const serverSessions = normalizeSessions(punchDoc.exists() ? punchDoc.data().sessions : null);
    if (!serverSessions.some(s => s.id === sessionId)) throw new Error("SESSION_NOT_FOUND");
    transaction.set(
      punchRef,
      { sessions: serverSessions.filter(s => s.id !== sessionId) },
      { merge: true }
    );
  });
}

async function expectErrorCode(promise, code) {
  try {
    await promise;
  } catch (error) {
    if (error.message === code) return;
    throw new Error(`Expected ${code}, got: ${error.message}`);
  }
  throw new Error(`Expected ${code}, but the operation succeeded`);
}

try {
  // Setup initial data
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "employee"), { displayName: "Employee" });
    await setDoc(doc(db, "users", "admin"), { displayName: "Admin" });
    await setDoc(doc(db, "punches", "employee"), { sessions: [] });
  });

  const employee = testEnv.authenticatedContext("employee", employeeClaims).firestore();
  const admin = testEnv.authenticatedContext("admin", adminClaims).firestore();

  // Test 1: Rapid punch-in followed by punch-out should preserve both operations
  console.log("Testing rapid punch-in → punch-out race condition...");

  const sessionId = `P-${Date.now().toString(36).toUpperCase()}`;
  const punchInTime = Date.now();

  await addPunchSessionLike(employee, "employee", {
    id: sessionId, punchIn: punchInTime, punchOut: null, note: "",
  });

  // Immediately close the session (simulating rapid user action)
  await closePunchSessionLike(employee, "employee", sessionId);

  const finalDoc = await getDoc(doc(employee, "punches", "employee"));
  const finalSessions = normalizeSessions(finalDoc.data().sessions);
  const foundSession = finalSessions.find(s => s.id === sessionId);

  if (!foundSession || !foundSession.punchOut) {
    throw new Error("Race condition fix failed: session was lost or not properly closed");
  }

  console.log("✓ Rapid punch-in → punch-out test passed");

  // Test 2: Concurrent writers - admin delete while employee adds
  console.log("Testing concurrent writers (admin delete + employee add)...");

  const sessionId1 = `P-${Date.now().toString(36).toUpperCase()}`;
  const sessionId2 = `P-${(Date.now() + 1).toString(36).toUpperCase()}`;

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "punches", "employee"), {
      sessions: [{ id: sessionId1, punchIn: Date.now() - 3600000, punchOut: Date.now() - 1800000, note: "" }]
    });
  });

  // Employee adds a new session while admin deletes the original one.
  // Firestore serializes the two transactions: one retries and re-reads.
  const addPromise = addPunchSessionLike(employee, "employee", {
    id: sessionId2, punchIn: Date.now(), punchOut: null, note: "",
  }).catch(e => e.message);
  const deletePromise = deletePunchSessionLike(admin, "employee", sessionId1).catch(e => e.message);

  const [addResult, deleteResult] = await Promise.all([addPromise, deletePromise]);
  if (addResult instanceof Error || deleteResult instanceof Error) {
    throw new Error(`Concurrent writers failed: add=${addResult}, delete=${deleteResult}`);
  }

  const concurrentDoc = await getDoc(doc(employee, "punches", "employee"));
  const concurrentSessions = normalizeSessions(concurrentDoc.data().sessions);
  const hasAddedSession = concurrentSessions.some(s => s.id === sessionId2);
  const hasDeletedSession = concurrentSessions.some(s => s.id === sessionId1);

  if (!hasAddedSession || hasDeletedSession) {
    throw new Error("Concurrent writers test failed: sessions not properly handled");
  }

  console.log("✓ Concurrent writers test passed");

  // Test 3: Double punch-in guard
  console.log("Testing double punch-in guard...");

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "punches", "employee"), { sessions: [] });
  });

  const firstSessionId = `P-${Date.now().toString(36).toUpperCase()}`;
  await addPunchSessionLike(employee, "employee", {
    id: firstSessionId, punchIn: Date.now(), punchOut: null, note: "",
  });

  await expectErrorCode(
    addPunchSessionLike(employee, "employee", {
      id: `P-${(Date.now() + 1).toString(36).toUpperCase()}`,
      punchIn: Date.now() + 1000,
      punchOut: null,
      note: "",
    }),
    "ALREADY_ACTIVE_SESSION"
  );

  console.log("✓ Double punch-in guard test passed");

  // Test 4: Admin can add a closed manual entry while an employee is clocked
  // in, as long as it doesn't overlap the open session.
  console.log("Testing admin manual add during an active session...");

  await addPunchSessionLike(admin, "employee", {
    id: `P-MANUAL-${Date.now().toString(36).toUpperCase()}`,
    punchIn: Date.now() - 5 * 3600000,
    punchOut: Date.now() - 4 * 3600000,
    note: "Oubli de pointage",
  });

  const manualDoc = await getDoc(doc(employee, "punches", "employee"));
  const manualSessions = normalizeSessions(manualDoc.data().sessions);
  if (!manualSessions.some(s => s.note === "Oubli de pointage")) {
    throw new Error("Manual closed entry should be allowed during an active session");
  }
  if (!manualSessions.some(s => s.id === firstSessionId && !s.punchOut)) {
    throw new Error("The active session should still be open");
  }

  console.log("✓ Admin manual add during active session test passed");

  // Test 5: Overlapping manual entry is rejected. The candidate must end
  // after the open session's start to count as an overlap.
  console.log("Testing overlapping session rejection...");

  await expectErrorCode(
    addPunchSessionLike(admin, "employee", {
      id: `P-OVL-${Date.now().toString(36).toUpperCase()}`,
      punchIn: Date.now() - 40 * 60000, // 40 min ago
      punchOut: Date.now(),             // still open-ended into the active session
      note: "Chevauchement",
    }),
    "OVERLAPPING_SESSION"
  );

  console.log("✓ Overlapping session rejection test passed");

  // Test 6: A forgotten punch-out from a previous day is auto-closed on the
  // next punch-in, at the end of its start day.
  console.log("Testing orphan auto-close on next punch-in...");

  const yesterday = Date.now() - 26 * 3600000;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "punches", "employee"), {
      sessions: [{ id: "P-ORPHAN", punchIn: yesterday, punchOut: null, note: "" }]
    });
  });

  await addPunchSessionLike(employee, "employee", {
    id: `P-TODAY-${Date.now().toString(36).toUpperCase()}`,
    punchIn: Date.now(),
    punchOut: null,
    note: "",
  });

  const orphanDoc = await getDoc(doc(employee, "punches", "employee"));
  const orphanSessions = normalizeSessions(orphanDoc.data().sessions);
  const orphan = orphanSessions.find(s => s.id === "P-ORPHAN");
  const expectedClose = dayStart(yesterday) + DAY - 1;

  if (!orphan || orphan.punchOut !== expectedClose) {
    throw new Error(`Orphan auto-close failed: punchOut=${orphan?.punchOut}, expected ${expectedClose}`);
  }
  if (!orphanSessions.some(s => s.id.startsWith("P-TODAY") && !s.punchOut)) {
    throw new Error("New punch-in should be open after orphan auto-close");
  }

  console.log("✓ Orphan auto-close test passed");

  // Test 7: Update/delete of a missing session surfaces SESSION_NOT_FOUND
  console.log("Testing SESSION_NOT_FOUND errors...");

  const missingId = "P-DOES-NOT-EXIST";
  await expectErrorCode(
    updatePunchSessionLike(employee, "employee", {
      id: missingId, punchIn: Date.now() - 3600000, punchOut: Date.now() - 1800000, note: "x",
    }),
    "SESSION_NOT_FOUND"
  );
  await expectErrorCode(closePunchSessionLike(employee, "employee", missingId), "SESSION_NOT_FOUND");
  await expectErrorCode(deletePunchSessionLike(employee, "employee", missingId), "SESSION_NOT_FOUND");

  console.log("✓ SESSION_NOT_FOUND test passed");

  console.log("All punch race condition tests passed!");
} finally {
  await testEnv.cleanup();
}
