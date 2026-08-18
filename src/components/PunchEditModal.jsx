// src/components/PunchEditModal.jsx
import { useState } from "react";
import { fmtTimeInput } from "../utils/helpers";

export function PunchEditModal({ punch, onSave, onClose, onDelete }) {
  const [pIn, setPIn] = useState(fmtTimeInput(punch.punchIn));
  const [pOut, setPOut] = useState(punch.punchOut ? fmtTimeInput(punch.punchOut) : "");
  const [note, setNote] = useState(punch.note || "");
  const [confirming, setConfirming] = useState(false);
  const changed = pIn !== fmtTimeInput(punch.punchIn) || (pOut !== (punch.punchOut ? fmtTimeInput(punch.punchOut) : ""));
  const ok = !changed || note.trim().length > 0;

  const save = () => {
    const ni = new Date(pIn).getTime(),
      no = pOut ? new Date(pOut).getTime() : null;
    if (isNaN(ni) || (no && no <= ni)) return;
    onSave({ ...punch, punchIn: ni, punchOut: no, note });
  };

  if (confirming) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.4)",
          backdropFilter: "blur(8px)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: 28,
            width: 380,
            maxWidth: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,.15)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Supprimer la session ?</h3>
          <p style={{ fontSize: 14, color: "#8E8E93", marginBottom: 20 }}>
            Cette action est irréversible.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setConfirming(false)}>
              Annuler
            </button>
            <button className="btn btn-red" style={{ flex: 1, justifyContent: "center" }} onClick={onDelete}>
              Supprimer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.4)",
        backdropFilter: "blur(8px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: 28,
          width: 420,
          maxWidth: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,.15)",
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>✏️ Modifier la session</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="lbl">Punch in</label>
            <input type="datetime-local" className="inp" value={pIn} onChange={(e) => setPIn(e.target.value)} />
          </div>
          <div>
            <label className="lbl">Punch out</label>
            <input type="datetime-local" className="inp" value={pOut} onChange={(e) => setPOut(e.target.value)} />
          </div>
          <div>
            <label className="lbl">
              Note {changed && <span style={{ color: "#FF9500" }}>(obligatoire)</span>}
            </label>
            <input className="inp" placeholder="Ex: Oublié de puncher à 8h30…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {changed && !note.trim() && (
            <p style={{ fontSize: 12, color: "#FF9500" }}>⚠️ Note requise pour toute modification.</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn btn-red" style={{ flex: 1, justifyContent: "center" }} onClick={() => setConfirming(true)}>
            Supprimer
          </button>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" style={{ flex: 2, justifyContent: "center", opacity: ok ? 1 : 0.5 }} onClick={() => ok && save()}>
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
