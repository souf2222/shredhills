// src/seed.js
// Seeds database with initial data (Firestore profiles + Firebase Auth accounts)
// Run in browser console: window.seedDatabase()

import { db, auth } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

const DAY = 86400000;
const N = Date.now();

const DEFAULT_PERMISSIONS = {
  canManageUsers: false, canManageOrders: false, canManageContacts: false, canManageEvents: false, canViewEvents: false,
  canManageExpenses: false, canManageAcquisitions: false, canManageDeliveries: false, canManageReports: false,
  canClockIn: false, canViewTasks: false, canSubmitExpenses: false, canSubmitAcquisitions: false,
};

const ADMIN_PERMISSIONS = Object.fromEntries(Object.keys(DEFAULT_PERMISSIONS).map(k => [k, true]));

const ACCOUNTANT_PERMISSIONS = {
  ...DEFAULT_PERMISSIONS,
  canManageUsers: true, canManageExpenses: true, canManageAcquisitions: true, canManageContacts: true, canViewEvents: true,
  canManageReports: true, canClockIn: true, canSubmitExpenses: true, canSubmitAcquisitions: true,
};

const EMPLOYEE_PERMISSIONS = {
  ...DEFAULT_PERMISSIONS,
  canClockIn: true, canViewTasks: true, canSubmitExpenses: true, canSubmitAcquisitions: true, canViewEvents: true,
};

const DRIVER_PERMISSIONS = {
  ...DEFAULT_PERMISSIONS,
  canManageDeliveries: true, canClockIn: true, canViewEvents: true,
};

// Accounts to create. Password is the same as email username for dev simplicity.
const INITIAL_USERS = [
  { email:"admin@shredhills.com",     password:"admin123", displayName:"Propriétaire", role:"admin", permissions:ADMIN_PERMISSIONS,      pin:"1234", color:"#111" },
  { email:"compta@shredhills.com",    password:"compta123",displayName:"Comptable",    role:"user",  permissions:ACCOUNTANT_PERMISSIONS, pin:"5678", color:"#007AFF" },
  { email:"alexandre@shredhills.com", password:"emp1234",  displayName:"Alexandre",    role:"user",  permissions:EMPLOYEE_PERMISSIONS,   pin:"0001", color:"#FF6B35" },
  { email:"marika@shredhills.com",    password:"emp1234",  displayName:"Marika",       role:"user",  permissions:EMPLOYEE_PERMISSIONS,   pin:"0002", color:"#007AFF" },
  { email:"jordan@shredhills.com",    password:"emp1234",  displayName:"Jordan",       role:"user",  permissions:EMPLOYEE_PERMISSIONS,   pin:"0003", color:"#34C759" },
  { email:"kevin@shredhills.com",     password:"driver123",displayName:"Kevin",        role:"user",  permissions:DRIVER_PERMISSIONS,     pin:"9999", color:"#AF52DE" },
];

const INITIAL_EVENTS = [
  { id:"EVT-001", title:"Réunion d'équipe",    subtitle:"Point hebdomadaire", description:"Point hebdomadaire avec tout le personnel", icon:"🤝", startDate:N+DAY,     endDate:N+DAY+3600000,      allDay:false, location:"Bureau principal",   color:"#007AFF", assignedTo:[], createdBy:"system" },
  { id:"EVT-002", title:"Formation sécurité",   subtitle:"Protocoles 2026",   description:"Formation sur les protocoles de sécurité",  icon:"⚙️", startDate:N+3*DAY,   endDate:N+3*DAY+7200000,    allDay:false, location:"Salle de formation", color:"#FF9500", assignedTo:[], createdBy:"system" },
  { id:"EVT-003", title:"Show Fracas",          subtitle:"Harley Becancour",  description:"Événement promotionnel",                     icon:"🏍",startDate:N+7*DAY,   endDate:N+7*DAY+3*3600000,  allDay:false, location:"Bécancour, QC",      color:"#AF52DE", assignedTo:[], createdBy:"system" },
  { id:"EVT-004", title:"Famille-chalet",       subtitle:"Weekend famille",   description:"Séjour au chalet",                            icon:"🏕",startDate:N+60*DAY,  endDate:N+62*DAY,           allDay:true,  location:"Estrie",             color:"#FF2D55", assignedTo:[], createdBy:"system" },
];

