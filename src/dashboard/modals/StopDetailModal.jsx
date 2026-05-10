// src/dashboard/modals/StopDetailModal.jsx
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { fmtTime, fmtDate } from "../../utils/helpers";

const STATUS_LABELS = {
  pending:   { label: "À faire",     color: "#AF52DE", bg: "#F5F0FF" },
  doing:     { label: "En cours",    color: "#FF9500", bg: "#FFF3E0" },
  completed: { label: "Terminé",     color: "#34C759", bg: "#EDFFF3" },
  failed:    { label: "Échoué",      color: "#FF3B30", bg: "#FFF5F5" },
};

export function StopDetailModal({ stop, onClose, updateStop, showToast, users }) {
  const { userProfile } = useAuth();
  const [note, setNote] = useState(stop.note || "");
  const [savingNote, setSavingNote] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const buildLogEntry = (action, details) => ({
    timestamp: Date.now(),
    byId: userProfile?.id || "system",
    action,
    details,
  });

  const mergeLog = (newLog) => {
    const existing = stop.logs || [];
    return [...existing, newLog];
  };

  const saveNote = async () => {
    if (note === (stop.note || "")) return;
    setSavingNote(true);
    try {
      await updateStop(stop.id, {
        note,
        logs: mergeLog(buildLogEntry("note_updated", `Note mise à jour`)),
      });
      showToast && showToast("Note enregistrée");
    } catch (e) { showToast && showToast("Erreur note"); }
    setSavingNote(false);
  };

  const setStatus = async (newStatus) => {
    try {
      const data = { status: newStatus };
      if (newStatus === "completed") data.completedAt = Date.now();
      else data.completedAt = null;

      const label = STATUS_LABELS[newStatus]?.label || newStatus;
      await updateStop(stop.id, {
        ...data,
        logs: mergeLog(buildLogEntry("status_changed", `Changé en "${label}"`)),
      });
      showToast && showToast("Statut mis à jour");
      onClose();
    } catch (e) {
      showToast && showToast("Erreur statut");
    }
  };

  const s = STATUS_LABELS[stop.status] || STATUS_LABELS.pending;
  const isActive = stop.status === "pending" || stop.status === "doing";
  const logs = (stop.logs || []).slice().sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0));

  const getUserName = (uid) => {
    if (!uid) return "Système";
    if (uid === userProfile?.id) return "Vous";
    const u = users?.find(x => x.id === uid);
    return u?.displayName || "Utilisateur inconnu";
  };

  const actionIcon = (action) => {
    switch (action) {
      case "created":         return "🆕";
      case "status_changed":  return "📍";
      case "note_updated":    return "📝";
      case "updated":         return "✏️";
      default:                return "🕐";
    }
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxWidth: 520 }}>
        <div className="handle" />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, background: s.bg, color: s.color,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700,
          }}>
            {stop.type === "delivery" ? "📦" : "📤"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {stop.clientName}
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 600, color: s.color,
              background: s.bg, padding: "3px 10px", borderRadius: 20, marginTop: 4,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
              {s.label}
            </div>
          </div>
          {stop.contactId && <span style={{ fontSize: 11, color: "#8E8E93", background: "#F2F2F7", padding: "2px 8px", borderRadius: 6 }}>📇</span>}
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
            <p style={{ fontSize: 15, color: "#1C1C1E", margin: "0 0 6px" }}>📍 {stop.address}</p>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`} target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#007AFF", fontWeight: 600 }}>
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
              <input type="text" className="inp"
                placeholder={stop.status === "failed" ? "Pourquoi cet arrêt a échoué ?" : "Ajouter une note..."}
                value={note} onChange={e => setNote(e.target.value)} onBlur={saveNote} onKeyDown={e => e.key === "Enter" && saveNote()}
                style={{ border: `1.5px solid ${stop.status === "failed" ? "#FFCDD0" : "transparent"}`, background: stop.status === "failed" ? "#FFF5F5" : undefined }}
              />
              {savingNote && <span style={{ fontSize: 12, color: "#8E8E93", alignSelf: "center" }}>⏳</span>}
            </div>
            {stop.note && <p style={{ fontSize: 12, color: "#8E8E93", margin: "4px 0 0" }}>Actuelle: {stop.note}</p>}
          </div>

          {/* Historique */}
          {logs.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowHistory(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#007AFF", fontWeight: 600, padding: 0 }}>
                📋 Historique ({logs.length}) {showHistory ? "▲" : "▼"}
              </button>
              {showHistory && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  {logs.map((log, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#6D6D72" }}>
                      <span style={{ flexShrink: 0 }}>{actionIcon(log?.action)}</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, color: "#1C1C1E" }}>{getUserName(log?.byId)}</span>
                        {log?.details && <span> — {log.details}</span>}
                        <div style={{ fontSize: 11, color: "#8E8E93", marginTop: 1 }}>{log?.timestamp ? fmtDate(log.timestamp) + " · " + fmtTime(log.timestamp) : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            {stop.status === "pending" && (
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center", fontSize: 16, padding: "14px 0", gap: 10 }} onClick={() => setStatus("doing")}>
                <span style={{ fontSize: 14 }}>&#9654;</span> Démarrer
              </button>
            )}
            {stop.status === "doing" && (
              <>
                <button className="btn btn-outline" style={{ width: 52, height: 44, padding: 0, justifyContent: "center", borderColor: "#C7C7CC", color: "#1C1C1E" }} onClick={() => setStatus("pending")} title="Remettre à faire">&#8634;</button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center", gap: 8 }} onClick={() => setStatus("completed")}>
                  <span style={{ fontSize: 13 }}>&#10003;</span> Terminé
                </button>
                <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center", gap: 8, borderColor: "#1C1C1E", color: "#1C1C1E" }} onClick={() => setStatus("failed")}>
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
