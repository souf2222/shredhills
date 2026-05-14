// src/seed.js
// Seeds database with initial data (Firestore profiles + Firebase Auth accounts)
// Run in browser console: window.seedDatabase()

import { db, auth } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

const N = Date.now();

const DEFAULT_PERMISSIONS = {
  canManageUsers: false, canManageOrders: false, canManageContacts: false, canManageEvents: false, canViewEvents: false,
  canManageExpenses: false, canManageAcquisitions: false, canManageDeliveries: false, canManageReports: false,
  canClockIn: false, canViewTasks: false, canSubmitExpenses: false, canSubmitAcquisitions: false,
};

const ADMIN_PERMISSIONS = Object.fromEntries(Object.keys(DEFAULT_PERMISSIONS).map(k => [k, true]));

// Accounts to create. Password is the same as email username for dev simplicity.
const INITIAL_USERS = [
  { email:"admin@shredhills.com", password:"admin123", displayName:"Propriétaire", role:"admin", permissions:ADMIN_PERMISSIONS, pin:"1234", color:"#111" },
];

async function createOrGetAuthUser(email, password) {
  // Try to sign in first (user may already exist)
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { uid: cred.user.uid, created: false };
  } catch (e) {
    if (e.code === "auth/invalid-credential" || e.code === "auth/user-not-found") {
      // Create new account
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      return { uid: cred.user.uid, created: true };
    }
    throw e;
  }
}

export async function seedDatabase() {
  console.log("🌱 Initialisation de la base de données Shredhills…");
  console.log("");

  const createdIds = {};

  // ─── Users + Firebase Auth ──────────────────────────────────────────────
  for (const u of INITIAL_USERS) {
    try {
      const { uid, created } = await createOrGetAuthUser(u.email, u.password);
      createdIds[u.email] = uid;

      // Write profile to Firestore
      await setDoc(doc(db, "users", uid), {
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        permissions: u.permissions,
        color: u.color,
        pin: u.pin,
        createdAt: N,
      });

      // Init empty punches doc
      const punchRef = doc(db, "punches", uid);
      const punchSnap = await getDoc(punchRef);
      if (!punchSnap.exists()) {
        await setDoc(punchRef, { sessions: [] });
      }

      console.log(`✅ ${created ? "Créé" : "Trouvé"}: ${u.displayName} (${u.email})`);
    } catch (e) {
      console.error(`❌ Erreur pour ${u.email}:`, e.message);
    }
  }

  // Sign out of whatever account we ended up on
  await signOut(auth);

  // Sign back in as admin so the rest of the writes are authenticated
  try {
    await signInWithEmailAndPassword(auth, "admin@shredhills.com", "admin123");
  } catch(e) {
    console.warn("Could not sign back in as admin - some writes may fail");
  }

  console.log("");
  console.log("🎉 Initialisation complète !");
  console.log("");
  console.log("═══════════════════════════════════════════════════════");
  console.log("📧 COMPTE CRÉÉ - Utilise cet identifiant pour te connecter:");
  console.log("═══════════════════════════════════════════════════════");
  INITIAL_USERS.forEach(u => {
    console.log(`  ⚙️  ${u.email}  /  ${u.password}`);
  });
  console.log("═══════════════════════════════════════════════════════");
  console.log("");
  console.log("🔁 Tu es maintenant connecté en tant qu'admin. Rafraîchis la page !");
  return true;
}

if (typeof window !== "undefined") {
  window.seedDatabase = seedDatabase;
}
