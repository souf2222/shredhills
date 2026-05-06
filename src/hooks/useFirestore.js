// src/hooks/useFirestore.js
import { useState, useEffect } from "react";
import {
  collection, doc, onSnapshot, setDoc, updateDoc,
  deleteDoc, addDoc, serverTimestamp, query, orderBy
} from "firebase/firestore";
import { db, uploadPurchasePhoto, deleteStorageFile } from "../firebase";

export function useFirestore() {
  const [users,       setUsers]       = useState([]);
  const [orders,      setOrders]      = useState([]);
  const [stops,       setStops]       = useState([]);
  const [punches,     setPunches]     = useState({});
  const [purchases,   setPurchases]   = useState([]);
  const [events,      setEvents]      = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    let loaded = 0;
    const TOTAL = 7;
    const done = () => { loaded++; if (loaded >= TOTAL) setLoading(false); };

    const unsubs = [
      onSnapshot(collection(db, "users"), snap => {
        setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id }))); done();
      }, () => done()),

      onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), snap => {
        setOrders(snap.docs.map(d => ({ ...d.data(), id: d.id }))); done();
      }, () => done()),

      onSnapshot(query(collection(db, "stops"), orderBy("createdAt", "desc")), snap => {
        setStops(snap.docs.map(d => ({ ...d.data(), id: d.id }))); done();
      }, () => done()),

      onSnapshot(collection(db, "punches"), snap => {
        const map = {};
        snap.docs.forEach(d => { map[d.id] = d.data().sessions || []; });
        setPunches(map); done();
      }, () => done()),

      onSnapshot(query(collection(db, "purchases"), orderBy("submittedAt", "desc")), snap => {
        setPurchases(snap.docs.map(d => ({ ...d.data(), id: d.id }))); done();
      }, () => done()),

      onSnapshot(query(collection(db, "events"), orderBy("startDate", "asc")), snap => {
        setEvents(snap.docs.map(d => ({ ...d.data(), id: d.id }))); done();
      }, () => done()),

      onSnapshot(collection(db, "purchaseCategories"), snap => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.label || "").localeCompare(b.label || ""));
        setCategories(list); done();
      }, () => done()),
    ];

    return () => unsubs.forEach(u => u());
  }, []);

  // USERS
  const saveUser   = (user) => setDoc(doc(db, "users", user.id), user);
  const updateUser = (user) => setDoc(doc(db, "users", user.id), user, { merge: true });
  const deleteUser = (id)   => deleteDoc(doc(db, "users", id));

  // ORDERS
  const addOrder    = (order) => addDoc(collection(db, "orders"), { ...order, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const updateOrder = (id, data) => updateDoc(doc(db, "orders", id), { ...data, updatedAt: serverTimestamp() });
  const deleteOrder = (id) => deleteDoc(doc(db, "orders", id));

  // STOPS
  const addStop    = (stop) => addDoc(collection(db, "stops"), { ...stop, createdAt: serverTimestamp() });
  const updateStop = (id, data) => updateDoc(doc(db, "stops", id), data);
  const deleteStop = (id) => deleteDoc(doc(db, "stops", id));

  // PUNCHES
  const getPunchSessions = (empId) => punches[empId] || [];

  const addPunchSession = async (empId, session) => {
    const current = getPunchSessions(empId);
    await setDoc(doc(db, "punches", empId), { sessions: [...current, session] }, { merge: true });
  };

  const updatePunchSession = async (empId, updatedSession) => {
    const current = getPunchSessions(empId);
    await setDoc(doc(db, "punches", empId), {
      sessions: current.map(s => s.id === updatedSession.id ? updatedSession : s)
    });
  };

  const closePunchSession = async (empId, sessionId) => {
    const current = getPunchSessions(empId);
    await setDoc(doc(db, "punches", empId), {
      sessions: current.map(s => s.id === sessionId ? { ...s, punchOut: Date.now() } : s)
    });
  };

  // PURCHASES
  // Creates a purchase doc, then uploads the receipt photo if provided
  // and patches the doc with { photoUrl, photoPath }. Returns the purchase id.
  const addPurchase = async (p, photoFile = null) => {
    const ref = await addDoc(collection(db, "purchases"), {
      ...p,
      submittedAt: serverTimestamp(),
    });
    if (photoFile) {
      try {
        const { url, path } = await uploadPurchasePhoto(photoFile, ref.id);
        await updateDoc(ref, { photoUrl: url, photoPath: path });
      } catch (err) {
        // Purchase still saved, but without photo. Surface the error to caller.
        console.error("Upload facture échoué :", err);
        throw err;
      }
    }
    return ref.id;
  };

  const updatePurchase = (id, data) => updateDoc(doc(db, "purchases", id), data);

  const approvePurchase = (id, decidedBy, decidedByName) =>
    updateDoc(doc(db, "purchases", id), {
      status: "approved",
      approvedAt: Date.now(),
      decidedBy: decidedBy || null,
      decidedByName: decidedByName || null,
    });

  const refusePurchase = (id, reason, decidedBy, decidedByName) =>
    updateDoc(doc(db, "purchases", id), {
      status: "refused",
      refusedAt: Date.now(),
      refusedReason: reason || "",
      decidedBy: decidedBy || null,
      decidedByName: decidedByName || null,
    });

  const deletePurchase = async (id, photoPath = null) => {
    await deleteStorageFile(photoPath);
    await deleteDoc(doc(db, "purchases", id));
  };

  // PURCHASE CATEGORIES (editable CRUD)
  const addCategory = (cat) => addDoc(collection(db, "purchaseCategories"), {
    label: cat.label || "",
    emoji: cat.emoji || "📎",
    color: cat.color || "#8E8E93",
    order: typeof cat.order === "number" ? cat.order : 999,
    createdAt: serverTimestamp(),
  });
  const updateCategory = (id, data) => updateDoc(doc(db, "purchaseCategories", id), data);
  const deleteCategory = (id) => deleteDoc(doc(db, "purchaseCategories", id));

  // EVENTS
  const addEvent = (event) => addDoc(collection(db, "events"), {
    ...event, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
  const updateEvent = (id, data) => updateDoc(doc(db, "events", id), { ...data, updatedAt: serverTimestamp() });
  const deleteEvent = (id) => deleteDoc(doc(db, "events", id));

  return {
    users, orders, stops, punches, purchases, events, categories, loading,
    saveUser, updateUser, deleteUser,
    addOrder, updateOrder, deleteOrder,
    addStop, updateStop, deleteStop,
    getPunchSessions, addPunchSession, updatePunchSession, closePunchSession,
    addPurchase, updatePurchase, approvePurchase, refusePurchase, deletePurchase,
    addCategory, updateCategory, deleteCategory,
    addEvent, updateEvent, deleteEvent,
  };
}
