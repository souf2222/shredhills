// src/portal/usePortalOrders.js
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";

function toMs(val) {
  if (typeof val === "number") return val;
  if (val && typeof val.toMillis === "function") return val.toMillis();
  if (val && typeof val.seconds === "number") return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  return val;
}

// Supplier-scoped subscription. The supplier's supplierId claim scopes reads
// at the rules layer, but we filter here too so the query matches an index and
// the client never receives another supplier's orders even if rules misfire.
export function usePortalOrders(firebaseUser, supplierId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser?.uid || !supplierId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    // NOTE: a `where(...) + orderBy("createdAt")` combo would require a composite
    // index that Firestore does not auto-create, and a missing-index error here
    // surfaces as an empty list (silent in the UI). Filter server-side, sort
    // client-side to avoid the index dependency entirely.
    const q = query(
      collection(db, "supplierOrders"),
      where("supplierId", "==", supplierId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
        createdAt: toMs(d.data().createdAt),
        updatedAt: toMs(d.data().updatedAt),
        estimatedCompletionDate: toMs(d.data().estimatedCompletionDate),
      }));
      docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(docs);
      setLoading(false);
    }, (err) => {
      console.error("Portal orders listener error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [firebaseUser?.uid, supplierId]);

  return { orders, loading };
}
