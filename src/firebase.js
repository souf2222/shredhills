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
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID
};

const app     = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
