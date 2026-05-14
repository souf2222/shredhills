import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { fmtTime } from "../utils/helpers";

export function DriverStopRow({ stop, index, updateStop, showToast, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

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

  const setStatus = async (e, newStatus) => {
    e.stopPropagation();
    try {
      const data = { status: newStatus };
      if (newStatus === "completed") data.completedAt = Date.now();
      else data.completedAt = null;
      await updateStop(stop.id, data);
      showToast && showToast("Statut mis à jour");
    } catch (err) {
      showToast && showToast("Erreur statut");
    }
  };

  const isActive = stop.status === "pending" || stop.status === "doing";

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid #F2F2F7",
        cursor: "pointer",
        userSelect: "none",
        ...style,
      }}
    >
      {/* Drag grip */}
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
          marginTop: 1,
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

      {/* Status circle */}
      <div
        style={{
          width: 28,
          height: 28,
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

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14 }}>{stop.type === "delivery" ? "📦" : "📤"}</span>
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
          {stop.status === "doing" && (
            <span style={{ fontSize: 10, color: "#FF9500", fontWeight: 600, background: "#FFF3E0", padding: "1px 5px", borderRadius: 5, flexShrink: 0 }}>
              En cours
            </span>
          )}
          {stop.status === "completed" && stop.completedAt && (
            <span style={{ fontSize: 10, color: "#34C759", fontWeight: 600, flexShrink: 0 }}>
              {fmtTime(stop.completedAt)}
            </span>
          )}
          {stop.status === "failed" && (
            <span style={{ fontSize: 10, color: "#FF3B30", fontWeight: 600, background: "#FFF5F5", padding: "1px 5px", borderRadius: 5, flexShrink: 0 }}>
              Échoué
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: "#6D6D72", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
          📍 {stop.address}
          {stop.note && <span style={{ fontSize: 10, color: "#8E8E93", flexShrink: 0 }}>📝</span>}
        </p>
      </div>

      {/* Action buttons */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {stop.status === "pending" && (
          <button
            onClick={(e) => setStatus(e, "doing")}
            className="btn btn-primary"
            style={{ padding: "6px 14px", fontSize: 12, gap: 4, minHeight: 30 }}
            title="Démarrer"
          >
            <span style={{ fontSize: 11 }}>&#9654;</span> Démarrer
          </button>
        )}

        {stop.status === "doing" && (
          <>
            <button
              onClick={(e) => setStatus(e, "completed")}
              className="btn btn-primary"
              style={{ padding: "6px 12px", fontSize: 12, gap: 4, minHeight: 30 }}
              title="Terminé"
            >
              <span style={{ fontSize: 11 }}>&#10003;</span> Terminé
            </button>
            <button
              onClick={(e) => setStatus(e, "failed")}
              className="btn btn-outline"
              style={{ padding: "6px 12px", fontSize: 12, gap: 4, minHeight: 30, borderColor: "#C7C7CC", color: "#1C1C1E" }}
              title="Échouer"
            >
              <span style={{ fontSize: 11 }}>&#10005;</span> Échouer
            </button>
          </>
        )}

        {!isActive && (
          <button
            onClick={(e) => setStatus(e, "pending")}
            className="btn btn-outline"
            style={{ padding: "6px 12px", fontSize: 12, gap: 4, minHeight: 30, borderColor: "#E5E5EA", color: "#8E8E93" }}
            title="Remettre à faire"
          >
            <span style={{ fontSize: 11 }}>&#8634;</span> Réactiver
          </button>
        )}

        {/* Chevron for detail */}
        <div style={{ fontSize: 14, color: "#C7C7CC", marginLeft: 2 }}>›</div>
      </div>
    </div>
  );
}
