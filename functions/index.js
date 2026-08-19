const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { onDocumentWrittenWithAuthContext } = require("firebase-functions/v2/firestore");
const { defineString } = require("firebase-functions/params");
const { punchSessionAuditAction } = require("./audit");
const { backupPunchData, restoreFromLatestBackup } = require("./punch-backup");
const {
  SUPPLIER_STATUSES,
  SUPPLIER_TRANSITIONS,
  SUPPLIER_ALLOWED_NEXT,
} = require("./supplierOrders");

const app = initializeApp();

// Cloud Functions operate on the single Firestore database selected by
// VITE_FIREBASE_DB in the root .env at deploy time (regenerated into
// functions/.env by scripts/sync-functions-env.mjs). No default: a deploy
// without the value must fail loudly rather than silently pick a database.
// Switching VITE_FIREBASE_DB requires redeploying the functions.
const DB = defineString("FIRESTORE_DATABASE_ID");

const DATABASES = () => [DB.value()];
const getDatabase = (id) => {
  if (typeof id !== "string" || !DATABASES().includes(id)) {
    throw new HttpsError(
      "invalid-argument",
      `Unknown database: ${id}. Functions are configured for '${DB.value()}'. ` +
      "Update VITE_FIREBASE_DB in the root .env and redeploy the functions."
    );
  }
  return getFirestore(app, id);
};
const databaseIdFrom = (data, fallback) => {
  const id = typeof data?.databaseId === "string" ? data.databaseId : fallback;
  if (!DATABASES().includes(id)) {
    throw new HttpsError(
      "invalid-argument",
      `Unknown database: ${id}. Functions are configured for '${DB.value()}'. ` +
      "Update VITE_FIREBASE_DB in the root .env and redeploy the functions."
    );
  }
  return id;
};
const auth = getAuth();

const PERMISSIONS = [
  "canManageUsers",
  "canManageOrders",
  "canManageContacts",
  "canManageEvents",
  "canManageDeliveries",
  "canManageExpenses",
  "canManageAcquisitions",
  "canManageReports",
  "canManageSupplierOrders",
  "canViewEvents",
  "canViewDeliveries",
  "canViewTasks",
  "canClockIn",
  "canSubmitExpenses",
  "canSubmitAcquisitions",
];
const AUDIT_EXCLUDED_FIELDS = new Set(["id", "createdAt", "updatedAt", "pin"]);
const ROLES = ["admin", "user", "supplier"];

function cleanAuditValue(value) {
  if (Array.isArray(value)) return value.map(cleanAuditValue);
  if (value && typeof value === "object" && typeof value.toMillis !== "function") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, entry]) => !AUDIT_EXCLUDED_FIELDS.has(key) && entry !== undefined)
        .map(([key, entry]) => [key, cleanAuditValue(entry)])
    );
  }
  return value;
}

function auditValuesMatch(before, after) {
  const comparable = (value) => {
    if (value && typeof value.toMillis === "function") return `timestamp:${value.toMillis()}`;
    return JSON.stringify(value);
  };
  return comparable(before) === comparable(after);
}

function auditChanges(before = {}, after = {}) {
  const previous = cleanAuditValue(before);
  const next = cleanAuditValue(after);
  const changes = {};
  for (const key of new Set([...Object.keys(previous), ...Object.keys(next)])) {
    if (!auditValuesMatch(previous[key], next[key])) {
      changes[key] = { before: previous[key] ?? null, after: next[key] ?? null };
    }
  }
  return changes;
}

function auditEntityLabel(collection, data, id) {
  const labels = {
    contacts: "Contact", orders: "Commande", stops: "Arret", punches: "Feuille de temps",
    purchases: "Depense", events: "Evenement", acquisitions: "Demande d'achat",
    users: "Utilisateur", supplierOrders: "Commande fournisseur", suppliers: "Fournisseur",
  };
  const name = data?.displayName || data?.name || data?.companyName ||
    data?.clientName || data?.orderNumber || data?.title || data?.itemName ||
    data?.label || data?.description;
  return name ? `${labels[collection] || collection}: ${name}` : `${labels[collection] || collection} #${id}`;
}

