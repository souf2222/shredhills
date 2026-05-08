import { fmtTime } from "../utils/helpers";

export function AdminStopRow({ stop, index, total, dateKey, onMove, onEdit, onDelete }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0", borderBottom: "1px solid #F2F2F7" }}>
      {dateKey && onMove && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button onClick={() => onMove(stop.id, "up", dateKey)} disabled={index === 0} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, opacity: index === 0 ? 0.3 : 1, fontSize: 10 }}>▲</button>
          <button onClick={() => onMove(stop.id, "down", dateKey)} disabled={index === total - 1} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, opacity: index === total - 1 ? 0.3 : 1, fontSize: 10 }}>▼</button>
        </div>
      )}
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: stop.status === "completed" ? "#34C759" : stop.status === "doing" ? "#FF9500" : "#E5E5EA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, color: stop.status === "completed" || stop.status === "doing" ? "white" : "#8E8E93", fontWeight: 700 }}>
        {stop.status === "completed" ? "✓" : stop.order || index + 1}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span>{stop.type === "delivery" ? "📦" : "📤"}</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: stop.status === "completed" ? "#8E8E93" : "#1C1C1E", textDecoration: stop.status === "completed" ? "line-through" : "none" }}>{stop.clientName}</span>
          {stop.status === "completed" && <span style={{ fontSize: 11, color: "#34C759", fontWeight: 600 }}>✓ {fmtTime(stop.completedAt)}</span>}
          {stop.status === "doing" && <span style={{ fontSize: 10, color: "#FF9500", fontWeight: 600, background: "#FFF3E0", padding: "2px 6px", borderRadius: 6 }}>En cours</span>}
        </div>
        <p style={{ fontSize: 12, color: "#6D6D72" }}>📍 {stop.address}</p>
        {stop.note && <p style={{ fontSize: 11, color: "#8E8E93", marginTop: 4 }}>📝 {stop.note}</p>}
      </div>
      <button className="btn-soft" style={{ fontSize: 12, padding: "4px 8px" }} onClick={onEdit}>✏️</button>
      <button className="btn-soft-red" onClick={() => onDelete(stop.id)}>✕</button>
    </div>
  );
}
