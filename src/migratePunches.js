// src/migratePunches.js
// Run in browser console (while logged in as admin): window.migratePunches()
// Or import and call migratePunches() from anywhere in the app.

import { db } from "./firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

const MAPPING = {
  "ADMIN-000": "vh23GSwDoReBscxJNefeF9Mhvn82",
  "COMPTA-000": "SFCoPcy1cfh7qdW60aGAJUV6k5m2",
  "EMP-001": "6G8WXPvNRUMH1D83CdKqbRBlnVm2",
  "EMP-002": "umLKTIg5jaQvKMsTkZArI2TBes52",
  "EMP-003": "du5tynXzYZVg5CzrHirf8hpzs3M2",
  "LIV-001": "U03Ws02Xg8WAu3qeuH1fYHNQbNa2",
};

export async function migratePunches() {
  console.log("🔄 Migration des pointages (punches) vers les nouveaux utilisateurs…\n");

  let moved = 0;
  let skipped = 0;
  let removed = 0;

  for (const [oldId, newId] of Object.entries(MAPPING)) {
    const oldRef = doc(db, "punches", oldId);
    const newRef = doc(db, "punches", newId);

    try {
      const [oldSnap, newSnap] = await Promise.all([getDoc(oldRef), getDoc(newRef)]);

      const oldSessions = oldSnap.exists() ? oldSnap.data().sessions || [] : [];
      const newSessions = newSnap.exists() ? newSnap.data().sessions || [] : [];

      if (oldSessions.length === 0) {
        console.log(`⏭️  ${oldId} → ${newId} : aucune session à migrer`);
        skipped++;
        continue;
      }

      // Merge sessions, remove potential duplicates by id, sort by punchIn
      const mergedMap = new Map([
        ...newSessions.map((s) => [s.id, s]),
        ...oldSessions.map((s) => [s.id, s]),
      ]);
      const merged = Array.from(mergedMap.values()).sort((a, b) => {
        const ta = typeof a.punchIn === "number" ? a.punchIn : 0;
        const tb = typeof b.punchIn === "number" ? b.punchIn : 0;
        return ta - tb;
      });

      await setDoc(newRef, { sessions: merged });
      console.log(`✅ ${oldId} → ${newId} : ${oldSessions.length} session(s) migrée(s) (total: ${merged.length})`);
      moved++;

      // Delete the old document
      await deleteDoc(oldRef);
      console.log(`🗑️  Document punches/${oldId} supprimé`);
      removed++;
    } catch (err) {
      console.error(`❌ Erreur pour ${oldId} → ${newId} :`, err.message);
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log(`🎉 Migration terminée !`);
  console.log(`   ${moved} document(s) migré(s)`);
  console.log(`   ${removed} ancien(s) document(s) supprimé(s)`);
  console.log(`   ${skipped} document(s) vides / ignoré(s)`);
  console.log("═══════════════════════════════════════════════════");

  return { moved, removed, skipped };
}

if (typeof window !== "undefined") {
  window.migratePunches = migratePunches;
}
