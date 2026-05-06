import { useState } from "react";
import { fmtTime } from "../utils/helpers";

export function MesRoutesSection({ stops, updateStop, userProfile, showToast }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const myStops = stops.filter(s => s.assignedTo === userProfile.id);

  const stopsByDate = {};
  const noDateStops = [];
  myStops.forEach(stop => {
    if (!stop.scheduledDate) {
      noDateStops.push(stop);
    } else {
      const dateKey = stop.scheduledDate.toDate ? stop.scheduledDate.toDate().toDateString() : new Date(stop.scheduledDate).toDateString();
      if (!stopsByDate[dateKey]) stopsByDate[dateKey] = [];
      stopsByDate[dateKey].push(stop);
    }
  });

  const sortedDates = Object.keys(stopsByDate).sort((a, b) => new Date(a) - new Date(b));

  const totalPending = myStops.filter(s => s.status === "pending").length;
  const totalDoing = myStops.filter(s => s.status === "doing").length;
  const totalCompleted = myStops.filter(s => s.status === "completed").length;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { label: "À faire", val: totalPending, c: "#AF52DE" },
          { label: "En cours", val: totalDoing, c: "#FF9500" },
          { label: "Complétés", val: totalCompleted, c: "#34C759" },
        ].map(s => (
          <div key={s.label} className="card" style={{ flex: 1, textAlign: "center", padding: "12px 8px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "#8E8E93", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {sortedDates.length === 0 && noDateStops.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚐</div>
          <p style={{ fontWeight: 700, fontSize: 17 }}>Aucun arrêt</p>
        </div>
      )}

      {sortedDates.map(dateKey => {
        const dateStops = [...stopsByDate[dateKey]].sort((a, b) => (a.order || 0) - (b.order || 0));
        const dateObj = new Date(dateKey);
        const dateOnly = new Date(dateObj); dateOnly.setHours(0, 0, 0, 0);
        let dateLabel;
        if (dateOnly.getTime() === today.getTime()) dateLabel = "Aujourd'hui";
        else if (dateOnly.getTime() === today.getTime() + 86400000) dateLabel = "Demain";
        else dateLabel = dateObj.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long" });

        const pending = dateStops.filter(s => s.status === "pending");
        const doing = dateStops.filter(s => s.status === "doing");
        const completed = dateStops.filter(s => s.status === "completed");

        return (
          <div key={dateKey} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: "2px solid #E5E5EA" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#1C1C1E" }}>📅 {dateLabel}</span>
              <span style={{ fontSize: 12, color: "#8E8E93" }}>({pending.length} à faire, {doing.length} en cours, {completed.length} fait)</span>
            </div>

            {pending.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p className="sec" style={{ marginBottom: 12 }}>À faire ({pending.length})</p>
                {pending.map((stop, idx) => (
                  <DriverStopCard key={stop.id} stop={stop} index={idx} updateStop={updateStop} showToast={showToast} />
                ))}
              </div>
            )}

            {doing.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p className="sec" style={{ marginBottom: 12, color: "#FF9500" }}>En cours ({doing.length})</p>
                {doing.map(stop => (
                  <DriverStopCard key={stop.id} stop={stop} updateStop={updateStop} showToast={showToast} isDoing />
                ))}
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <p className="sec">Complétés ({completed.length})</p>
                {completed.map(stop => (
                  <CompletedStopCard key={stop.id} stop={stop} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {noDateStops.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "2px dashed #E5E5EA" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#8E8E93", marginBottom: 12 }}>🔲 Sans date ({noDateStops.length})</p>
          {noDateStops.map((stop, idx) => (
            <DriverStopCard key={stop.id} stop={stop} index={idx} updateStop={updateStop} showToast={showToast} />
          ))}
        </div>
      )}
    </div>
  );
}

function DriverStopCard({ stop, index, updateStop, showToast, isDoing }) {
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

function CompletedStopCard({ stop }) {
  return (
    <div className="stop-card" style={{ opacity: 0.65 }}>
      <div style={{ height: 3, background: "#34C759" }} />
      <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span>{stop.type === "delivery" ? "📦" : "📤"}</span>
            <span style={{ fontWeight: 600, fontSize: 14, textDecoration: "line-through", color: "#8E8E93" }}>{stop.clientName}</span>
            <span className="badge bd">✓ Fait</span>
          </div>
          <p style={{ fontSize: 12, color: "#C7C7CC" }}>📍 {stop.address}</p>
          {stop.note && <p style={{ fontSize: 11, color: "#8E8E93", marginTop: 4 }}>📝 {stop.note}</p>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: "#34C759", fontWeight: 600 }}>{fmtTime(stop.completedAt)}</p>
        </div>
      </div>
    </div>
  );
}