function requireAdmin(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication is required.");
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Administrator access is required.");
  }
}

// Input hardening helpers. Cloud Function callables accept arbitrary client
// input, so every persisted field is clamped to a sane type + length to stop
// oversized payloads, weird types, or injection of unexpected nested keys.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function clampStr(value, max) {
  return typeof value === "string" ? value.slice(0, max) : "";
}
function clampInt(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function sanitizeAccess(data, supplierId) {
  if (!data || !ROLES.includes(data.role)) {
    throw new HttpsError("invalid-argument", "A valid role is required.");
  }

  if (data.role === "supplier") {
    if (typeof supplierId !== "string" || !supplierId || supplierId.length > 100) {
      throw new HttpsError("invalid-argument", "A supplierId is required for supplier accounts.");
    }
    // Suppliers carry no fine-grained permissions. Their scope is the
    // supplierId claim, enforced by Firestore and Storage rules.
    return { role: "supplier", supplierId, permissions: {} };
  }

  const permissions = {};
  for (const permission of PERMISSIONS) {
    // Managing users is reserved to admins: the claim is derived from the
    // role so it can never be granted to (or unchecked for) anyone else.
    permissions[permission] = permission === "canManageUsers"
      ? data.role === "admin"
      : data.permissions?.[permission] === true;
  }
  return { role: data.role, permissions };
}

function sanitizeSupplierProfile(data) {
  const companyName = typeof data?.companyName === "string" ? data.companyName.trim() : "";
  if (!companyName || companyName.length > 100) {
    throw new HttpsError("invalid-argument", "A company name is required for supplier accounts.");
  }
  return {
    companyName,
    contactName: typeof data?.contactName === "string" ? data.contactName.trim().slice(0, 100) : "",
    phone:       typeof data?.phone       === "string" ? data.phone.trim().slice(0, 40) : "",
    email:       typeof data?.email       === "string" ? data.email.trim().slice(0, 120) : "",
    notes:       typeof data?.notes       === "string" ? data.notes.slice(0, 1000) : "",
  };
}

function sanitizeProfile(data) {
  const displayName = typeof data.displayName === "string" ? data.displayName.trim() : "";
  const color = typeof data.color === "string" ? data.color : "#FF6B35";
  if (!displayName || displayName.length > 100) {
    throw new HttpsError("invalid-argument", "A display name of at most 100 characters is required.");
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new HttpsError("invalid-argument", "A valid color is required.");
  }
  return { displayName, color };
}

async function writeAudit(databaseId, actorId, action, entityId, details) {
  await getDatabase(databaseId).collection("auditLogs").add({
    actorId,
    action,
    collection: "users",
    entityId,
    entityLabel: auditEntityLabel("users", details, entityId),
    actorName: "Administrateur",
    snapshot: cleanAuditValue(details),
    details,
    createdAt: FieldValue.serverTimestamp(),
  });
}

exports.createManagedUser = onCall(async (request) => {
  try {
  requireAdmin(request);
  const databaseId = databaseIdFrom(request.data, DB.value());
  const { email, password } = request.data || {};
  if (typeof email !== "string" || !EMAIL_RE.test(email) || email.length > 254) {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }
  if (typeof password !== "string" || password.length < 12 || password.length > 256) {
    throw new HttpsError("invalid-argument", "A password of 12–256 characters is required.");
  }

  const profile = sanitizeProfile(request.data);

  // For supplier accounts, create the supplier directory entry first so its
  // auto-generated id becomes the user's supplierId claim. This folds supplier
  // creation into user creation — admins no longer need two separate steps.
  let supplierRef = null;
  let supplierProfile = null;
  if (request.data.role === "supplier") {
    supplierProfile = sanitizeSupplierProfile(request.data.supplierProfile);
    supplierRef = getDatabase(databaseId).collection("suppliers").doc();
    supplierProfile.createdAt = FieldValue.serverTimestamp();
    supplierProfile.updatedAt = FieldValue.serverTimestamp();
    supplierProfile.linkedUid = null; // filled after the user is created
    await supplierRef.set(supplierProfile);
  }
  const access = sanitizeAccess(request.data, supplierRef ? supplierRef.id : null);

  const user = await auth.createUser({ email: email.trim(), password, displayName: profile.displayName });

  try {
    await auth.setCustomUserClaims(user.uid, access);
    await getDatabase(databaseId).collection("users").doc(user.uid).set({
      email: user.email,
      ...profile,
      ...access,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (access.role !== "supplier") {
      // SAFEGUARD: Check if punch document already exists before overwriting
      const existingPunchDoc = await getDatabase(databaseId).collection("punches").doc(user.uid).get();
      if (existingPunchDoc.exists()) {
        console.warn(`⚠️ WARNING: Punch document already exists for new user ${user.uid}. This suggests the user account may have been recreated. Existing punch data will be preserved.`);
        // Don't overwrite existing punch data - just ensure it has valid structure
        const existingData = existingPunchDoc.data();
        if (!Array.isArray(existingData.sessions)) {
          await getDatabase(databaseId).collection("punches").doc(user.uid).set({ sessions: [] });
        }
        // If sessions array exists, preserve it
      } else {
        await getDatabase(databaseId).collection("punches").doc(user.uid).set({ sessions: [] });
      }
    }
    if (supplierRef) {
      await supplierRef.set({ linkedUid: user.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    await writeAudit(databaseId, request.auth.uid, "create", user.uid, { email: user.email, ...profile, role: access.role, ...(supplierProfile ? { companyName: supplierProfile.companyName } : {}) });
  } catch (error) {
    await auth.deleteUser(user.uid);
    if (supplierRef) {
      try { await supplierRef.delete(); } catch { /* best-effort cleanup */ }
    }
    throw error;
  }

    return { uid: user.uid };
  } catch (error) {
    console.error("createManagedUser failed", {
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
    });
    if (error instanceof HttpsError) throw error;
    if (error?.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "An account already exists for this email address.");
    }
    throw new HttpsError("internal", "User creation failed. Check Cloud Functions logs.");
  }
});

exports.updateManagedUser = onCall(async (request) => {
  requireAdmin(request);
  const databaseId = databaseIdFrom(request.data, DB.value());
  const { uid } = request.data || {};
  if (typeof uid !== "string" || !uid) throw new HttpsError("invalid-argument", "A user ID is required.");

  const profile = sanitizeProfile(request.data);
  const before = await auth.getUser(uid);
  const wasSupplier = before.customClaims?.role === "supplier";
  const existingSupplierId = wasSupplier ? before.customClaims.supplierId : null;
  const willBeSupplier = request.data.role === "supplier";

  // Supplier company info is updated on the linked suppliers/{id} doc. If the
  // role is changing to supplier (from user/admin), create a new directory
  // entry; if changing away from supplier, leave the old doc orphaned but
  // harmless (it still appears in the dropdown — admins can clean up later).
  let supplierIdForClaim = existingSupplierId;
  let supplierProfile = null;
  if (willBeSupplier) {
    supplierProfile = sanitizeSupplierProfile(request.data.supplierProfile);
    if (existingSupplierId) {
      // Existing supplier — update company info in place.
      await getDatabase(databaseId).collection("suppliers").doc(existingSupplierId).set(
        { ...supplierProfile, linkedUid: uid, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    } else {
      // Role changed to supplier — create a new directory entry.
      const ref = getDatabase(databaseId).collection("suppliers").doc();
      await ref.set({
        ...supplierProfile,
        linkedUid: uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      supplierIdForClaim = ref.id;
    }
  }
  const access = sanitizeAccess(request.data, supplierIdForClaim);

  const roleChanged = before.customClaims?.role !== access.role;
  const supplierIdChanged = access.role === "supplier" &&
    before.customClaims?.supplierId !== access.supplierId;
  const permissionsChanged = access.role !== "supplier" &&
    JSON.stringify(before.customClaims?.permissions || {}) !== JSON.stringify(access.permissions);

  await auth.setCustomUserClaims(uid, access);
  await auth.updateUser(uid, { displayName: profile.displayName });
  await getDatabase(databaseId).collection("users").doc(uid).set({ ...profile, ...access }, { merge: true });
  // Permission changes only reach the client through a fresh ID token (the
  // current one keeps the old claims for up to an hour). Revoking refresh
  // tokens ends the session at the next refresh, unless the admin is editing
  // their own account — the client then force-refreshes the token instead.
  if ((roleChanged || supplierIdChanged || permissionsChanged) && uid !== request.auth.uid) {
    await auth.revokeRefreshTokens(uid);
  }
  await writeAudit(databaseId, request.auth.uid, "update", uid, {
    ...profile,
    role: access.role,
    ...(access.role === "supplier" && supplierProfile ? { companyName: supplierProfile.companyName } : {}),
  });
  return { uid };
});

exports.disableManagedUser = onCall(async (request) => {
  requireAdmin(request);
  const databaseId = databaseIdFrom(request.data, DB.value());
  const { uid } = request.data || {};
  if (typeof uid !== "string" || !uid || uid === request.auth.uid) {
    throw new HttpsError("invalid-argument", "A different user ID is required.");
  }

  await auth.updateUser(uid, { disabled: true });
  await auth.revokeRefreshTokens(uid);
  await getDatabase(databaseId).collection("users").doc(uid).set({ disabledAt: FieldValue.serverTimestamp() }, { merge: true });
  await writeAudit(databaseId, request.auth.uid, "disable", uid, {});
  return { uid };
});

exports.removeLegacyPins = onCall(async (request) => {
  requireAdmin(request);
  const databaseId = databaseIdFrom(request.data, DB.value());
  const users = await getDatabase(databaseId).collection("users").get();
  const writer = getDatabase(databaseId).bulkWriter();
  let removed = 0;
  for (const user of users.docs) {
    if (user.data().pin !== undefined) {
      writer.update(user.ref, { pin: FieldValue.delete() });
      removed += 1;
    }
  }
  await writer.close();
  await writeAudit(databaseId, request.auth.uid, "removeLegacyPins", "users", { removed });
  return { removed };
});

// ── Punch data restore ────────────────────────────────────────────────────────
// Admin-only: restore a user's punch document from the latest automatic
// backup (see punch-backup.js — every punches write is backed up first).
exports.restorePunchFromBackup = onCall(async (request) => {
  try {
    requireAdmin(request);
    const { userId } = request.data || {};

    if (typeof userId !== "string" || userId.length === 0) {
      throw new HttpsError("invalid-argument", "Valid userId is required");
    }

    const databaseId = databaseIdFrom(request.data, DB.value());
    const restoredData = await restoreFromLatestBackup(getDatabase(databaseId), userId);

    // Explicit audit entry with the true actor — the restore write itself
    // surfaces in the auto-trigger only as "Système".
    await getDatabase(databaseId).collection("auditLogs").add({
      actorId: request.auth.uid,
      action: "restore",
      collection: "punches",
      entityId: userId,
      entityLabel: auditEntityLabel("punches", restoredData, userId),
      actorName: "Administrateur",
      source: "callable",
      snapshot: cleanAuditValue(restoredData),
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: `Punch data restored for user ${userId}`,
      restoredSessionsCount: restoredData?.sessions?.length || 0,
    };
  } catch (error) {
    console.error("restorePunchFromBackup failed:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to restore punch data from backup");
  }
});

// Audit trigger — pinned to the single database selected by VITE_FIREBASE_DB
// at deploy time and writes auditLogs back to that same DB.
function makeAuditHandler(dbParam) {
  return async (event) => {
    const collectionName = event.params.collectionName;
    // The audit write itself also matches this root-level trigger. Ignore it
    // to prevent recursive audit records. `supplierOrders` is written by the
    // `updateSupplierOrder` callable (Admin SDK), which would surface here as
    // `Système (UNKNOWN)`, losing the true supplier actor. The callable writes
    // its own explicit, attributed audit entry instead. `punch_backups` is
    // written by the backup routine itself — auditing it would only add noise.
    if (collectionName === "auditLogs" || collectionName === "users" ||
        collectionName === "supplierOrders" || collectionName === "punch_backups") return;
    const before = event.data?.before;
    const after = event.data?.after;
    const documentAction = !before?.exists ? "create" : !after?.exists ? "delete" : "update";
    const beforeData = before?.data() || {};
    const afterData = after?.data() || {};

    // Backup the pre-write state of any punch document before it changes, so
    // data can be recovered if a write turns out to be destructive.
    if (collectionName === "punches" && before?.exists) {
      try {
        await backupPunchData(getFirestore(app, dbParam.value()), event.params.documentId, beforeData);
      } catch (backupError) {
        console.warn(`⚠️ Punch backup failed but continuing:`, backupError.message);
      }
    }
    
    const sessionAction = documentAction === "update" && collectionName === "punches"
      ? punchSessionAuditAction(beforeData, afterData)
      : null;
    const action = sessionAction?.action || documentAction;
    const source = sessionAction?.session || (afterData && Object.keys(afterData).length ? afterData : beforeData);
    const actorProfile = event.authId
      ? await getFirestore(app, dbParam.value()).collection("users").doc(event.authId).get()
      : null;
    const actorName = actorProfile?.exists
      ? actorProfile.data().displayName || event.authId
      : event.authId || `Système (${event.authType})`;
    await getFirestore(app, dbParam.value()).collection("auditLogs").add({
      actorId: event.authId || null,
      action,
      collection: collectionName,
      entityId: event.params.documentId,
      entityLabel: auditEntityLabel(collectionName, source, event.params.documentId),
      actorName,
      actorType: event.authType,
      ...(action === "update"
        ? { changes: auditChanges(beforeData, afterData) }
        : { snapshot: cleanAuditValue(source) }),
      source: "firestore-trigger",
      createdAt: FieldValue.serverTimestamp(),
    });
  };
}

exports.auditBusinessWrites = onDocumentWrittenWithAuthContext(
  { document: "{collectionName}/{documentId}", database: DB },
  makeAuditHandler(DB)
);

// ── Supplier portal ───────────────────────────────────────────────────────────
// All supplier-side mutations flow through this callable so that:
//   - the `history` array stays tamper-proof (rules forbid direct writes),
//   - the audit log records the real actor (the auto-trigger is bypassed),
//   - status transitions obey the strict graph defined above.
async function loadActor(databaseId, authId) {
  if (!authId) return null;
  const snap = await getDatabase(databaseId).collection("users").doc(authId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

function buildHistoryEntry(actor, role, action, field, from, to) {
  return {
    actorId: actor?.id || null,
    actorName: actor?.displayName || actor?.email || null,
    actorRole: role,
    action,
    field,
    from,
    to,
    at: Date.now(),
  };
}

exports.updateSupplierOrder = onCall(async (request) => {
  try {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication is required.");
    const role = request.auth.token.role;
    const supplierId = request.auth.token.supplierId || null;
    const { orderId, patch, databaseId } = request.data || {};
    const dbId = databaseIdFrom(request.data, DB.value());
    if (typeof orderId !== "string" || !orderId) {
      throw new HttpsError("invalid-argument", "An orderId is required.");
    }
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      throw new HttpsError("invalid-argument", "A patch object is required.");
    }
    if (Object.keys(patch).length > 20) {
      throw new HttpsError("invalid-argument", "Too many fields in patch.");
    }

    const ref = getDatabase(dbId).collection("supplierOrders").doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Order not found.");
    const before = snap.data();

    const actor = await loadActor(dbId, request.auth.uid);
    const isAdminSide = role !== "supplier" && !!request.auth.token.permissions?.canManageSupplierOrders;

    if (!isAdminSide) {
      if (role !== "supplier") {
        throw new HttpsError("permission-denied", "Only admin or supplier accounts may update orders.");
      }
      if (!supplierId || before.supplierId !== supplierId) {
        throw new HttpsError("permission-denied", "This order is not assigned to your supplier account.");
      }
    }

    const history = Array.isArray(before.history) ? [...before.history] : [];
    const update = { updatedAt: FieldValue.serverTimestamp() };
    const allowedSupplierFields = new Set(["status", "estimatedCompletionDate", "notes"]);

    // Status transition validation.
    if (Object.prototype.hasOwnProperty.call(patch, "status")) {
      const nextStatus = patch.status;
      if (!SUPPLIER_STATUSES.includes(nextStatus)) {
        throw new HttpsError("invalid-argument", `Unknown status: ${nextStatus}.`);
      }
      const current = before.status || "pending";
      if (!isAdminSide) {
        const allowed = SUPPLIER_TRANSITIONS[current] || [];
        if (!allowed.includes(nextStatus)) {
          throw new HttpsError("failed-precondition", `Cannot move from ${current} to ${nextStatus}.`);
        }
        const supplierAllowed = SUPPLIER_ALLOWED_NEXT[current] || [];
        if (!supplierAllowed.includes(nextStatus)) {
          throw new HttpsError("permission-denied", "Suppliers may not perform this status change.");
        }
      }
      // Shipped requires a shipping label to exist (uploaded by admin).
      if (nextStatus === "shipped" && !before.shippingLabel?.path) {
        throw new HttpsError("failed-precondition", "A shipping label must be uploaded before an order can ship.");
      }
      update.status = nextStatus;
      if (nextStatus === "paid" && !before.paidAt) {
        update.paidAt = Date.now();
      }
      history.push(buildHistoryEntry(actor, role, "status_change", "status", current, nextStatus));
    }

    if (Object.prototype.hasOwnProperty.call(patch, "estimatedCompletionDate")) {
      if (!isAdminSide) {
        const current2 = update.status || before.status;
        if (!["in_production", "ready_to_ship"].includes(current2)) {
          throw new HttpsError("failed-precondition", "Estimated date may only be set during production.");
        }
      }
      const est = patch.estimatedCompletionDate;
      if (est != null && (typeof est !== "number" || !Number.isFinite(est))) {
        throw new HttpsError("invalid-argument", "Estimated date must be a number or null.");
      }
      update.estimatedCompletionDate = est ?? null;
      history.push(buildHistoryEntry(actor, role, "set_estimated", "estimatedCompletionDate", before.estimatedCompletionDate ?? null, est ?? null));
    }

    if (Object.prototype.hasOwnProperty.call(patch, "notes")) {
      const note = patch.notes;
      if (!note || typeof note !== "object") {
        throw new HttpsError("invalid-argument", "A note object is required.");
      }
      const notes = Array.isArray(before.notes) ? [...before.notes] : [];
      notes.push({
        authorId: actor?.id || request.auth.uid,
        authorName: actor?.displayName || actor?.email || null,
        authorRole: role,
        text: String(note.text || "").slice(0, 2000),
        createdAt: Date.now(),
      });
      update.notes = notes;
      history.push(buildHistoryEntry(actor, role, "add_note", "notes", null, note.text || ""));
    }

    // Admin-only fields. Suppliers cannot touch these.
    const adminOnlyFields = [
      "orderNumber", "supplierId", "productRef", "quantity", "customer",
      "shippingLabel", "attachments", "estimatedCompletionDate",
    ];
    if (isAdminSide) {
      for (const field of adminOnlyFields) {
        if (!Object.prototype.hasOwnProperty.call(patch, field)) continue;
        if (field === "notes" || field === "status") continue;
        if (field === "shippingLabel" && patch[field]) {
          const label = patch[field];
          update.shippingLabel = {
            path: clampStr(label?.path, 500),
            trackingNumber: label?.trackingNumber ? clampStr(label.trackingNumber, 100) : null,
            uploadedById: request.auth.uid,
            uploadedAt: Date.now(),
          };
          if (!update.shippingLabel.path) {
            throw new HttpsError("invalid-argument", "Shipping label path is required.");
          }
          history.push(buildHistoryEntry(actor, role, "upload_label", "shippingLabel", before.shippingLabel?.path || null, update.shippingLabel.path));
        } else if (field === "attachments" && Array.isArray(patch[field])) {
          if (patch[field].length > 50) {
            throw new HttpsError("invalid-argument", "Too many attachments (max 50).");
          }
          update.attachments = patch[field].map(a => ({
            name: clampStr(a?.name, 200) || "file",
            path: clampStr(a?.path, 500),
            contentType: clampStr(a?.contentType, 100) || "application/octet-stream",
            uploadedById: request.auth.uid,
            uploadedAt: Date.now(),
          }));
          if (update.attachments.some(a => !a.path)) {
            throw new HttpsError("invalid-argument", "Attachment path is required.");
          }
          history.push(buildHistoryEntry(actor, role, "update_attachments", "attachments", null, `${update.attachments.length} file(s)`));
        } else if (field === "customer" && patch[field] && typeof patch[field] === "object") {
          update.customer = {
            name: clampStr(patch[field].name, 200),
            phone: clampStr(patch[field].phone, 40),
            address: clampStr(patch[field].address, 500),
          };
          history.push(buildHistoryEntry(actor, role, "update_customer", "customer", null, update.customer.name));
        } else if (field === "quantity") {
          const q = clampInt(patch[field], 1, 1000000);
          if (q == null) {
            throw new HttpsError("invalid-argument", "Quantity must be a number between 1 and 1,000,000.");
          }
          update.quantity = q;
          history.push(buildHistoryEntry(actor, role, "update_field", field, before[field] ?? null, q));
        } else if (field !== "estimatedCompletionDate") {
          // orderNumber, supplierId, productRef — clamp to bounded strings.
          update[field] = clampStr(patch[field], field === "supplierId" ? 100 : field === "orderNumber" ? 50 : 200);
          history.push(buildHistoryEntry(actor, role, "update_field", field, before[field] ?? null, update[field]));
        }
      }
    } else {
      // Reject any field a supplier is not allowed to touch.
      for (const key of Object.keys(patch)) {
        if (!allowedSupplierFields.has(key)) {
          throw new HttpsError("permission-denied", `Suppliers may not modify '${key}'.`);
        }
      }
    }

    update.history = history;
    await ref.set(update, { merge: true });

    // Explicit audit entry with the true actor (the auto-trigger is bypassed
    // for supplierOrders so no duplicate "Système" record is produced).
    await getDatabase(dbId).collection("auditLogs").add({
      actorId: request.auth.uid,
      action: "update",
      collection: "supplierOrders",
      entityId: orderId,
      entityLabel: auditEntityLabel("supplierOrders", { ...before, ...update }, orderId),
      actorName: actor?.displayName || actor?.email || request.auth.uid,
      actorType: request.auth.type || "USER",
      changes: auditChanges(before, update),
      source: "callable",
      createdAt: FieldValue.serverTimestamp(),
    });

    return { orderId };
  } catch (error) {
    console.error("updateSupplierOrder failed", {
      code: error?.code, message: error?.message, stack: error?.stack,
    });
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Order update failed. Check Cloud Functions logs.");
  }
});
