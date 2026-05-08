import { useState, useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { toDateKey, groupStopsByDate, DAY } from "../utils/helpers";
import { PageHeader } from "../components/PageHeader";
import { FilterBar } from "../components/FilterBar";
import { AdminStopRow } from "../components/AdminStopRow";
import { NewStopModal } from "../dashboard/modals/NewStopModal";
import { EditStopModal } from "../dashboard/modals/EditStopModal";

export function GestionRoutesSection({ stops, drivers, addStop, updateStop, deleteStop, showToast }) {
  const [newStopModal, setNewStopModal] = useState(false);
  const [editStopModal, setEditStopModal] = useState(null);
  const [newStop, setNewStop] = useState({
    type: "delivery", clientName: "", clientPhone: "", address: "", instructions: "", assignedTo: "", scheduledDate: null, order: 0
  });
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const handleAddStop = async () => {
    if (!newStop.clientName || !newStop.address) return;
    const targetDriverId = newStop.assignedTo || "";
    const driverStops = stops.filter(s => s.assignedTo === targetDriverId && s.status !== "completed");
    const maxOrder = driverStops.length > 0 ? Math.max(...driverStops.map(s => s.order || 0)) : 0;
    await addStop({
      ...newStop,
      status: "pending",
      completedAt: null,
      photoUrl: null,
      signatureUrl: null,
      note: "",
      orderId: null,
      order: maxOrder + 1
    });
    setNewStop({ type: "delivery", clientName: "", clientPhone: "", address: "", instructions: "", assignedTo: "", scheduledDate: null, order: 0 });
    setNewStopModal(false);
    showToast && showToast("Arrêt ajouté !");
  };

  const handleEditStop = async () => {
    if (!editStopModal.clientName || !editStopModal.address) return;
    await updateStop(editStopModal.id, {
      clientName: editStopModal.clientName,
      clientPhone: editStopModal.clientPhone,
      address: editStopModal.address,
      instructions: editStopModal.instructions,
      note: editStopModal.note,
      type: editStopModal.type,
      assignedTo: editStopModal.assignedTo,
      scheduledDate: editStopModal.scheduledDate
    });
    setEditStopModal(null);
    showToast && showToast("Arrêt modifié !");
  };

  const handleDeleteStop = async (id) => {
    if (!window.confirm("Supprimer cet arrêt ?")) return;
    try { await deleteStop(id); showToast && showToast("Arrêt supprimé"); }
    catch (e) { showToast && showToast("Erreur: " + e.message); }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeStop = stops.find(s => s.id === active.id);
    const overStop = stops.find(s => s.id === over.id);
    if (!activeStop || !overStop) return;
    if (activeStop.assignedTo !== overStop.assignedTo) return;
    if (toDateKey(activeStop.scheduledDate) !== toDateKey(overStop.scheduledDate)) return;

    const dateStr = toDateKey(activeStop.scheduledDate);
    const driverStops = stops.filter(
      s => s.assignedTo === activeStop.assignedTo && s.scheduledDate && toDateKey(s.scheduledDate) === dateStr
    );
    const sorted = [...driverStops].sort((a, b) => (a.order || 0) - (b.order || 0));

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

  const filteredStops = useMemo(() => {
    const norm = searchText.trim().toLowerCase();
    return stops.filter(s => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (driverFilter !== "all" && s.assignedTo !== driverFilter) return false;
      if (!norm) return true;
      return (
        (s.clientName || "").toLowerCase().includes(norm) ||
        (s.address || "").toLowerCase().includes(norm) ||
        (s.instructions || "").toLowerCase().includes(norm)
      );
    });
  }, [stops, searchText, statusFilter, driverFilter]);

  const stopsByDriver = useMemo(() => {
    const byDriver = {};
    const unassigned = [];
    filteredStops.forEach(s => {
      if (!s.assignedTo) {
        unassigned.push(s);
      } else {
        if (!byDriver[s.assignedTo]) byDriver[s.assignedTo] = [];
        byDriver[s.assignedTo].push(s);
      }
    });
    return { byDriver, unassigned };
  }, [filteredStops]);

  const driversToShow = drivers.filter(d => {
    if (!d.permissions?.canViewDeliveries) return false;
    const hasAnyFiltered = filteredStops.some(s => s.assignedTo === d.id);
    if (driverFilter === d.id) return true;
    if (searchText.trim() || statusFilter !== "all") return hasAnyFiltered;
    return true;
  });

  const totalStops = stops.length;
  const filteredCount = filteredStops.length;
  const unassignedCount = stops.filter(s => !s.assignedTo).length;

  const driverOptions = [
    { value: "all", label: "Tous les livreurs" },
    { value: "", label: `Non assignés (${unassignedCount})` },
    ...drivers.filter(d => d.permissions?.canViewDeliveries).map(d => ({ value: d.id, label: d.displayName })),
  ];

  const renderDateGroup = (driverId, dateKey, allStops) => {
    const dateStops = [...allStops].sort((a, b) => (a.order || 0) - (b.order || 0));
    const dateObj = new Date(dateKey);
    const dateOnly = new Date(dateObj); dateOnly.setHours(0, 0, 0, 0);
    let dateLabel;
    if (dateOnly.getTime() === todayMs) dateLabel = "Aujourd'hui";
    else if (dateOnly.getTime() === todayMs + DAY) dateLabel = "Demain";
    else dateLabel = dateObj.toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short" });

    const pending = dateStops.filter(s => s.status === "pending");
    const doing = dateStops.filter(s => s.status === "doing");
    const completed = dateStops.filter(s => s.status === "completed");
    const failed = dateStops.filter(s => s.status === "failed");

    return (
      <div key={dateKey} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #E5E5EA" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1C1C1E" }}>📅 {dateLabel}</span>
          <span style={{ fontSize: 11, color: "#8E8E93" }}>{pending.length} à faire, {doing.length} en cours, {completed.length} fait, {failed.length} échoué</span>
        </div>
        <SortableContext
          id={`${driverId}_${dateKey}`}
          items={dateStops.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {dateStops.map((stop, i) => (
            <AdminStopRow
              key={stop.id}
              stop={stop}
              index={i}
              dateKey={dateKey}
              onClick={() => setEditStopModal(stop)}
            />
          ))}
        </SortableContext>
      </div>
    );
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div>
        <PageHeader
          title="Gestion tournées"
          total={totalStops}
          filteredCount={filteredCount}
          search={{ value: searchText, onChange: setSearchText, placeholder: "Rechercher un arrêt…" }}
          button={{ text: "+ Arrêt", onClick: () => { setNewStop(n => ({ ...n, assignedTo: drivers[0]?.id || "" })); setNewStopModal(true); }, className: "btn btn-primary" }}
        />

        <FilterBar
          hasFilters={statusFilter !== "all" || searchText.trim().length > 0 || driverFilter !== "all"}
          onReset={() => { setStatusFilter("all"); setSearchText(""); setDriverFilter("all"); }}
          filters={[
            {
              key: "status",
              type: "toggle-group",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "all", label: "Toutes", color: "#6D6D72" },
                { value: "pending", label: "À faire", color: "#AF52DE" },
                { value: "doing", label: "En cours", color: "#FF9500" },
                { value: "completed", label: "Complétés", color: "#34C759" },
                { value: "failed", label: "Échoués", color: "#FF3B30" },
              ],
            },
            {
              key: "driver",
              type: "select",
              value: driverFilter,
              onChange: setDriverFilter,
              options: driverOptions,
            },
          ]}
        />

        {(driverFilter === "all" || driverFilter === "") && stopsByDriver.unassigned.length > 0 && (
          <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid #8E8E93" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: "#8E8E93" + "18", color: "#8E8E93", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
                  ?
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Non assignés</div>
                  <div style={{ fontSize: 11, color: "#8E8E93" }}>{stopsByDriver.unassigned.length} arrêt(s) sans livreur</div>
                </div>
              </div>
            </div>
            {stopsByDriver.unassigned.map((stop, i) => (
              <AdminStopRow key={stop.id} stop={stop} index={i} onClick={() => setEditStopModal(stop)} />
            ))}
          </div>
        )}

        {drivers.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "#8E8E93" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚐</div>
            <p style={{ fontWeight: 600 }}>Aucun livreur</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Ajoute un utilisateur avec la fonction Livreur.</p>
          </div>
        )}

        {driversToShow.map(driver => {
          const driverStops = filteredStops.filter(s => s.assignedTo === driver.id);
          const { stopsByDate, noDateStops } = groupStopsByDate(driverStops);

          if ((searchText.trim() || statusFilter !== "all" || driverFilter !== "all") && driverStops.length === 0) {
            return null;
          }

          const sortedDatesAll = Object.keys(stopsByDate).sort((a, b) => new Date(a) - new Date(b));
          const activeDates = sortedDatesAll.filter(dk => {
            const d = new Date(dk); d.setHours(0, 0, 0, 0); return d.getTime() >= todayMs;
          });
          const pastDates = sortedDatesAll.filter(dk => {
            const d = new Date(dk); d.setHours(0, 0, 0, 0); return d.getTime() < todayMs;
          });
          const pastStops = pastDates.flatMap(dateKey => stopsByDate[dateKey]).sort((a, b) => (a.order || 0) - (b.order || 0));

          const totalPending = driverStops.filter(s => s.status === "pending").length;
          const totalDoing = driverStops.filter(s => s.status === "doing").length;
          const totalCompleted = driverStops.filter(s => s.status === "completed").length;
          const totalFailed = driverStops.filter(s => s.status === "failed").length;

          return (
            <div key={driver.id} className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${driver.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: driver.color + "18", color: driver.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
                    {driver.displayName?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{driver.displayName} <span style={{ fontSize: 13, color: "#AF52DE" }}>🚐</span></div>
                    <div style={{ fontSize: 11, color: "#8E8E93" }}>{driver.email}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 14, textAlign: "center" }}>
                  <div><div style={{ fontSize: 20, fontWeight: 700, color: "#AF52DE" }}>{totalPending}</div><div style={{ fontSize: 11, color: "#8E8E93" }}>à faire</div></div>
                  <div><div style={{ fontSize: 20, fontWeight: 700, color: "#FF9500" }}>{totalDoing}</div><div style={{ fontSize: 11, color: "#8E8E93" }}>en cours</div></div>
                  <div><div style={{ fontSize: 20, fontWeight: 700, color: "#34C759" }}>{totalCompleted}</div><div style={{ fontSize: 11, color: "#8E8E93" }}>fait</div></div>
                  <div><div style={{ fontSize: 20, fontWeight: 700, color: "#FF3B30" }}>{totalFailed}</div><div style={{ fontSize: 11, color: "#8E8E93" }}>échoués</div></div>
                </div>
              </div>

              {activeDates.length === 0 && pastStops.length === 0 && noDateStops.length === 0 && (
                <p style={{ fontSize: 13, color: "#C7C7CC", textAlign: "center", padding: "10px 0" }}>Aucun arrêt</p>
              )}

              {activeDates.map(dateKey => renderDateGroup(driver.id, dateKey, stopsByDate[dateKey]))}

              {pastStops.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "2px dashed #E5E5EA" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #E5E5EA" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#8E8E93" }}>📅 Passés</span>
                  </div>
                  {pastStops.map((stop, i) => (
                    <AdminStopRow key={stop.id} stop={stop} index={i} onClick={() => setEditStopModal(stop)} />
                  ))}
                </div>
              )}

              {noDateStops.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "2px dashed #E5E5EA" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🔲 Sans date ({noDateStops.length})</p>
                  {noDateStops.map((stop, i) => (
                    <AdminStopRow key={stop.id} stop={stop} index={i} onClick={() => setEditStopModal(stop)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {newStopModal && (
          <NewStopModal
            newStop={newStop}
            setNewStop={setNewStop}
            drivers={drivers}
            onAdd={handleAddStop}
            onClose={() => setNewStopModal(false)}
          />
        )}

        {editStopModal && (
          <EditStopModal
            editStopModal={editStopModal}
            setEditStopModal={setEditStopModal}
            drivers={drivers}
            onSave={handleEditStop}
            onClose={() => setEditStopModal(null)}
            onDelete={() => handleDeleteStop(editStopModal.id)}
          />
        )}
      </div>
    </DndContext>
  );
}
