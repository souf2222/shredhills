// src/hooks/useFirestore.js
// Hook central pour toutes les opérations Firestore + Storage

import { useState, useEffect } from "react";
import {
  collection, doc, onSnapshot, setDoc, updateDoc,
  deleteDoc, addDoc, serverTimestamp, query, orderBy
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

// ─── Upload image (base64 ou dataURL) vers Firebase Storage ──────────────────
export async function uploadImage(path, dataUrl) {
  if (!dataUrl || dataUrl === "demo" || dataUrl === "captured") return dataUrl;
  try {
    const storageRef = ref(storage, path);
    await uploadString(storageRef, dataUrl, "data_url");
    return await getDownloadURL(storageRef);
  } catch (e) {
    console.error("Upload error:", e);
    return dataUrl;
  }
}

// ─── Hook principal ───────────────────────────────────────────────────────────
export function useFirestore() {
  const [users,     setUsers]     = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [stops,     setStops]     = useState([]);
  const [punches,   setPunches]   = useState({});
  const [purchases, setPurchases] = useState([]);
  const [loading,   setLoading]   = useState(true);

  // ── Écoute temps-réel de toutes les collections ───────────────────────────
  useEffect(() => {
    let loaded = 0;
    const done = () => { loaded++; if (loaded >= 5) setLoading(false); };

    const unsubUsers = onSnapshot(collection(db, "users"), snap => {
      setUsers(snap.docs.map(d => ({ ...d.data(), _id: d.id })));
      done();
    });

    const unsubOrders = onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc")),
      snap => { setOrders(snap.docs.map(d => ({ ...d.data(), _id: d.id }))); done(); }
    );

    const unsubStops = onSnapshot(
      query(collection(db, "stops"), orderBy("createdAt", "desc")),
      snap => { setStops(snap.docs.map(d => ({ ...d.data(), _id: d.id }))); done(); }
    );

    const unsubPunches = onSnapshot(collection(db, "punches"), snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data().sessions || []; });
      setPunches(map);
      done();
    });

    const unsubPurchases = onSnapshot(
      query(collection(db, "purchases"), orderBy("submittedAt", "desc")),
      snap => { setPurchases(snap.docs.map(d => ({ ...d.data(), _id: d.id }))); done(); }
    );

    return () => { unsubUsers(); unsubOrders(); unsubStops(); unsubPunches(); unsubPurchases(); };
  }, []);

  // ── USERS ─────────────────────────────────────────────────────────────────
  const saveUser = async (user) => {
    await setDoc(doc(db, "users", user.id), user);
  };

  const updateUser = async (user) => {
    await setDoc(doc(db, "users", user.id), user, { merge: true });
  };

  const deleteUser = async (id) => {
    console.log("Firestore deleteUser called with:", id);
    await deleteDoc(doc(db, "users", id));
    console.log("Firestore deleteUser completed");
  };

  // ── ORDERS ────────────────────────────────────────────────────────────────
  const addOrder = async (order) => {
    await addDoc(collection(db, "orders"), { ...order, createdAt: serverTimestamp() });
  };

  const updateOrder = async (id, data) => {
    await updateDoc(doc(db, "orders", id), data);
  };

  const deleteOrder = async (id) => {
    console.log("Firestore deleteOrder called with:", id);
    const docRef = doc(db, "orders", id);
    console.log("Doc ref:", docRef);
    await deleteDoc(docRef);
    console.log("Firestore deleteDoc completed");
  };

  // ── STOPS ─────────────────────────────────────────────────────────────────
  const addStop = async (stop) => {
    await addDoc(collection(db, "stops"), { ...stop, createdAt: serverTimestamp() });
  };

  const updateStop = async (id, data) => {
    await updateDoc(doc(db, "stops", id), data);
  };

  const deleteStop = async (id) => {
    console.log("Firestore deleteStop called with:", id);
    await deleteDoc(doc(db, "stops", id));
    console.log("Firestore deleteStop completed");
  };

  // ── PUNCHES ───────────────────────────────────────────────────────────────
  const getPunchSessions = (empId) => punches[empId] || [];

  const addPunchSession = async (empId, session) => {
    const current = getPunchSessions(empId);
    await setDoc(doc(db, "punches", empId), {
      sessions: [...current, session]
    }, { merge: true });
  };

  const updatePunchSession = async (empId, updatedSession) => {
    const current = getPunchSessions(empId);
    const updated = current.map(s => s.id === updatedSession.id ? updatedSession : s);
    await setDoc(doc(db, "punches", empId), { sessions: updated });
  };

  const closePunchSession = async (empId, sessionId) => {
    const current = getPunchSessions(empId);
    const updated = current.map(s =>
      s.id === sessionId ? { ...s, punchOut: Date.now() } : s
    );
    await setDoc(doc(db, "punches", empId), { sessions: updated });
  };

  // ── PURCHASES ─────────────────────────────────────────────────────────────
  const addPurchase = async (purchase) => {
    await addDoc(collection(db, "purchases"), {
      ...purchase,
      submittedAt: serverTimestamp()
    });
  };

  const updatePurchase = async (id, data) => {
    await updateDoc(doc(db, "purchases", id), data);
  };

  return {
    users, orders, stops, punches, purchases, loading,
    saveUser, updateUser, deleteUser,
    addOrder, updateOrder, deleteOrder,
    addStop, updateStop, deleteStop,
    getPunchSessions, addPunchSession, updatePunchSession, closePunchSession,
    addPurchase, updatePurchase,
  };
}
