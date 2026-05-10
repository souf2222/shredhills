// src/migratePermissions.js
// Exécute dans la console navigateur: window.migratePermissions()
// ou importe et appelle migratePermissions() depuis n'importe où.

import { db } from "./firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const NEW_PERMISSIONS_DEFAULTS = {
  canSubmitAcquisitions: false,
  canManageAcquisitions: false,
};

export async function migratePermissions() {
  console.log("🔄 Migration des permissions…");

  const snap = await getDocs(collection(db, "users"));
  const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  let updated = 0;

  for (const user of users) {
    const currentPerms = user.permissions || {};
    let needsUpdate = false;
    const newPerms = { ...currentPerms };

    // Ajoute les nouvelles permissions si elles manquent
    for (const [key, defaultValue] of Object.entries(NEW_PERMISSIONS_DEFAULTS)) {
      if (!(key in newPerms)) {
        newPerms[key] = defaultValue;
        needsUpdate = true;
      }
    }

    // Règles intelligentes basées sur les permissions existantes
    if (!("canSubmitAcquisitions" in currentPerms)) {
      // Si l'employé peut soumettre des dépenses, il peut aussi soumettre des acquisitions
      if (currentPerms.canSubmitExpenses) {
        newPerms.canSubmitAcquisitions = true;
        needsUpdate = true;
      }
    }

    if (!("canManageAcquisitions" in currentPerms)) {
      // Si l'utilisateur peut gérer les dépenses, il peut aussi gérer les acquisitions
      if (currentPerms.canManageExpenses || user.role === "admin") {
        newPerms.canManageAcquisitions = true;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await updateDoc(doc(db, "users", user.id), {
        permissions: newPerms,
      });
      console.log(`✅ ${user.displayName || user.email} mis à jour`);
      updated++;
    } else {
      console.log(`⏭️ ${user.displayName || user.email} déjà à jour`);
    }
  }

  console.log(`\n🎉 Migration terminée ! ${updated} utilisateur(s) mis à jour sur ${users.length}.`);
  console.log("🔁 Rafraîchis la page pour voir les nouveaux onglets.");
  return { updated, total: users.length };
}

if (typeof window !== "undefined") {
  window.migratePermissions = migratePermissions;
}
