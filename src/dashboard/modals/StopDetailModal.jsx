import { useState } from "react";
import { fmtTime } from "../../utils/helpers";

export function StopDetailModal({ stop, onClose, updateStop, showToast }) {
  const [note, setNote] = useState(stop.note || "");
  const [savingNote, setSavingNote] = useState(false);

  const saveNote = async () => {
    if (note === (stop.note || "")) return;
    setSavingNote(true);
    try {
      await updateStop(stop.id, { note });
      showToast && showToast("Note enregistrée");
    } catch (e) {
      showToast && showToast("Erreur note");
    }
    setSavingNote(false);
  };

  const setStatus = async (newStatus) => {
    try {
      const data = { status: newStatus };
      if (newStatus === "completed") data.completedAt = Date.now();
      else data.completedAt = null;
      await updateStop(stop.id, data);
      showToast && showToast("Statut mis à jour");
      onClose();
    } catch (e) {
      showToast && showToast("Erreur statut");
    }
  };

  const statusLabel = {
    pending: { label: "À faire", color: "#AF52DE", bg: "#F5F0FF" },
    doing:   { label: "En cours", color: "#FF9500", bg: "#FFF3E0" },
    completed: { label: "Terminé", color: "#34C759", bg: "#EDFFF3" },
    failed:  { label: "Échoué", color: "#FF3B30", bg: "#FFF5F5" },
  };
  const s = statusLabel[stop.status] || statusLabel.pending;

  const isActive = stop.status === "pending" || stop.status === "doing";

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="handle" />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: s.bg, color: s.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 700,
          }}>
            {stop.type === "delivery" ? "📦" : "📤"}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{stop.clientName}</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 600, color: s.color,
              background: s.bg, padding: "3px 10px", borderRadius: 20, marginTop: 4,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
              {s.label}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {stop.clientPhone && (
            <div>
              <label className="lbl">Téléphone</label>
              <a href={`tel:${stop.clientPhone}`} style={{ fontSize: 15, color: "#007AFF", textDecoration: "none", fontWeight: 600 }}>
                📞 {stop.clientPhone}
              </a>
            </div>
          )}

          <div>
            <label className="lbl">Adresse</label>
            <p style={{ fontSize: 15, color: "#1C1C1E", margin: 0, marginBottom: 6 }}>📍 {stop.address}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#007AFF", fontWeight: 600 }}
            >
              🗺️ Ouvrir dans Google Maps
            </a>
          </div>

          {stop.instructions && (
            <div style={{ background: "#FFFBEF", borderRadius: 12, padding: "12px 14px", border: "1px solid #FFE4A0" }}>
              <label className="lbl" style={{ marginBottom: 4 }}>Instructions</label>
              <p style={{ fontSize: 14, color: "#92400E", margin: 0 }}>💬 {stop.instructions}</p>
            </div>
          )}

          <div>
            <label className="lbl">📝 Note {stop.status === "failed" && <span style={{ color: "#FF3B30" }}>(obligatoire si échoué)</span>}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder={stop.status === "failed" ? "Pourquoi cet arrêt a échoué ?" : "Ajouter une note..."}
                value={note}
                onChange={e => setNote(e.target.value)}
                onBlur={saveNote}
                onKeyDown={e => e.key === "Enter" && saveNote()}
                className="inp"
                style={{
                  border: `1.5px solid ${stop.status === "failed" ? "#FFCDD0" : "transparent"}`,
                  background: stop.status === "failed" ? "#FFF5F5" : undefined,
                }}
              />
              {savingNote && <span style={{ fontSize: 12, color: "#8E8E93", alignSelf: "center" }}>⏳</span>}
            </div>
            {stop.note && (
              <p style={{ fontSize: 12, color: "#8E8E93", margin: "4px 0 0" }}>Actuelle: {stop.note}</p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            {stop.status === "pending" && (
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: "center", fontSize: 16, padding: "14px 0", gap: 10 }}
                onClick={() => setStatus("doing")}
              >
                <span style={{ fontSize: 14 }}>&#9654;</span> Démarrer
              </button>
            )}

            {stop.status === "doing" && (
              <>
                <button
                  className="btn btn-outline"
                  style={{ width: 52, height: 44, padding: 0, justifyContent: "center", borderColor: "#C7C7CC", color: "#1C1C1E" }}
                  onClick={() => setStatus("pending")}
                  title="Remettre à faire"
                >
                  &#8634;
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: "center", gap: 8 }}
                  onClick={() => setStatus("completed")}
                >
                  <span style={{ fontSize: 13 }}>&#10003;</span> Terminé
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, justifyContent: "center", gap: 8, borderColor: "#1C1C1E", color: "#1C1C1E" }}
                  onClick={() => setStatus("failed")}
                >
                  <span style={{ fontSize: 13 }}>&#10005;</span> Échouer
                </button>
              </>
            )}

            {!isActive && (
              <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center", gap: 8 }} onClick={() => setStatus("pending")}>
                <span style={{ fontSize: 13 }}>&#8634;</span> Remettre à faire
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <button className="btn btn-outline" onClick={onClose} style={{ padding: "10px 24px" }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
