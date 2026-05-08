import { fmtTime } from "../utils/helpers";

export function CompletedStopCard({ stop }) {
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
