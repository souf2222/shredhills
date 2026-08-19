import { readFile } from "node:fs/promises";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const rules = await readFile("firestore.rules", "utf8");
const testEnv = await initializeTestEnvironment({
  projectId: "shredhills-security-test",
  firestore: { rules },
});

const employeeClaims = {
  role: "user",
  permissions: { canSubmitExpenses: true },
};

const supplierClaims = {
  role: "supplier",
  supplierId: "seatcraft",
  permissions: {},
};

const adminClaims = {
  role: "admin",
  permissions: { canManageSupplierOrders: true },
};

const strippedAdminClaims = {
  role: "admin",
  permissions: {},
};

try {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "employee"), { displayName: "Employee" });
    await setDoc(doc(db, "users", "other-user"), { displayName: "Other User" });
    await setDoc(doc(db, "purchases", "other-expense"), { empId: "other-user", status: "pending" });
    // Supplier portal seed data
    await setDoc(doc(db, "suppliers", "seatcraft"), { companyName: "SeatCraft" });
    await setDoc(doc(db, "suppliers", "other-co"), { companyName: "Other Co" });
    await setDoc(doc(db, "supplierOrders", "own-order"), {
      supplierId: "seatcraft",
      orderNumber: "SHO-1",
      status: "paid",
      customer: { name: "Client A" },
    });
    await setDoc(doc(db, "supplierOrders", "other-order"), {
      supplierId: "other-co",
      orderNumber: "SHO-2",
      status: "paid",
      customer: { name: "Client B" },
    });
  });

  const employee = testEnv.authenticatedContext("employee", employeeClaims).firestore();
  const supplier = testEnv.authenticatedContext("supplier", supplierClaims).firestore();
  const supplierUser = testEnv.authenticatedContext("supplier", supplierClaims);
  const unauthenticated = testEnv.unauthenticatedContext().firestore();

  // ── Existing fixtures ────────────────────────────────────────────────────
  await assertFails(getDoc(doc(unauthenticated, "users", "employee")));
  await assertFails(updateDoc(doc(employee, "users", "employee"), { role: "admin" }));
  await assertFails(setDoc(doc(employee, "auditLogs", "forged"), { actorId: "employee" }));
  await assertFails(getDoc(doc(employee, "auditLogs", "any")));
  await assertFails(getDoc(doc(employee, "purchases", "other-expense")));
  await assertFails(setDoc(doc(employee, "purchases", "forged-expense"), {
    empId: "other-user",
    status: "pending",
  }));
  await assertSucceeds(setDoc(doc(employee, "purchases", "own-expense"), {
    empId: "employee",
    status: "pending",
  }));

  // ── Audit logs are reserved to admins ─────────────────────────────────────
  // canManageUsers is derived from the role: not even a user carrying a stale
  // canManageUsers claim may read the logs.
  const historyUser = testEnv.authenticatedContext("history-user", {
    role: "user",
    permissions: { canManageUsers: true },
  }).firestore();
  await assertFails(getDoc(doc(historyUser, "auditLogs", "any")));
  const strippedAdmin = testEnv.authenticatedContext("audit-admin", strippedAdminClaims).firestore();
  await assertSucceeds(getDoc(doc(strippedAdmin, "auditLogs", "any")));

  // ── Supplier isolation (D1, D2, D3) ───────────────────────────────────────
  // D1: a supplier cannot read the internal users directory (only their own).
  await assertFails(getDoc(doc(supplier, "users", "other-user")));
  await assertSucceeds(getDoc(doc(supplier, "users", "supplier")));
  // D2: a supplier cannot read purchaseCategories.
  await assertFails(getDoc(doc(supplier, "purchaseCategories", "any")));

  // Supplier reads only its own orders.
  await assertSucceeds(getDoc(doc(supplier, "supplierOrders", "own-order")));
  await assertFails(getDoc(doc(supplier, "supplierOrders", "other-order")));

  // Supplier cannot write supplierOrders directly — every mutation must flow
  // through the updateSupplierOrder callable (tamper-proof history).
  await assertFails(setDoc(doc(supplier, "supplierOrders", "own-order"), { status: "shipped" }, { merge: true }));
  await assertFails(setDoc(doc(supplier, "supplierOrders", "forged"), { supplierId: "seatcraft" }));
  await assertFails(updateDoc(doc(supplier, "supplierOrders", "own-order"), { status: "shipped" }));

  // Supplier cannot discover the suppliers directory.
  await assertFails(getDoc(doc(supplier, "suppliers", "seatcraft")));

  // A supplier with no supplierId claim cannot read any order.
  const claimlessSupplier = testEnv.authenticatedContext("claimless", { role: "supplier", permissions: {} }).firestore();
  await assertFails(getDoc(doc(claimlessSupplier, "supplierOrders", "own-order")));

  // Admin with the right permission has full access to supplierOrders & suppliers.
  const admin = testEnv.authenticatedContext("admin", adminClaims).firestore();
  await assertSucceeds(getDoc(doc(admin, "supplierOrders", "own-order")));
  await assertSucceeds(getDoc(doc(admin, "suppliers", "seatcraft")));

  // Admin permissions are enforced too: an admin without
  // canManageSupplierOrders cannot read the supplier data.
  const strippedAdmin = testEnv.authenticatedContext("stripped-admin", strippedAdminClaims).firestore();
  await assertFails(getDoc(doc(strippedAdmin, "supplierOrders", "own-order")));
  await assertFails(getDoc(doc(strippedAdmin, "suppliers", "seatcraft")));

  console.log("Firestore security rules tests passed");
} finally {
  await testEnv.cleanup();
}