const INITIAL_CONTACTS = [
  { id:"CNT-001", name:"Sophie Tremblay", email:"sophie@example.com", phone:"514-555-0101", company:"Tremblay Design", street:"1234 rue Ste-Catherine", city:"Montréal", province:"QC", postalCode:"H3G 1R6", country:"CA", type:"client", notes:"Cliente régulière, préfère le contact par courriel" },
  { id:"CNT-002", name:"Marc Bouchard", email:"marc@example.com", phone:"514-555-0202", company:"Bouchard Sports", street:"5678 boul. René-Lévesque", city:"Montréal", province:"QC", postalCode:"H2L 2L5", country:"CA", type:"client", notes:"" },
  { id:"CNT-003", name:"Textiles Plus Inc.", email:"commandes@textilesplus.ca", phone:"450-555-0303", company:"Textiles Plus", street:"1000 rue Industrielle", city:"Laval", province:"QC", postalCode:"H7V 4A3", country:"CA", type:"supplier", notes:"Fournisseur principal de t-shirts en vrac" },
  { id:"CNT-004", name:"Encres Québec", email:"info@encresqc.com", phone:"418-555-0404", company:"Encres Québec", street:"55 av. des Encres", city:"Québec", province:"QC", postalCode:"G1R 1A1", country:"CA", type:"supplier", notes:"Encres sérigraphie 4 couleurs CMJN" },
  { id:"CNT-005", name:"Studio Graphix", email:"contact@studiographix.ca", phone:"514-555-0505", company:"Studio Graphix", street:"200 boul. Saint-Laurent", city:"Montréal", province:"QC", postalCode:"H2Y 2Y5", country:"CA", type:"partner", notes:"Partenaire pour les designs vectoriels" },
];

const INITIAL_ORDERS = [
  { id:"CMD-001", clientName:"Sophie Tremblay", clientEmail:"sophie@example.com", contactId:"CNT-001", description:"50x t-shirts blanc — logo devant, texte dos", assignedTo:null, status:"pending", startTime:null, endTime:null, elapsed:0, deadline:N+4*DAY },
  { id:"CMD-002", clientName:"Marc Bouchard",  clientEmail:"marc@example.com",   contactId:"CNT-002", description:"12x hoodies noir — impression sérigraphie",   assignedTo:null, status:"pending", startTime:null, endTime:null, elapsed:0, deadline:N+2*DAY },
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

  // ─── Events ─────────────────────────────────────────────────────────────
  for (const ev of INITIAL_EVENTS) {
    await setDoc(doc(db, "events", ev.id), { ...ev, createdAt: N, updatedAt: N });
    console.log(`📅 Événement: ${ev.title}`);
  }

  // ─── Contacts ───────────────────────────────────────────────────────────
  for (const c of INITIAL_CONTACTS) {
    await setDoc(doc(db, "contacts", c.id), { ...c, createdAt: N, updatedAt: N, createdBy: "system" });
    console.log(`📇 Contact: ${c.name} (${c.type})`);
  }

  // ─── Orders (assign to first employee if available) ─────────────────────
  const firstEmployee = createdIds["alexandre@shredhills.com"];
  for (const order of INITIAL_ORDERS) {
    await setDoc(doc(db, "orders", order.id), {
      ...order,
      assignedTo: firstEmployee || null,
      createdAt: N,
    });
    console.log(`📦 Commande: ${order.id}`);
  }

  console.log("");
  console.log("🎉 Initialisation complète !");
  console.log("");
  console.log("═══════════════════════════════════════════════════════");
  console.log("📧 COMPTES CRÉÉS - Utilise ces identifiants pour te connecter:");
  console.log("═══════════════════════════════════════════════════════");
  INITIAL_USERS.forEach(u => {
    console.log(`  ${u.role === "admin" ? "⚙️" : "👤"}  ${u.email}  /  ${u.password}`);
  });
  console.log("═══════════════════════════════════════════════════════");
  console.log("");
  console.log("🔁 Tu es maintenant connecté en tant qu'admin. Rafraîchis la page !");
  return true;
}

if (typeof window !== "undefined") {
  window.seedDatabase = seedDatabase;
}
