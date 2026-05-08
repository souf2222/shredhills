import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { groupStopsByDate, DAY, toDateKey } from "../utils/helpers";
import { PageHeader } from "../components/PageHeader";
import { DriverStopRow } from "../components/DriverStopRow";
import { StopDetailModal } from "../dashboard/modals/StopDetailModal";

function StaticRow({ stop, index, onClick }) {
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
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0 10px 34px",
        borderBottom: "1px solid #F2F2F7",
        cursor: "pointer",
        userSelect: "none",
        opacity: 0.7,
      }}
    >
      <div style={{ width: 20 }} />
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14 }}>{stop.type === "delivery" ? "📦" : "📤"}</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#8E8E93", textDecoration: "line-through", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {stop.clientName}
          </span>
          {stop.status === "failed" && (
            <span style={{ fontSize: 10, color: "#FF3B30", fontWeight: 600, background: "#FFF5F5", padding: "1px 5px", borderRadius: 5, flexShrink: 0 }}>
              Échoué
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: "#6D6D72", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          📍 {stop.address}
        </p>
      </div>
      <div style={{ fontSize: 14, color: "#C7C7CC", flexShrink: 0 }}>›</div>
    </div>
  );
}

export function MesRoutesSection({ stops, updateStop, userProfile, showToast }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const myStops = stops.filter(s => s.assignedTo === userProfile.id);
  const { stopsByDate, noDateStops } = groupStopsByDate(myStops);

  const sortedDates = Object.keys(stopsByDate).sort((a, b) => new Date(a) - new Date(b));

  const totalPending = myStops.filter(s => s.status === "pending").length;
  const totalDoing = myStops.filter(s => s.status === "doing").length;
  const totalCompleted = myStops.filter(s => s.status === "completed").length;
  const totalFailed = myStops.filter(s => s.status === "failed").length;

  const [detailModal, setDetailModal] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    let targetDateKey = null;
    for (const dk of sortedDates) {
      const dateIds = stopsByDate[dk].filter(s => s.status === "pending" || s.status === "doing").map(s => s.id);
      if (dateIds.includes(active.id) && dateIds.includes(over.id)) {
        targetDateKey = dk;
        break;
      }
    }
    if (!targetDateKey && noDateStops.some(s => s.id === active.id)) {
      const noDateIds = noDateStops.filter(s => s.status === "pending" || s.status === "doing").map(s => s.id);
      if (noDateIds.includes(active.id) && noDateIds.includes(over.id)) {
        targetDateKey = "__nodate__";
      }
    }
    if (!targetDateKey) return;

    const group = targetDateKey === "__nodate__"
      ? noDateStops.filter(s => s.status === "pending" || s.status === "doing")
      : stopsByDate[targetDateKey].filter(s => s.status === "pending" || s.status === "doing");

    const sorted = [...group].sort((a, b) => (a.order || 0) - (b.order || 0));
    const oldIndex = sorted.findIndex(s => s.id === active.id);
    const newIndex = sorted.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const newSorted = arrayMove(sorted, oldIndex, newIndex);
    const updates = newSorted.map((s, i) => ({ id: s.id, order: i + 1 }));
    try {
      await Promise.all(updates.map(u => updateStop(u.id, { order: u.order })));
    } catch (e) {
      showToast && showToast("Erreur lors du réordonnancement");
    }
  };

  const renderDateGroup = (dateKey, allStops) => {
    const sorted = [...allStops].sort((a, b) => (a.order || 0) - (b.order || 0));
    const actives = sorted.filter(s => s.status === "pending" || s.status === "doing");
    const inactives = sorted.filter(s => s.status === "completed" || s.status === "failed");

    const isNoDate = dateKey === "__nodate__";
    const dateObj = isNoDate ? null : new Date(dateKey);
    let dateLabel;
    if (isNoDate) dateLabel = "Sans date";
    else {
      const dateOnly = new Date(dateObj); dateOnly.setHours(0, 0, 0, 0);
      if (dateOnly.getTime() === todayMs) dateLabel = "Aujourd'hui";
      else if (dateOnly.getTime() === todayMs + DAY) dateLabel = "Demain";
      else dateLabel = dateObj.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long" });
    }

    const pendingCount = allStops.filter(s => s.status === "pending").length;
    const doingCount = allStops.filter(s => s.status === "doing").length;
    const completedCount = allStops.filter(s => s.status === "completed").length;
    const failedCount = allStops.filter(s => s.status === "failed").length;

    return (
      <div key={dateKey} style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: "2px solid #E5E5EA" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1C1C1E" }}>{isNoDate ? "🔲" : "📅"} {dateLabel}</span>
          <span style={{ fontSize: 12, color: "#8E8E93" }}>{pendingCount} à faire, {doingCount} en cours, {completedCount} fait, {failedCount} échoué</span>
        </div>

        <div className="card" style={{ padding: "4px 16px" }}>
          <SortableContext
            items={actives.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {actives.map((stop, idx) => (
              <DriverStopRow
                key={stop.id}
                stop={stop}
                index={idx}
                updateStop={updateStop}
                showToast={showToast}
                onClick={() => setDetailModal(stop)}
              />
            ))}
          </SortableContext>
          {inactives.map((stop, idx) => (
            <StaticRow
              key={stop.id}
              stop={stop}
              index={actives.length + idx}
              onClick={() => setDetailModal(stop)}
            />
          ))}
        </div>
      </div>
    );
  };

  const activeDates = sortedDates.filter(dk => {
    const d = new Date(dk); d.setHours(0, 0, 0, 0); return d.getTime() >= todayMs;
  });
  const pastDates = sortedDates.filter(dk => {
    const d = new Date(dk); d.setHours(0, 0, 0, 0); return d.getTime() < todayMs;
  });
  const pastStops = pastDates.flatMap(dateKey => stopsByDate[dateKey]).sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div>
        <PageHeader title="🚐 Mes tournées" total={myStops.length} />
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[
            { label: "À faire", val: totalPending, c: "#AF52DE" },
            { label: "En cours", val: totalDoing, c: "#FF9500" },
            { label: "Complétés", val: totalCompleted, c: "#34C759" },
            { label: "Échoués", val: totalFailed, c: "#FF3B30" },
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

        {activeDates.map(dateKey => renderDateGroup(dateKey, stopsByDate[dateKey]))}

        {noDateStops.length > 0 && renderDateGroup("__nodate__", noDateStops)}

        {pastStops.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: "2px solid #E5E5EA" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#8E8E93" }}>📅 Passés</span>
              <span style={{ fontSize: 12, color: "#8E8E93" }}>Arrêt(s) antérieur(s) à aujourd'hui</span>
            </div>
            <div className="card" style={{ padding: "4px 16px" }}>
              {pastStops.map((stop, idx) => (
                <StaticRow
                  key={stop.id}
                  stop={stop}
                  index={idx}
                  onClick={() => setDetailModal(stop)}
                />
              ))}
            </div>
          </div>
        )}

        {detailModal && (
          <StopDetailModal
            stop={detailModal}
            onClose={() => setDetailModal(null)}
            updateStop={updateStop}
            showToast={showToast}
          />
        )}
      </div>
    </DndContext>
  );
}
