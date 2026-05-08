import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { fmtTime } from "../utils/helpers";

export function AdminStopRow({ stop, index, dateKey, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id, disabled: !dateKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: "relative",
    background: isDragging ? "#fff" : undefined,
    boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,.15)" : undefined,
    borderRadius: isDragging ? 12 : undefined,
    scale: isDragging ? "1.02" : undefined,
    opacity: isDragging ? 0.95 : 1,
  };

  const statusColor = {
    completed: "#34C759",
    doing: "#FF9500",
    failed: "#FF3B30",
    pending: "#E5E5EA",
  };

  const statusTextColor = {
    completed: "white",
    doing: "white",
    failed: "white",
    pending: "#8E8E93",
  };

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "8px 0",
        borderBottom: "1px solid #F2F2F7",
        cursor: "pointer",
        userSelect: "none",
        ...style,
      }}
    >
      {dateKey && (
        <div
          {...attributes}
          {...listeners}
          className="drag-grip"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "6px 4px",
            cursor: "grab",
            touchAction: "none",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="6" r="1.5" fill="#C7C7CC" />
            <circle cx="15" cy="6" r="1.5" fill="#C7C7CC" />
            <circle cx="9" cy="12" r="1.5" fill="#C7C7CC" />
            <circle cx="15" cy="12" r="1.5" fill="#C7C7CC" />
            <circle cx="9" cy="18" r="1.5" fill="#C7C7CC" />
            <circle cx="15" cy="18" r="1.5" fill="#C7C7CC" />
          </svg>
        </div>
      )}

      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: statusColor[stop.status] || "#E5E5EA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          flexShrink: 0,
          color: statusTextColor[stop.status] || "#8E8E93",
          fontWeight: 700,
        }}
      >
        {stop.status === "completed" ? "✓" : stop.status === "failed" ? "✕" : stop.order || index + 1}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span>{stop.type === "delivery" ? "📦" : "📤"}</span>
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: stop.status === "completed" || stop.status === "failed" ? "#8E8E93" : "#1C1C1E",
              textDecoration: stop.status === "completed" || stop.status === "failed" ? "line-through" : "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {stop.clientName}
          </span>
          {stop.status === "completed" && (
            <span style={{ fontSize: 11, color: "#34C759", fontWeight: 600, flexShrink: 0 }}>
              ✓ {fmtTime(stop.completedAt)}
            </span>
          )}
          {stop.status === "failed" && (
            <span style={{ fontSize: 10, color: "#FF3B30", fontWeight: 600, background: "#FFF5F5", padding: "2px 6px", borderRadius: 6, flexShrink: 0 }}>
              ❌ Échoué
            </span>
          )}
          {stop.status === "doing" && (
            <span
              style={{
                fontSize: 10,
                color: "#FF9500",
                fontWeight: 600,
                background: "#FFF3E0",
                padding: "2px 6px",
                borderRadius: 6,
                flexShrink: 0,
              }}
            >
              En cours
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: "#6D6D72", display: "flex", alignItems: "center", gap: 6 }}>
          📍 {stop.address}
          {stop.note && <span style={{ fontSize: 10, color: "#8E8E93" }}>📝</span>}
        </p>
        {stop.note && (
          <p style={{ fontSize: 11, color: "#8E8E93", marginTop: 4 }}>{stop.note}</p>
        )}
        {!stop.assignedTo && (
          <p style={{ fontSize: 11, color: "#FF3B30", marginTop: 4, fontWeight: 500 }}>Non assigné</p>
        )}
      </div>

      {/* Chevron → */}
      <div style={{ fontSize: 14, color: "#C7C7CC", flexShrink: 0, alignSelf: "center" }}>›</div>
    </div>
  );
}
