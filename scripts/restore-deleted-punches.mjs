// scripts/restore-deleted-punches.mjs
// One-off: re-insert deleted punch sessions for one user into the PROD
// Firestore database, following the same invariants as the app
// (src/utils/punchLogic.js) and the backup/audit conventions
// (functions/punch-backup.js, functions/index.js).
//
// Usage:
//   node scripts/restore-deleted-punches.mjs --dry-run   # preview only
//   node scripts/restore-deleted-punches.mjs --apply     # write to prod

import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const SERVICE_ACCOUNT_PATH = "/Users/soufiane/Downloads/service-account.json";
const DATABASE_ID = "prod";
const USER_ID = "U03Ws02Xg8WAu3qeuH1fYHNQbNa2";

const MAX_SESSIONS = 10000; // matches punchLogic.js / firestore.rules
const MAX_NOTE_LEN = 500;

const DELETED_SESSIONS = [
  { note: "Oublier de puncher", punchIn: 1780403400000, punchOut: 1780428600000 },
  { note: "Oublie de puncher ", punchIn: 1780332120000, punchOut: 1780354800000 },
  { note: "Oubliez de puncher ", punchIn: 1780489800000, punchOut: 1780500600000 },
  { note: "", punchIn: 1780578688277, punchOut: 1780599647224 },
  { note: "", punchIn: 1780663984361, punchOut: 1780684257513 },
  { note: "", punchIn: 1781114179510, punchOut: 1781118616857 },
  { note: "", punchIn: 1781182699634, punchOut: 1781206801005 },
  { note: "", punchIn: 1781269259485, punchOut: 1781293213248 },
  { note: "", punchIn: 1782137298102, punchOut: 1782144011551 },
  { note: "", punchIn: 1783961073119, punchOut: 1783983330098 },
  { note: "", punchIn: 1784033771213, punchOut: 1784060358828 },
  { note: "", punchIn: 1784120901727, punchOut: 1784143249682 },
  { note: "", punchIn: 1786380887075, punchOut: 1786385120050 },
  { note: "", punchIn: 1787058026738, punchOut: 1787062327967 },
];

const DRY_RUN = process.argv.includes("--dry-run");
const APPLY = process.argv.includes("--apply");
if (!DRY_RUN && !APPLY) {
  console.error("Refusing to run: pass --dry-run or --apply explicitly.");
  process.exit(1);
}

const toMs = (val) => {
  if (typeof val === "number") return val;
  if (val && typeof val.toMillis === "function") return val.toMillis();
  if (val && typeof val.seconds === "number") return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  return val;
};

// Collision-proof id, same shape as newPunchId() in punchLogic.js.
const newPunchId = (ts) => {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `P-${ts.toString(36).toUpperCase()}-${rand}`;
};

// Overlap check, same semantics as findOverlap() in punchLogic.js
// (touching intervals are NOT overlaps).
const overlaps = (a, b) => a.punchIn < b.punchOut && b.punchIn < a.punchOut;

const fmt = (ts) => new Date(ts).toLocaleString("fr-CA", { timeZone: "America/Montreal" });

async function main() {
  const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
  const app = initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore(app, DATABASE_ID);

  const punchRef = db.collection("punches").doc(USER_ID);

  // Safety backup of the pre-write state, same convention as punch-backup.js.
  if (!DRY_RUN) {
    const preDoc = await punchRef.get();
    const preData = preDoc.data() || { sessions: [] };
    await db.collection("punch_backups").doc(`${USER_ID}_${Date.now()}`).set({
      userId: USER_ID,
      backedUpAt: FieldValue.serverTimestamp(),
      originalData: preData,
      backupReason: "restore_deleted_punches",
    });
    console.log("✅ Backup of pre-write state created in punch_backups");
  }

  const result = await db.runTransaction(async (tx) => {
    const doc = await tx.get(punchRef);
    const existing = Array.isArray(doc.data()?.sessions) ? doc.data().sessions : [];
    const normalized = existing.map((s) => ({
      ...s,
      punchIn: toMs(s.punchIn),
      punchOut: s.punchOut == null ? null : toMs(s.punchOut),
    }));

    if (normalized.length + DELETED_SESSIONS.length > MAX_SESSIONS) {
      throw new Error("PUNCH_DOC_FULL");
    }

    const skipped = [];
    const added = [];
    for (const raw of DELETED_SESSIONS) {
      const session = {
        id: newPunchId(raw.punchIn),
        punchIn: raw.punchIn,
        punchOut: raw.punchOut,
        note: typeof raw.note === "string" ? raw.note.slice(0, MAX_NOTE_LEN) : "",
      };
      if (session.punchOut <= session.punchIn) {
        skipped.push({ session, reason: "INVALID_TIMESTAMP" });
        continue;
      }
      const clash = normalized.find((s) =>
        s.punchOut == null ? session.punchOut > s.punchIn : overlaps(session, s)
      );
      if (clash) {
        skipped.push({ session, reason: `OVERLAPS existing ${clash.id}` });
        continue;
      }
      normalized.push(session);
      added.push(session);
    }

    if (!DRY_RUN) {
      const sessions = normalized.sort((a, b) => a.punchIn - b.punchIn);
      tx.set(punchRef, { sessions });
    }
    return { existingCount: existing.length, added, skipped };
  });

  console.log(`Database: ${DATABASE_ID} | User: ${USER_ID}`);
  console.log(`Existing sessions: ${result.existingCount}`);
  console.log(`\nAdded (${result.added.length}):`);
  for (const s of result.added) {
    console.log(`  + ${s.id}  ${fmt(s.punchIn)} → ${fmt(s.punchOut)}  "${s.note}"`);
  }
  console.log(`\nSkipped (${result.skipped.length}):`);
  for (const { session, reason } of result.skipped) {
    console.log(`  - ${fmt(session.punchIn)} → ${fmt(session.punchOut)}  (${reason})`);
  }

  if (DRY_RUN) {
    console.log("\nDry run — nothing written.");
    return;
  }
  if (result.added.length === 0) {
    console.log("\nNothing to write.");
    return;
  }

  // Explicit audit entry — the auto-trigger only logs single-session writes
  // and would show this bulk restore as "Système".
  await db.collection("auditLogs").add({
    actorId: "script",
    action: "restore",
    collection: "punches",
    entityId: USER_ID,
    entityLabel: "Feuille de temps",
    actorName: "Script de restauration",
    source: "script",
    details: { addedSessions: result.added.length },
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log("\n✅ Done: backup + audit written, sessions merged into prod.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
