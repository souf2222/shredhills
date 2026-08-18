// ─────────────────────────────────────────────────────────────────────────────
// src/firebase.js
//
// AUTHENTICATION: Email/Password (Firebase handles hashing)
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  updatePassword,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
const requiredEnv = (name) => {
  const value = import.meta.env[name] || import.meta.env[name.replace("VITE_", "REACT_APP_")];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

const firebaseConfig = {
  apiKey:            requiredEnv("VITE_FIREBASE_API_KEY"),
  authDomain:        requiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId:         requiredEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket:     requiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId:             requiredEnv("VITE_FIREBASE_APP_ID")
};

const app     = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app, requiredEnv("VITE_FIREBASE_DB"));
export const storage = getStorage(app);
const functions = getFunctions(app);

// The Firestore database this build connects to. Cloud Functions are
// multi-database aware and receive this value in every callable payload so
// they operate on the same DB the client is reading from. A supplier account
// created in prod therefore has its profile written to `prod`, never to
// `dev-db`, and vice versa.
export const currentDatabaseId = requiredEnv("VITE_FIREBASE_DB");

export const loginWithEmail = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const createManagedUser = (data) => httpsCallable(functions, "createManagedUser")({ databaseId: currentDatabaseId, ...data });
export const updateManagedUser = (data) => httpsCallable(functions, "updateManagedUser")({ databaseId: currentDatabaseId, ...data });
export const disableManagedUser = (uid) => httpsCallable(functions, "disableManagedUser")({ databaseId: currentDatabaseId, uid });

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
 * Upload a purchase receipt photo to a submitter-owned Storage path.
 * Returns { url, path } so the caller can store both on the Firestore doc.
 */
export const uploadExpensePhoto = async (file, expenseId) => {
  if (!file || !expenseId) throw new Error("Fichier ou ID manquant.");
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Utilisateur non connecté.");
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
  const path = `purchases/${uid}/${expenseId}/${Date.now()}.${ext}`;
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

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER PORTAL STORAGE HELPERS
// Paths are always keyed by the supplier's id so Storage rules can authorize
// downloads via the supplierId custom claim (Storage rules cannot read
// Firestore). We never persist a long-lived getDownloadURL — it is resolved at
// view time so rules are evaluated on each request.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a supplier order file (shipping label or attachment) for an admin.
 * Returns { path } only — the caller stores the path, not a download URL.
 */
export const uploadSupplierOrderFile = async (file, supplierId, orderId, category = "labels") => {
  if (!file || !supplierId || !orderId) throw new Error("file, supplierId and orderId are required.");
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("You must be signed in.");
  const ext = (file.name?.split(".").pop() || "pdf").toLowerCase();
  const folder = category === "attachments" ? "attachments" : "labels";
  const path = `supplierOrders/${supplierId}/${orderId}/${folder}/${Date.now()}.${ext}`;
  const sref = ref(storage, path);
  await uploadBytes(sref, file, { contentType: file.type || "application/pdf" });
  return { path };
};

/** Resolve a short-lived download URL for a stored supplier file path. */
export const resolveStorageUrl = async (path) => {
  if (!path) return null;
  return getDownloadURL(ref(storage, path));
};

// Supplier portal callable.
export const updateSupplierOrder = (data) => httpsCallable(functions, "updateSupplierOrder")({ databaseId: currentDatabaseId, ...data });

export { updateProfile };
export default app;
