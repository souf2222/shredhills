// src/seed.js
// Script de démarrage — peuple Firebase avec les données initiales
// Lance UNE SEULE FOIS depuis l'app en cliquant le bouton "Initialiser" sur la page de login
// OU exécute depuis la console du navigateur : window.seedDatabase()

import { db } from "./firebase";
import { doc, setDoc, collection, addDoc, getDocs } from "firebase/firestore";

const DAY = 86400000;
const N = Date.now();

const INITIAL_USERS = [
  { id:"ADMIN-000",  name:"Propriétaire", role:"admin",      pin:"1234", color:"#111" },
  { id:"COMPTA-000", name:"Comptable",    role:"accountant", pin:"5678", color:"#007AFF" },
  { id:"EMP-001",    name:"Alexandre",    role:"employee",   pin:"0001", color:"#FF6B35" },
  { id:"EMP-002",    name:"Marika",       role:"employee",   pin:"0002", color:"#007AFF" },
  { id:"EMP-003",    name:"Jordan",       role:"employee",   pin:"0003", color:"#34C759" },
  { id:"LIV-001",    name:"Kevin",        role:"driver",     pin:"9999", color:"#AF52DE" },
];

const INITIAL_ORDERS = [
  { id:"CMD-001", clientName:"Sophie Tremblay", clientEmail:"sophie@example.com",
    description:"50x t-shirts blanc — logo devant, texte dos",
    assignedTo:"EMP-001", status:"pending", startTime:null, endTime:null,
    elapsed:0, createdAt:N-DAY, deadline:N+4*DAY },
  { id:"CMD-002", clientName:"Marc Bouchard", clientEmail:"marc@example.com",
    description:"12x hoodies noir — impression sérigraphie",
    assignedTo:"EMP-002", status:"pending", startTime:null, endTime:null,
    elapsed:0, createdAt:N-2*DAY, deadline:N+2*DAY },
];

const INITIAL_STOPS = [
  { id:"STOP-001", type:"delivery", assignedTo:"LIV-001",
    clientName:"Sophie Tremblay", clientPhone:"514-555-0101",
    address:"1234 rue Sainte-Catherine, Montréal, QC",
    instructions:"Sonner 2 fois. Laisser au concierge si absent.",
    orderId:"CMD-001", status:"pending",
    completedAt:null, photoUrl:null, signatureUrl:null, note:"",
    createdAt: N },
];

export async function seedDatabase() {
  console.log("🌱 Initialisation de la base de données...");

  // Users
  for (const user of INITIAL_USERS) {
    await setDoc(doc(db, "users", user.id), user);
    // Init punch doc vide
    await setDoc(doc(db, "punches", user.id), { sessions: [] }, { merge: true });
    console.log(`✅ User: ${user.name}`);
  }

  // Orders
  for (const order of INITIAL_ORDERS) {
    await setDoc(doc(db, "orders", order.id), order);
    console.log(`✅ Order: ${order.id}`);
  }

  // Stops
  for (const stop of INITIAL_STOPS) {
    await setDoc(doc(db, "stops", stop.id), stop);
    console.log(`✅ Stop: ${stop.id}`);
  }

  console.log("🎉 Base de données initialisée avec succès !");
  return true;
}

// Accessible depuis la console du navigateur
window.seedDatabase = seedDatabase;
