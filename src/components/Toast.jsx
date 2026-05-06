// src/components/Toast.jsx
import { useEffect, useState } from "react";

export function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [message]);
  return <div className="toast">{message}</div>;
}

// Simple toast hook
export function useToast() {
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); };
  const clearToast = () => setToast(null);
  return { toast, showToast, clearToast };
}
