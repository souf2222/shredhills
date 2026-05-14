// src/components/Modal.jsx
// Generic bottom-sheet / centered modal used across the app.
// Standard pattern: overlay (click-outside to close) + sheet with a handle.
import { useEffect } from "react";

export function Modal({ open, onClose, title, children, maxWidth = 520, footer = null }) {
  // Close on Escape for a11y / keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="sheet" style={{ maxWidth }}>
        <div className="handle" />
        {title && (
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
            {title}
          </h3>
        )}
        {children}
        {footer && (
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
