import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { databaseId } from "./database-id.mjs";
import { newPunchId } from "../../src/utils/punchLogic.js";

// One-time migration: assign collision-proof ids to punch sessions created
// before the hardened punch model (commit d2880bb) required them. Sessions
// without an id cannot be edited or deleted by the app (INVALID_SESSION /
// SESSION_NOT_FOUND). Idempotent: sessions with a valid id are untouched and
// unchanged documents are not written.
//
// Every write produces a punch_backups entry and an audit entry from the
// deployed triggers, so the migration leaves its own recovery trail.
//
// Usage:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
//   node functions/scripts/migrate-punch-ids.mjs --dry-run  # report only
//   node functions/scripts/migrate-punch-ids.mjs            # migrate
const dryRun = process.argv.includes("--dry-run");

const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? undefined
  : process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : undefined;

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: serviceAccount ? cert(serviceAccount) : applicationDefault() });

const db = getFirestore(app, databaseId);

const hasValidId = (s) => typeof s?.id === "string" && s.id.length > 0;

const snaps = await db.collection("punches").get();

let usersAffected = 0;
let sessionsMigrated = 0;
let anomalies = 0;

for (const doc of snaps.docs) {
  const sessions = doc.data().sessions;
  if (!Array.isArray(sessions)) {
    console.warn(`⚠️ ${doc.id}: missing or non-array 'sessions' field — skipped`);
    anomalies += 1;
    continue;
  }
  if (sessions.every(hasValidId)) continue;

  const existingIds = new Set(sessions.filter(hasValidId).map((s) => s.id));
  const migrated = sessions.map((s) => {
    if (hasValidId(s)) return s;
    let id = newPunchId();
    while (existingIds.has(id)) id = newPunchId();
    existingIds.add(id);
    return { ...s, id };
  });

  const fixed = sessions.length - sessions.filter(hasValidId).length;
  if (dryRun) {
    console.log(`[dry-run] ${doc.id}: ${fixed} session(s) without id`);
    usersAffected += 1;
    sessionsMigrated += fixed;
    continue;
  }

  await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(doc.ref);
    const current = fresh.data().sessions;
    if (!Array.isArray(current) || current.every(hasValidId)) return;
    // Re-apply on the freshest state so a punch written mid-migration is
    // never lost — the transaction retries instead.
    const ids = new Set(current.filter(hasValidId).map((s) => s.id));
    transaction.set(doc.ref, {
      sessions: current.map((s) => {
        if (hasValidId(s)) return s;
        let id = newPunchId();
        while (ids.has(id)) id = newPunchId();
        ids.add(id);
        return { ...s, id };
      }),
    }, { merge: true });
  });
  console.log(`✅ ${doc.id}: assigned ${fixed} session id(s)`);
  usersAffected += 1;
  sessionsMigrated += fixed;
}

console.log(dryRun
  ? `Dry run: ${sessionsMigrated} session(s) across ${usersAffected} user(s) would get ids. (${anomalies} anomalie(s))`
  : `Migrated ${sessionsMigrated} session(s) across ${usersAffected} user(s). (${anomalies} anomalie(s))`);
