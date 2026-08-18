import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { databaseId } from "./database-id.mjs";

if (!process.argv.includes("--confirm-reviewed")) {
  throw new Error("Review every user profile first, then rerun with --confirm-reviewed.");
}

const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? undefined
  : process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : undefined;

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: serviceAccount ? cert(serviceAccount) : applicationDefault() });

const permissions = [
  "canManageUsers", "canManageOrders", "canManageContacts", "canManageEvents",
  "canManageDeliveries", "canManageExpenses", "canManageAcquisitions", "canManageReports",
  "canViewEvents", "canViewDeliveries", "canViewTasks", "canClockIn",
  "canSubmitExpenses", "canSubmitAcquisitions",
];
const auth = getAuth();
const db = getFirestore(app, databaseId);
const users = await db.collection("users").get();
const writer = db.bulkWriter();

for (const profile of users.docs) {
  const data = profile.data();
  const role = data.role === "admin" ? "admin" : "user";
  const claimedPermissions = Object.fromEntries(
    permissions.map((permission) => [permission, role === "admin" || data.permissions?.[permission] === true])
  );
  await auth.setCustomUserClaims(profile.id, { role, permissions: claimedPermissions });
  writer.update(profile.ref, {
    pin: FieldValue.delete(),
  });
}

await writer.close();
console.log(`Migrated custom claims for ${users.size} user profiles. Users must sign out and back in.`);
