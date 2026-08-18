// src/hooks/useFirestore.js
import { useState, useEffect } from "react";
import {
  collection, doc, onSnapshot, serverTimestamp, query, orderBy, limit, writeBatch
} from "firebase/firestore";
import { db, uploadExpensePhoto, deleteStorageFile } from "../firebase";
import { buildAuditEntry } from "../utils/audit";

// Firestore Timestamps can come back as objects (with .toMillis() or .seconds).
// We normalize them to plain numbers so every consumer can do arithmetic safely.
function toMs(val) {
  if (typeof val === "number") return val;
  if (val && typeof val.toMillis === "function") return val.toMillis();
  if (val && typeof val.seconds === "number") return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  return val;
}

function normalizeEvent(doc) {
  const d = doc.data();
  return {
    ...d,
    id: doc.id,
    startDate: toMs(d.startDate),
    endDate:   toMs(d.endDate),
  };
}

export function useFirestore(authUser, auditActor) {
  const [users,       setUsers]       = useState([]);
  const [orders,      setOrders]      = useState([]);
  const [stops,       setStops]       = useState([]);
  const [punches,     setPunches]     = useState({});
  const [purchases,   setPurchases]   = useState([]);
  const [events,      setEvents]      = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [contacts,    setContacts]    = useState([]);
  const [acquisitions, setAcquisitions] = useState([]);
  const [auditLogs,   setAuditLogs]   = useState([]);
  const [loading,     setLoading]     = useState(true);

  const authUid = authUser?.uid || null;
  const canViewAudit = auditActor?.role === "admin" || !!auditActor?.permissions?.canManageUsers;

  useEffect(() => {
    // Don't subscribe until the user is authenticated. Firestore rules require
    // request.auth != null, so attaching listeners before auth is established
    // would cause permission-denied errors that are silently swallowed,
    // resulting in empty data until the user refreshes.
    if (!authUid) {
      setLoading(true);
      return;
    }

    let loaded = 0;
    const TOTAL = 9;
    const done = () => { loaded++; if (loaded >= TOTAL) setLoading(false); };
    const onErr = (label) => (err) => {
      console.error(`Firestore listener error (${label}):`, err);
      done();
    };

    const unsubs = [
      onSnapshot(collection(db, "users"), snap => {
        setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id }))); done();
      }, onErr("users")),

      onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), snap => {
        setOrders(snap.docs.map(d => ({ ...d.data(), id: d.id }))); done();
      }, onErr("orders")),

      onSnapshot(query(collection(db, "stops"), orderBy("createdAt", "desc")), snap => {
        setStops(snap.docs.map(d => ({ ...d.data(), id: d.id }))); done();
      }, onErr("stops")),

      onSnapshot(collection(db, "punches"), snap => {
        const map = {};
        snap.docs.forEach(d => { map[d.id] = d.data().sessions || []; });
        setPunches(map); done();
      }, onErr("punches")),

      onSnapshot(query(collection(db, "purchases"), orderBy("submittedAt", "desc")), snap => {
        setPurchases(snap.docs.map(d => ({ ...d.data(), id: d.id }))); done();
      }, onErr("purchases")),

      onSnapshot(query(collection(db, "events"), orderBy("startDate", "asc")), snap => {
        setEvents(snap.docs.map(normalizeEvent)); done();
      }, onErr("events")),

      onSnapshot(collection(db, "purchaseCategories"), snap => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.label || "").localeCompare(b.label || ""));
        setCategories(list); done();
      }, onErr("purchaseCategories")),

      onSnapshot(query(collection(db, "contacts"), orderBy("name", "asc")), snap => {
        setContacts(snap.docs.map(d => ({ ...d.data(), id: d.id }))); done();
      }, onErr("contacts")),

      onSnapshot(query(collection(db, "acquisitions"), orderBy("submittedAt", "desc")), snap => {
        setAcquisitions(snap.docs.map(d => ({ ...d.data(), id: d.id }))); done();
      }, onErr("acquisitions")),
    ];

    return () => unsubs.forEach(u => u());
  }, [authUid]);

  useEffect(() => {
    if (!authUid || !canViewAudit) {
      setAuditLogs([]);
      return;
    }

    return onSnapshot(
      query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(100)),
      snap => setAuditLogs(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      err => console.error("Firestore listener error (audit logs):", err)
    );
  }, [authUid, canViewAudit]);

  const addAudit = (batch, action, collectionName, entityId, before, after) => {
    const entry = buildAuditEntry({ action, collectionName, entityId, actor: auditActor, before, after });
    batch.set(doc(collection(db, "auditLogs")), { ...entry, createdAt: serverTimestamp() });
  };

  const createAudited = async (collectionName, data) => {
    const ref = doc(collection(db, collectionName));
    const batch = writeBatch(db);
    batch.set(ref, data);
    addAudit(batch, "create", collectionName, ref.id, null, data);
    await batch.commit();
    return ref;
  };

  const setAudited = async (collectionName, id, data, before = {}, merge = true) => {
    const batch = writeBatch(db);
    if (merge) batch.set(doc(db, collectionName, id), data, { merge: true });
    else batch.set(doc(db, collectionName, id), data);
    addAudit(batch, "update", collectionName, id, before, merge ? { ...before, ...data } : data);
    await batch.commit();
  };

  const updateAudited = async (collectionName, id, data, before = {}) => {
    const batch = writeBatch(db);
    batch.update(doc(db, collectionName, id), data);
    addAudit(batch, "update", collectionName, id, before, { ...before, ...data });
    await batch.commit();
  };

  const deleteAudited = async (collectionName, id, before = {}) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, collectionName, id));
    addAudit(batch, "delete", collectionName, id, before, null);
    await batch.commit();
  };

  const itemById = (items, id) => items.find(item => item.id === id) || {};

  // USERS
  const saveUser = (user) => {
    const { id, ...data } = user;
    const before = itemById(users, id);
    if (before.id) return setAudited("users", id, data, before);
    const batch = writeBatch(db);
    const created = { ...data, createdAt: serverTimestamp() };
    batch.set(doc(db, "users", id), created);
    addAudit(batch, "create", "users", id, null, created);
    return batch.commit();
  };
  const updateUser = (user) => {
    const { id, ...data } = user;
    return setAudited("users", id, data, itemById(users, id));
  };
  const deleteUser = (id) => deleteAudited("users", id, itemById(users, id));

  // ORDERS
  const addOrder = (order) => createAudited("orders", { ...order, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const updateOrder = (id, data) => updateAudited("orders", id, { ...data, updatedAt: serverTimestamp() }, itemById(orders, id));
  const deleteOrder = (id) => deleteAudited("orders", id, itemById(orders, id));

  // STOPS
  const addStop = (stop) => createAudited("stops", { ...stop, createdAt: serverTimestamp() });
  const updateStop = (id, data) => updateAudited("stops", id, data, itemById(stops, id));
  const deleteStop = (id) => deleteAudited("stops", id, itemById(stops, id));

  // PUNCHES
  const getPunchSessions = (empId) => punches[empId] || [];

  const addPunchSession = async (empId, session) => {
    const current = getPunchSessions(empId);
    await setAudited("punches", empId, { sessions: [...current, session] }, { id: empId, sessions: current });
  };

  const updatePunchSession = async (empId, updatedSession) => {
    const current = getPunchSessions(empId);
    await setAudited("punches", empId, {
      sessions: current.map(s => s.id === updatedSession.id ? updatedSession : s)
    }, { id: empId, sessions: current }, false);
  };

  const closePunchSession = async (empId, sessionId) => {
    const current = getPunchSessions(empId);
    await setAudited("punches", empId, {
      sessions: current.map(s => s.id === sessionId ? { ...s, punchOut: Date.now() } : s)
    }, { id: empId, sessions: current }, false);
  };

  const deletePunchSession = async (empId, sessionId) => {
    const current = getPunchSessions(empId);
    await setAudited("punches", empId, {
      sessions: current.filter(s => s.id !== sessionId)
    }, { id: empId, sessions: current }, false);
  };

  // EXPENSES (formerly PURCHASES)
  // Creates an expense doc, then uploads the receipt photo if provided
  // and patches the doc with { photoUrl, photoPath }. Returns the expense id.
  const addExpense = async (p, photoFile = null) => {
    const ref = await createAudited("purchases", {
      ...p,
      submittedAt: serverTimestamp(),
    });
    if (photoFile) {
      try {
        const { url, path } = await uploadExpensePhoto(photoFile, ref.id);
        await updateAudited("purchases", ref.id, { photoUrl: url, photoPath: path }, { ...p, id: ref.id });
      } catch (err) {
        console.error("Upload facture échoué :", err);
        throw err;
      }
    }
    return ref.id;
  };

  const updateExpense = (id, data) => updateAudited("purchases", id, data, itemById(purchases, id));

  const approveExpense = (id, decidedBy, decidedByName) =>
    updateAudited("purchases", id, {
      status: "approved",
      approvedAt: Date.now(),
      decidedBy: decidedBy || null,
      decidedByName: decidedByName || null,
    }, itemById(purchases, id));

  const refuseExpense = (id, reason, decidedBy, decidedByName) =>
    updateAudited("purchases", id, {
      status: "refused",
      refusedAt: Date.now(),
      refusedReason: reason || "",
      decidedBy: decidedBy || null,
      decidedByName: decidedByName || null,
    }, itemById(purchases, id));

  const deleteExpense = async (id, photoPath = null) => {
    await deleteStorageFile(photoPath);
    await deleteAudited("purchases", id, itemById(purchases, id));
  };

  // EXPENSE CATEGORIES (editable CRUD)
  const addCategory = (cat) => createAudited("purchaseCategories", {
    label: cat.label || "",
    emoji: cat.emoji || "📎",
    color: cat.color || "#8E8E93",
    order: typeof cat.order === "number" ? cat.order : 999,
    createdAt: serverTimestamp(),
  });
  const updateCategory = (id, data) => updateAudited("purchaseCategories", id, data, itemById(categories, id));
  const deleteCategory = (id) => deleteAudited("purchaseCategories", id, itemById(categories, id));

  // EVENTS
  const addEvent = (event) => createAudited("events", {
    ...event, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  const updateEvent = (id, data) => updateAudited("events", id, { ...data, updatedAt: serverTimestamp() }, itemById(events, id));
  const deleteEvent = (id) => deleteAudited("events", id, itemById(events, id));

  // CONTACTS
  const addContact = (contact) => createAudited("contacts", { ...contact, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const updateContact = (id, data) => updateAudited("contacts", id, { ...data, updatedAt: serverTimestamp() }, itemById(contacts, id));
  const deleteContact = (id) => deleteAudited("contacts", id, itemById(contacts, id));

  // ACQUISITIONS
  const addAcquisition = (acq) => createAudited("acquisitions", {
    ...acq,
    submittedAt: serverTimestamp(),
  });
  const updateAcquisition = (id, data) => updateAudited("acquisitions", id, data, itemById(acquisitions, id));
  const deleteAcquisition = (id) => deleteAudited("acquisitions", id, itemById(acquisitions, id));

  const approveAcquisition = (id, decidedBy, decidedByName) =>
    updateAudited("acquisitions", id, {
      status: "approved",
      decidedAt: Date.now(),
      decidedBy: decidedBy || null,
      decidedByName: decidedByName || null,
    }, itemById(acquisitions, id));

  const refuseAcquisition = (id, reason, decidedBy, decidedByName) =>
    updateAudited("acquisitions", id, {
      status: "refused",
      decidedAt: Date.now(),
      refusedReason: reason || "",
      decidedBy: decidedBy || null,
      decidedByName: decidedByName || null,
    }, itemById(acquisitions, id));

  const orderAcquisition = (id) =>
    updateAudited("acquisitions", id, {
      status: "ordered",
      orderedAt: Date.now(),
    }, itemById(acquisitions, id));

  const receiveAcquisition = (id) =>
    updateAudited("acquisitions", id, {
      status: "received",
      receivedAt: Date.now(),
    }, itemById(acquisitions, id));

  return {
    users, orders, stops, punches, purchases, events, categories, contacts, acquisitions, auditLogs, loading,
    saveUser, updateUser, deleteUser,
    addOrder, updateOrder, deleteOrder,
    addStop, updateStop, deleteStop,
    getPunchSessions, addPunchSession, updatePunchSession, closePunchSession, deletePunchSession,
    addExpense, updateExpense, approveExpense, refuseExpense, deleteExpense,
    addCategory, updateCategory, deleteCategory,
    addEvent, updateEvent, deleteEvent,
    addContact, updateContact, deleteContact,
    addAcquisition, updateAcquisition, deleteAcquisition, approveAcquisition, refuseAcquisition, orderAcquisition, receiveAcquisition,
  };
}
