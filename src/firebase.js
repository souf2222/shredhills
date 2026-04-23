// ─────────────────────────────────────────────────────────────────────────────
// src/firebase.js
//
// INSTRUCTIONS DE CONFIGURATION :
//
// 1. Va sur https://console.firebase.google.com
// 2. Clique "Créer un projet" → nomme-le "shredhills"
// 3. Dans le projet : clique l'icône </> (Web app) → enregistre l'app
// 4. Copie les valeurs de firebaseConfig ci-dessous
// 5. Dans Firebase Console :
//    - Va dans "Firestore Database" → Créer une base de données (mode production)
//    - Va dans "Authentication" → (optionnel, pas nécessaire pour cette app)
//    - Va dans "Storage" → Activer (pour les photos et signatures)
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAgmn-1BSdCrfR2eU2p8C5k2hg6K-o0eP8",
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "shredhills-5dc27.firebaseapp.com",
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID || "shredhills-5dc27",
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "shredhills-5dc27.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "402341934400",
  appId:             process.env.REACT_APP_FIREBASE_APP_ID || "1:402341934400:web:43b2e90eb176db2df936a5"
};

const app     = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
