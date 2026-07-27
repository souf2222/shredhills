import { useState } from "react";
import { todayStr } from "../utils/helpers";

export function PunchAddModal({ user, onSave, onClose }) {
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [note, setNote] = useState("");

  const start = new Date(`${date}T${startTime}`).getTime();
  const end = new Date(`${date}T${endTime}`).getTime();
  const valid = start < end;

  const save = () => {
    if (!valid) return;
    const id = `P-${Date.now().toString(36).toUpperCase()}`;
    onSave({ id, punchIn: start, punchOut: end, note: note.trim() || "" });
  };

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
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          ➕ Ajouter un pointage
        </h3>
        <p style={{ fontSize: 13, color: "#8E8E93", marginBottom: 20 }}>
          {user.displayName}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="lbl">Date</label>
            <input
              type="date"
              className="inp"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="lbl">Début</label>
              <input
                type="time"
                className="inp"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="lbl">Fin</label>
              <input
                type="time"
                className="inp"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="lbl">Note (optionnelle)</label>
            <input
              className="inp"
              placeholder="Raison du pointage manuel..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {!valid && (
            <p style={{ fontSize: 12, color: "#FF3B30" }}>
              ⚠️ L'heure de fin doit être après l'heure de début.
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            className="btn btn-outline"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2, justifyContent: "center", opacity: valid ? 1 : 0.5 }}
            onClick={() => valid && save()}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
