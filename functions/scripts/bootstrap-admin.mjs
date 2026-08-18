import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { databaseId } from "./database-id.mjs";

const [email] = process.argv.slice(2);
if (!email) {
  throw new Error("Usage: node scripts/bootstrap-admin.mjs <admin-email>");
}

const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? undefined
  : process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : undefined;

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: serviceAccount ? cert(serviceAccount) : applicationDefault() });

const auth = getAuth();
const db = getFirestore(app, databaseId);
const user = await auth.getUserByEmail(email);
const permissions = {
  canManageUsers: true,
  canManageOrders: true,
  canManageContacts: true,
  canManageEvents: true,
  canManageDeliveries: true,
  canManageExpenses: true,
  canManageAcquisitions: true,
  canManageReports: true,
  canManageSupplierOrders: true,
  canViewEvents: true,
  canViewDeliveries: true,
  canViewTasks: true,
  canClockIn: true,
  canSubmitExpenses: true,
  canSubmitAcquisitions: true,
};

await auth.setCustomUserClaims(user.uid, { role: "admin", permissions });
await db.collection("users").doc(user.uid).set({
  email: user.email,
  displayName: user.displayName || email,
  color: "#111111",
  createdAt: FieldValue.serverTimestamp(),
}, { merge: true });

console.log(`Granted administrator claims to ${email}. Ask the user to sign out and back in.`);
