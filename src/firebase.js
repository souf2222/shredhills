// ─────────────────────────────────────────────────────────────────────────────
// src/firebase.js
//
// AUTHENTICATION: Email/Password (Firebase handles hashing)
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, deleteApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

const firebaseConfig = {
  apiKey:            requiredEnv("REACT_APP_FIREBASE_API_KEY"),
  authDomain:        requiredEnv("REACT_APP_FIREBASE_AUTH_DOMAIN"),
  projectId:         requiredEnv("REACT_APP_FIREBASE_PROJECT_ID"),
  storageBucket:     requiredEnv("REACT_APP_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requiredEnv("REACT_APP_FIREBASE_MESSAGING_SENDER_ID"),
  appId:             requiredEnv("REACT_APP_FIREBASE_APP_ID")
};

const app     = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

export const loginWithEmail = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential;
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN USER PROVISIONING
//
// Why this exists:
//   `createUserWithEmailAndPassword` ALWAYS signs the new user in on the
//   Auth instance it's called against. If we used the main app's auth, the
//   admin doing the provisioning would be silently logged out and replaced
//   by the freshly created (low-privilege) user.
//
// How it works:
//   We spin up a *secondary* Firebase app instance with the same config but
//   a unique name. It has its own isolated Auth state, so creating a user
//   there leaves the primary app's session (and the admin's identity) intact.
//   We sign out and tear the secondary app down right after to free resources.
//
// The proper long-term solution is to do this server-side via the Admin SDK
// (no auto sign-in there), but this client-only workaround is solid enough
// for an admin UI.
// ─────────────────────────────────────────────────────────────────────────────
export const createAuthUserKeepingSession = async (email, password, displayName) => {
  // Unique name so concurrent calls don't collide.
  const tempName = `provisioner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tempApp  = initializeApp(firebaseConfig, tempName);
  const tempAuth = getAuth(tempApp);

  try {
    const cred = await createUserWithEmailAndPassword(tempAuth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    // Capture the uid before we tear the temp instance down.
    const uid = cred.user.uid;
    return { uid, email: cred.user.email };
  } finally {
    // Best-effort cleanup. Errors here aren't actionable.
    try { await signOut(tempAuth); } catch {}
    try { await deleteApp(tempApp); } catch {}
  }
};

export const logout = () => signOut(auth);

// Reauthenticate current user with email + current password.
// Required by Firebase before sensitive actions (password / email change).
export const reauthenticate = async (currentPassword) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("Utilisateur non connecté.");
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  return reauthenticateWithCredential(user, cred);
};

// Change password (caller must reauthenticate first).
export const changePassword = async (newPassword) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Utilisateur non connecté.");
  return updatePassword(user, newPassword);
};

// Send a verification link to the NEW email address.
// The email is only actually changed once the user clicks the link.
export const requestEmailChange = async (newEmail) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Utilisateur non connecté.");
  return verifyBeforeUpdateEmail(user, newEmail);
};

// Send a password-reset email (fallback, no reauth needed).
export const sendPasswordReset = (email) => sendPasswordResetEmail(auth, email);

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a purchase receipt photo to Storage under purchases/{purchaseId}/.
 * Returns { url, path } so the caller can store both on the Firestore doc.
 */
export const uploadExpensePhoto = async (file, expenseId) => {
  if (!file || !expenseId) throw new Error("Fichier ou ID manquant.");
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
  const path = `purchases/${expenseId}/${Date.now()}.${ext}`;
  const sref = ref(storage, path);
  await uploadBytes(sref, file, { contentType: file.type || "image/jpeg" });
  const url = await getDownloadURL(sref);
  return { url, path };
};

/** Safely delete a file in Storage from its full path. No-op if path is falsy. */
export const deleteStorageFile = async (path) => {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    // Ignore "object-not-found" and permission errors so deleting a Firestore
    // doc is never blocked by a stale/missing Storage file.
    if (err?.code !== "storage/object-not-found" && err?.code !== "storage/unauthorized") throw err;
    // eslint-disable-next-line no-console
    console.warn("Storage delete skipped:", err.code, path);
  }
};

export { onAuthStateChanged, updateProfile };
export default app;
