import { useState } from "react";

export function DriverStopCard({ stop, index, updateStop, showToast, isDoing }) {
  const [note, setNote] = useState(stop.note || "");
  const [saving, setSaving] = useState(false);

  const saveNote = async () => {
    setSaving(true);
    await updateStop(stop.id, { note });
    setSaving(false);
    showToast && showToast("Note enregistrée");
  };

  const handleStatusChange = (newStatus) => {
    updateStop(stop.id, { status: newStatus });
  };

  return (
    <div className="stop-card oc" style={isDoing ? { borderLeft: "4px solid #FF9500" } : {}}>
      <div style={{ height: 4, background: stop.type === "delivery" ? "#007AFF" : "#FF9500" }} />
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>{stop.type === "delivery" ? "📦" : "📤"}</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: stop.type === "delivery" ? "#007AFF" : "#FF9500" }}>
            {stop.type === "delivery" ? "Livraison" : "Ramassage"}
          </span>
          <span style={{ fontSize: 11, color: "#C7C7CC", fontFamily: "monospace" }}>#{stop.order || index + 1}</span>
          {isDoing && <span style={{ fontSize: 11, background: "#FFF3E0", color: "#FF9500", padding: "2px 8px", borderRadius: 8, fontWeight: 600 }}>En cours</span>}
        </div>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{stop.clientName}</p>
        {stop.clientPhone && (
          <a href={`tel:${stop.clientPhone}`} style={{ fontSize: 13, color: "#007AFF", display: "block", marginBottom: 6, textDecoration: "none" }}>
            📞 {stop.clientPhone}
          </a>
        )}
        <p style={{ fontSize: 13, color: "#1C1C1E", marginBottom: 8 }}>📍 {stop.address}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`}
          target="_blank"
          rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#007AFF", textDecoration: "none", marginBottom: 10, fontWeight: 600 }}
        >
          🗺️ Ouvrir dans Google Maps
        </a>
        {stop.instructions && (
          <div style={{ background: "#FFFBEF", borderRadius: 10, padding: "8px 12px", border: "1px solid #FFE4A0", marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: "#92400E" }}>💬 {stop.instructions}</p>
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="Ajouter une note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E5E5EA", fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {!isDoing && stop.status === "pending" && (
            <button
              className="btn btn-outline"
              style={{ flex: 1, justifyContent: "center", background: "#FF9500", color: "white", borderColor: "#FF9500" }}
              onClick={() => handleStatusChange("doing")}
            >
              ⏳ Commencer
            </button>
          )}
          <button
            className="btn btn-purple"
            style={{ flex: isDoing ? 1 : 2, justifyContent: "center" }}
            onClick={() => handleStatusChange("completed")}
          >
            {isDoing ? "✅ Terminer" : (stop.type === "delivery" ? "📦 Confirmer" : "📤 Confirmer")}
          </button>
        </div>
      </div>
    </div>
  );
}
