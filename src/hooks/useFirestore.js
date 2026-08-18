// src/hooks/useFirestore.js
import { useState, useEffect } from "react";
import {
  collection, doc, onSnapshot, serverTimestamp, query, where, orderBy, limit, writeBatch, runTransaction
} from "firebase/firestore";
import { db, uploadExpensePhoto, deleteStorageFile } from "../firebase";
import { dayStart } from "../utils/helpers";

// Firestore Timestamps can come back as objects (with .toMillis() or .seconds).
// We normalize them to plain numbers so every consumer can do arithmetic safely.
function toMs(val) {
  if (typeof val === "number") return val;
  if (val && typeof val.toMillis === "function") return val.toMillis();
  if (val && typeof val.seconds === "number") return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  return val;
}

// Sanity-check a punch timestamp: must be a finite number, not in the future
// (beyond 1 minute tolerance), and not older than 1 year ago.
const ONE_MIN = 60_000;
const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
function isValidPunchTs(ts) {
  return typeof ts === "number" && Number.isFinite(ts) &&
    ts <= Date.now() + ONE_MIN && ts >= Date.now() - ONE_YEAR;
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
  const [supplierOrders, setSupplierOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading,     setLoading]     = useState(true);

  const authUid = authUser?.uid || null;
  const canViewAudit = auditActor?.role === "admin" || !!auditActor?.permissions?.canManageUsers;
  const can = (permission) => auditActor?.role === "admin" || !!auditActor?.permissions?.[permission];

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
    const listeners = [];
    const done = () => { loaded++; if (loaded >= listeners.length) setLoading(false); };
    const onErr = (label) => (err) => {
      console.error(`Firestore listener error (${label}):`, err);
      done();
    };

    const listen = (label, source, setData) => {
      listeners.push(onSnapshot(source, snap => { setData(snap); done(); }, onErr(label)));
    };

    listen("users", collection(db, "users"), snap => {
      setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    if (can("canManageOrders") || can("canViewTasks")) {
      const source = can("canManageOrders")
        ? query(collection(db, "orders"), orderBy("createdAt", "desc"))
        : query(collection(db, "orders"), where("assignedTo", "==", authUid));
      listen("orders", source, snap => setOrders(snap.docs.map(d => ({ ...d.data(), id: d.id }))));
    } else setOrders([]);

    if (can("canManageDeliveries") || can("canViewDeliveries")) {
      const source = can("canManageDeliveries")
        ? query(collection(db, "stops"), orderBy("createdAt", "desc"))
        : query(collection(db, "stops"), where("assignedTo", "==", authUid));
      listen("stops", source, snap => setStops(snap.docs.map(d => ({ ...d.data(), id: d.id }))));
    } else setStops([]);

    if (can("canManageReports") || can("canClockIn")) {
      const source = can("canManageReports") ? collection(db, "punches") : doc(db, "punches", authUid);
      listen("punches", source, snap => {
        if (can("canManageReports")) {
          const map = {};
          snap.docs.forEach(d => { map[d.id] = d.data().sessions || []; });
          setPunches(map);
        } else {
          setPunches(snap.exists() ? { [snap.id]: snap.data().sessions || [] } : {});
        }
      });
    } else setPunches({});

    if (can("canManageExpenses") || can("canSubmitExpenses")) {
      const source = can("canManageExpenses")
        ? query(collection(db, "purchases"), orderBy("submittedAt", "desc"))
        : query(collection(db, "purchases"), where("empId", "==", authUid));
      listen("purchases", source, snap => setPurchases(snap.docs.map(d => ({ ...d.data(), id: d.id }))));
    } else setPurchases([]);

    if (can("canManageEvents") || can("canViewEvents")) {
      listen("events", query(collection(db, "events"), orderBy("startDate", "asc")), snap => {
        setEvents(snap.docs.map(normalizeEvent));
      });
    } else setEvents([]);

    listen("purchaseCategories", collection(db, "purchaseCategories"), snap => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.label || "").localeCompare(b.label || ""));
      setCategories(list);
    });

    if (can("canManageContacts")) {
      listen("contacts", query(collection(db, "contacts"), orderBy("name", "asc")), snap => {
        setContacts(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      });
    } else setContacts([]);

    if (can("canManageAcquisitions") || can("canSubmitAcquisitions")) {
      const source = can("canManageAcquisitions")
        ? query(collection(db, "acquisitions"), orderBy("submittedAt", "desc"))
        : query(collection(db, "acquisitions"), where("requesterId", "==", authUid));
      listen("acquisitions", source, snap => setAcquisitions(snap.docs.map(d => ({ ...d.data(), id: d.id }))));
    } else setAcquisitions([]);

    if (can("canManageSupplierOrders")) {
      listen("supplierOrders", query(collection(db, "supplierOrders"), orderBy("createdAt", "desc")), snap => {
        setSupplierOrders(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      });
      listen("suppliers", query(collection(db, "suppliers"), orderBy("createdAt", "asc")), snap => {
        setSuppliers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      });
    } else {
      setSupplierOrders([]);
      setSuppliers([]);
    }

    if (listeners.length === 0) setLoading(false);
    return () => listeners.forEach(unsub => unsub());
  }, [authUid, auditActor?.role, auditActor?.permissions]);

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

  const createAudited = async (collectionName, data) => {
    const ref = doc(collection(db, collectionName));
    const batch = writeBatch(db);
    batch.set(ref, data);
    await batch.commit();
    return ref;
  };

  const setAudited = async (collectionName, id, data, before = {}, merge = true) => {
    const batch = writeBatch(db);
    if (merge) batch.set(doc(db, collectionName, id), data, { merge: true });
    else batch.set(doc(db, collectionName, id), data);
    await batch.commit();
  };

  const updateAudited = async (collectionName, id, data, before = {}) => {
    const batch = writeBatch(db);
    batch.update(doc(db, collectionName, id), data);
    await batch.commit();
  };

  const deleteAudited = async (collectionName, id, before = {}) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, collectionName, id));
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
    // Validate the incoming session before touching Firestore.
    if (!session || typeof session.id !== "string" || !session.id) {
      throw new Error("INVALID_SESSION");
    }
    if (!isValidPunchTs(session.punchIn)) {
      throw new Error("INVALID_TIMESTAMP");
    }
    try {
      await runTransaction(db, async (transaction) => {
        const punchRef = doc(db, "punches", empId);
        const punchDoc = await transaction.get(punchRef);
        let serverSessions = [];

        if (punchDoc.exists()) {
          const data = punchDoc.data();
          serverSessions = Array.isArray(data.sessions) ? data.sessions.map(s => ({
            ...s,
            punchIn: toMs(s.punchIn),
            punchOut: s.punchOut ? toMs(s.punchOut) : null
          })) : [];

          const todayStart = dayStart(Date.now());

          // Auto-close orphaned sessions from previous days (user forgot to
          // punch out). The session is closed at the end of its start day so
          // the worked time stays attributed to the correct day.
          serverSessions = serverSessions.map(s => {
            if (!s.punchOut && dayStart(toMs(s.punchIn)) !== todayStart) {
              const orphanDayEnd = dayStart(toMs(s.punchIn)) + 24 * 60 * 60 * 1000 - 1;
              return { ...s, punchOut: Math.min(orphanDayEnd, Date.now()) };
            }
            return s;
          });

          // Check for active session today (guard against double punch-in)
          const hasActiveToday = serverSessions.some(s =>
            !s.punchOut && dayStart(toMs(s.punchIn)) === todayStart
          );

          if (hasActiveToday) {
            throw new Error("ALREADY_ACTIVE_SESSION");
          }
        }

        transaction.set(punchRef, { sessions: [...serverSessions, session] }, { merge: true });
      });
    } catch (error) {
      if (error.message === "ALREADY_ACTIVE_SESSION") {
        throw new Error("ALREADY_ACTIVE_SESSION");
      }
      throw error;
    }
  };

  const updatePunchSession = async (empId, updatedSession) => {
    // Validate the updated session before writing.
    if (!updatedSession || typeof updatedSession.id !== "string" || !updatedSession.id) {
      throw new Error("INVALID_SESSION");
    }
    if (!isValidPunchTs(updatedSession.punchIn)) {
      throw new Error("INVALID_TIMESTAMP");
    }
    if (updatedSession.punchOut != null) {
      if (!isValidPunchTs(updatedSession.punchOut) || updatedSession.punchOut <= updatedSession.punchIn) {
        throw new Error("INVALID_TIMESTAMP");
      }
    }

    await runTransaction(db, async (transaction) => {
      const punchRef = doc(db, "punches", empId);
      const punchDoc = await transaction.get(punchRef);

      if (!punchDoc.exists()) return;

      const data = punchDoc.data();
      const serverSessions = Array.isArray(data.sessions) ? data.sessions.map(s => ({
        ...s,
        punchIn: toMs(s.punchIn),
        punchOut: s.punchOut ? toMs(s.punchOut) : null
      })) : [];

      const exists = serverSessions.some(s => s.id === updatedSession.id);
      if (!exists) return;

      const updatedSessions = serverSessions.map(s =>
        s.id === updatedSession.id ? updatedSession : s
      );

      transaction.set(punchRef, { sessions: updatedSessions }, { merge: true });
    });
  };

  const closePunchSession = async (empId, sessionId) => {
    await runTransaction(db, async (transaction) => {
      const punchRef = doc(db, "punches", empId);
      const punchDoc = await transaction.get(punchRef);

      if (!punchDoc.exists()) return;

      const data = punchDoc.data();
      const serverSessions = Array.isArray(data.sessions) ? data.sessions.map(s => ({
        ...s,
        punchIn: toMs(s.punchIn),
        punchOut: s.punchOut ? toMs(s.punchOut) : null
      })) : [];

      const now = Date.now();
      const updatedSessions = serverSessions.map(s => {
        if (s.id !== sessionId || s.punchOut) return s;
        // Guard against clock skew: punchOut must be strictly after punchIn.
        const punchOut = now > s.punchIn ? now : s.punchIn + 1000;
        return { ...s, punchOut };
      });

      if (updatedSessions.some(s => s.id === sessionId && s.punchOut)) {
        transaction.set(punchRef, { sessions: updatedSessions }, { merge: true });
      }
    });
  };

  const deletePunchSession = async (empId, sessionId) => {
    await runTransaction(db, async (transaction) => {
      const punchRef = doc(db, "punches", empId);
      const punchDoc = await transaction.get(punchRef);
      
      if (!punchDoc.exists()) return;
      
      const data = punchDoc.data();
      const serverSessions = Array.isArray(data.sessions) ? data.sessions.map(s => ({
        ...s,
        punchIn: toMs(s.punchIn),
        punchOut: s.punchOut ? toMs(s.punchOut) : null
      })) : [];
      
      const filteredSessions = serverSessions.filter(s => s.id !== sessionId);
      
      if (filteredSessions.length !== serverSessions.length) {
        transaction.set(punchRef, { sessions: filteredSessions }, { merge: true });
      }
    });
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

  // SUPPLIERS (directory)
  const addSupplier = (s) => createAudited("suppliers", {
    ...s, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  const updateSupplier = (id, data) => updateAudited("suppliers", id, data, itemById(suppliers, id));
  const deleteSupplier = (id) => deleteAudited("suppliers", id, itemById(suppliers, id));

  // SUPPLIER ORDERS — admin creates/edits the document directly (rules allow
  // canManageSupplierOrders writes). All supplier-side mutations go through
  // the updateSupplierOrder callable; history is owned by the callable.
  const addSupplierOrder = (order) => createAudited("supplierOrders", {
    ...order,
    status: order.status || "pending",
    notes: [],
    attachments: [],
    history: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const updateSupplierOrderDoc = (id, data) => updateAudited("supplierOrders", id, {
    ...data, updatedAt: serverTimestamp()
  }, itemById(supplierOrders, id));
  const deleteSupplierOrder = (id) => deleteAudited("supplierOrders", id, itemById(supplierOrders, id));

  return {
    users, orders, stops, punches, purchases, events, categories, contacts, acquisitions, auditLogs,
    supplierOrders, suppliers,
    loading,
    saveUser, updateUser, deleteUser,
    addOrder, updateOrder, deleteOrder,
    addStop, updateStop, deleteStop,
    getPunchSessions, addPunchSession, updatePunchSession, closePunchSession, deletePunchSession,
    addExpense, updateExpense, approveExpense, refuseExpense, deleteExpense,
    addCategory, updateCategory, deleteCategory,
    addEvent, updateEvent, deleteEvent,
    addContact, updateContact, deleteContact,
    addAcquisition, updateAcquisition, deleteAcquisition, approveAcquisition, refuseAcquisition, orderAcquisition, receiveAcquisition,
    addSupplier, updateSupplier, deleteSupplier,
    addSupplierOrder, updateSupplierOrderDoc, deleteSupplierOrder,
  };
}
