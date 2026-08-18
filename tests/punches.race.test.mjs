import { readFile } from "node:fs/promises";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, runTransaction } from "firebase/firestore";

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

// Helper to normalize timestamps in sessions for comparison
function normalizeSessions(sessions) {
  return sessions.map(s => ({
    ...s,
    punchIn: typeof s.punchIn === 'object' ? s.punchIn.toMillis() : s.punchIn,
    punchOut: s.punchOut && typeof s.punchOut === 'object' ? s.punchOut.toMillis() : s.punchOut
  }));
}

try {
  // Setup initial data
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "employee"), { displayName: "Employee" });
    await setDoc(doc(db, "users", "admin"), { displayName: "Admin" });
    
    // Initialize empty punches doc for employee
    await setDoc(doc(db, "punches", "employee"), { sessions: [] });
  });

  const employee = testEnv.authenticatedContext("employee", employeeClaims).firestore();
  const admin = testEnv.authenticatedContext("admin", adminClaims).firestore();

  // Test 1: Rapid punch-in followed by punch-out should preserve both operations
  console.log("Testing rapid punch-in → punch-out race condition...");
  
  // Simulate the original bug scenario: add then immediately close before snapshot round-trip
  const sessionId = `P-${Date.now().toString(36).toUpperCase()}`;
  const punchInTime = Date.now();
  
  // Add punch-in session
  await runTransaction(employee, async (transaction) => {
    const punchRef = doc(employee, "punches", "employee");
    const punchDoc = await transaction.get(punchRef);
    const serverSessions = punchDoc.exists() && Array.isArray(punchDoc.data().sessions) 
      ? normalizeSessions(punchDoc.data().sessions) 
      : [];
    
    // Check for active session today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const hasActiveToday = serverSessions.some(s => 
      !s.punchOut && new Date(s.punchIn).setHours(0, 0, 0, 0) === todayStart.getTime()
    );
    
    if (hasActiveToday) {
      throw new Error("ALREADY_ACTIVE_SESSION");
    }
    
    transaction.set(punchRef, { sessions: [...serverSessions, { id: sessionId, punchIn: punchInTime, punchOut: null, note: "" }] }, { merge: true });
  });
  
  // Immediately close the session (simulating rapid user action)
  await runTransaction(employee, async (transaction) => {
    const punchRef = doc(employee, "punches", "employee");
    const punchDoc = await transaction.get(punchRef);
    
    if (!punchDoc.exists()) return;
    
    const serverSessions = Array.isArray(punchDoc.data().sessions) 
      ? normalizeSessions(punchDoc.data().sessions) 
      : [];
    
    const updatedSessions = serverSessions.map(s => 
      s.id === sessionId ? { ...s, punchOut: Date.now() } : s
    );
    
    if (updatedSessions.some(s => s.id === sessionId)) {
      transaction.set(punchRef, { sessions: updatedSessions }, { merge: true });
    }
  });
  
  // Verify both operations were preserved
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
  
  // Set up initial state with one session
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "punches", "employee"), { 
      sessions: [{ id: sessionId1, punchIn: Date.now() - 3600000, punchOut: Date.now() - 1800000, note: "" }] 
    });
  });
  
  // Employee adds a new session
  const addPromise = runTransaction(employee, async (transaction) => {
    const punchRef = doc(employee, "punches", "employee");
    const punchDoc = await transaction.get(punchRef);
    const serverSessions = punchDoc.exists() && Array.isArray(punchDoc.data().sessions) 
      ? normalizeSessions(punchDoc.data().sessions) 
      : [];
    
    transaction.set(punchRef, { sessions: [...serverSessions, { id: sessionId2, punchIn: Date.now(), punchOut: null, note: "" }] }, { merge: true });
  });
  
  // Admin deletes the original session concurrently
  const deletePromise = runTransaction(admin, async (transaction) => {
    const punchRef = doc(admin, "punches", "employee");
    const punchDoc = await transaction.get(punchRef);
    
    if (!punchDoc.exists()) return;
    
    const serverSessions = Array.isArray(punchDoc.data().sessions) 
      ? normalizeSessions(punchDoc.data().sessions) 
      : [];
    
    const filteredSessions = serverSessions.filter(s => s.id !== sessionId1);
    
    transaction.set(punchRef, { sessions: filteredSessions }, { merge: true });
  });
  
  // Wait for both to complete
  await Promise.all([addPromise, deletePromise]);
  
  // Verify the added session survived and the deleted session is gone
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
  
  // Reset to empty sessions
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "punches", "employee"), { sessions: [] });
  });
  
  // First punch-in
  const firstSessionId = `P-${Date.now().toString(36).toUpperCase()}`;
  await runTransaction(employee, async (transaction) => {
    const punchRef = doc(employee, "punches", "employee");
    const punchDoc = await transaction.get(punchRef);
    const serverSessions = punchDoc.exists() && Array.isArray(punchDoc.data().sessions) 
      ? normalizeSessions(punchDoc.data().sessions) 
      : [];
    
    transaction.set(punchRef, { sessions: [...serverSessions, { id: firstSessionId, punchIn: Date.now(), punchOut: null, note: "" }] }, { merge: true });
  });
  
  // Second punch-in should fail
  let doublePunchFailed = false;
  try {
    const secondSessionId = `P-${(Date.now() + 1).toString(36).toUpperCase()}`;
    await runTransaction(employee, async (transaction) => {
      const punchRef = doc(employee, "punches", "employee");
      const punchDoc = await transaction.get(punchRef);
      const serverSessions = punchDoc.exists() && Array.isArray(punchDoc.data().sessions) 
        ? normalizeSessions(punchDoc.data().sessions) 
        : [];
      
      // Check for active session today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const hasActiveToday = serverSessions.some(s => 
        !s.punchOut && new Date(s.punchIn).setHours(0, 0, 0, 0) === todayStart.getTime()
      );
      
      if (hasActiveToday) {
        throw new Error("ALREADY_ACTIVE_SESSION");
      }
      
      transaction.set(punchRef, { sessions: [...serverSessions, { id: secondSessionId, punchIn: Date.now(), punchOut: null, note: "" }] }, { merge: true });
    });
  } catch (error) {
    if (error.message === "ALREADY_ACTIVE_SESSION") {
      doublePunchFailed = true;
    }
  }
  
  if (!doublePunchFailed) {
    throw new Error("Double punch-in guard failed: should have rejected second active session");
  }
  
  console.log("✓ Double punch-in guard test passed");

  console.log("All punch race condition tests passed!");
} finally {
  await testEnv.cleanup();
}