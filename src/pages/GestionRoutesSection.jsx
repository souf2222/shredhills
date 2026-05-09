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

export function GestionRoutesSection({ stops, drivers, contacts, addStop, updateStop, deleteStop, showToast }) {
  const [newStopModal, setNewStopModal] = useState(false);
  const [editStopModal, setEditStopModal] = useState(null);
  const [newStop, setNewStop] = useState({
    type: "delivery", contactId: null, clientName: "", clientPhone: "", address: "", instructions: "", assignedTo: "", scheduledDate: null, order: 0
  });
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const dateMatchesFilter = (dateLike) => {
    if (!dateLike) return dateFilter === "today" || dateFilter === "week";
    const dateObj = dateLike?.toDate ? dateLike.toDate() : new Date(dateLike);
    if (isNaN(dateObj.getTime())) return false;
    const d = new Date(dateObj); d.setHours(0, 0, 0, 0);
    const ms = d.getTime();
    if (dateFilter === "today") return ms === todayMs;
    if (dateFilter === "tomorrow") return ms === todayMs + DAY;
    if (dateFilter === "week") {
      const dayOfWeek = today.getDay() || 7;
      const monday = todayMs - (dayOfWeek - 1) * DAY;
      const sunday = monday + 6 * DAY;
      return ms >= monday && ms <= sunday;
    }
    if (dateFilter === "custom" && customStart) {
      const s = new Date(customStart).getTime();
      const e = customEnd ? new Date(customEnd).getTime() + DAY - 1 : s + DAY - 1;
      return ms >= s && ms <= e;
    }
    return true;
  };

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
    setNewStop({ type: "delivery", contactId: null, clientName: "", clientPhone: "", address: "", instructions: "", assignedTo: "", scheduledDate: null, order: 0 });
    setNewStopModal(false);
    showToast && showToast("Arrêt ajouté !");
  };

  const handleEditStop = async () => {
    if (!editStopModal.clientName || !editStopModal.address) return;
    await updateStop(editStopModal.id, {
      contactId: editStopModal.contactId || null,
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
      if (!dateMatchesFilter(s.scheduledDate)) return false;
      if (!norm) return true;
      return (
        (s.clientName || "").toLowerCase().includes(norm) ||
        (s.address || "").toLowerCase().includes(norm) ||
        (s.instructions || "").toLowerCase().includes(norm)
      );
    });
  }, [stops, searchText, statusFilter, driverFilter, dateFilter, customStart, customEnd]);

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
    if (searchText.trim() || statusFilter !== "all" || dateFilter !== "today") return hasAnyFiltered;
    return true;
  });

  const totalStops = stops.length;
  const filteredCount = filteredStops.length;
  const unassignedCount = stops.filter(s => !s.assignedTo).length;

  const driverOptions = [
    { value: "all", label: "Tous les livreurs" },
    ...(unassignedCount > 0
      ? [{ value: "", label: `Non assignés (${unassignedCount})` }]
      : []),
    ...drivers
    .filter(d => d.permissions?.canViewDeliveries)
    .map(d => ({ value: d.id, label: d.displayName })),
  ];

  const showNoDateUnassigned = dateFilter === "today" || dateFilter === "week";

  const hasAnyVisibleStop =
    driversToShow.length > 0 ||
    (showNoDateUnassigned && stopsByDriver.unassigned.length > 0) ||
    stopsByDriver.unassigned.some(s => dateMatchesFilter(s.scheduledDate));

  // Recompute which dates pass the filter for a given driver
  const getFilteredDatesForDriver = (driverStops) => {
    const { stopsByDate, noDateStops } = groupStopsByDate(driverStops);
    const sortedDatesAll = Object.keys(stopsByDate).sort((a, b) => new Date(a) - new Date(b));
    const filteredDates = sortedDatesAll.filter(dk => {
      const d = new Date(dk); d.setHours(0, 0, 0, 0);
      const ms = d.getTime();
      if (dateFilter === "today") return ms === todayMs;
      if (dateFilter === "tomorrow") return ms === todayMs + DAY;
      if (dateFilter === "week") {
        const dayOfWeek = today.getDay() || 7;
        const monday = todayMs - (dayOfWeek - 1) * DAY;
        const sunday = monday + 6 * DAY;
        return ms >= monday && ms <= sunday;
      }
      if (dateFilter === "custom" && customStart) {
        const s = new Date(customStart).getTime();
        const e = customEnd ? new Date(customEnd).getTime() + DAY - 1 : s + DAY - 1;
        return ms >= s && ms <= e;
      }
      return true;
    });
    return { filteredDates, stopsByDate, noDateStops };
  };

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
          hasFilters={statusFilter !== "all" || searchText.trim().length > 0 || driverFilter !== "all" || dateFilter !== "today" || customStart}
          onReset={() => { setStatusFilter("all"); setSearchText(""); setDriverFilter("all"); setDateFilter("today"); setCustomStart(""); setCustomEnd(""); }}
          filters={[
            {
              key: "dateFilter",
              type: "toggle-group",
              value: dateFilter,
              options: [
                { value: "today", label: "Aujourd'hui", color: "#007AFF" },
                { value: "tomorrow", label: "Demain", color: "#007AFF" },
                { value: "week", label: "Cette semaine", color: "#007AFF" },
                { value: "custom", label: "Personnalisé", color: "#007AFF" },
              ],
              onChange: setDateFilter,
            },
            ...(dateFilter === "custom"
              ? [
                  {
                    key: "customRange",
                    type: "date-range",
                    value: { from: customStart, to: customEnd },
                    onChange: (val) => {
                      setCustomStart(val.from || "");
                      setCustomEnd(val.to || "");
                    },
                  },
                ]
              : []),
            {
              key: "status",
              type: "select",
              label: "Statut",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "all", label: "Tous les statuts" },
                { value: "pending", label: "À faire" },
                { value: "doing", label: "En cours" },
                { value: "completed", label: "Complétés" },
                { value: "failed", label: "Échoués" },
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

        {(driverFilter === "all" || driverFilter === "") && showNoDateUnassigned && stopsByDriver.unassigned.length > 0 && (
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

        {!hasAnyVisibleStop && drivers.length > 0 && (
          <div className="card" style={{ textAlign: "center", padding: 48, marginTop: 10 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚐</div>
            <p style={{ fontWeight: 700, fontSize: 17, color: "#1C1C1E" }}>Aucun arrêt</p>
            <p style={{ color: "#8E8E93", fontSize: 14, marginTop: 4 }}>Aucun arrêt pour cette période</p>
          </div>
        )}

        {driversToShow.map(driver => {
          const driverStops = filteredStops.filter(s => s.assignedTo === driver.id);
          const { filteredDates, stopsByDate, noDateStops } = getFilteredDatesForDriver(driverStops);

          if ((searchText.trim() || statusFilter !== "all" || driverFilter !== "all") && driverStops.length === 0) {
            return null;
          }

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

              {filteredDates.length === 0 && noDateStops.length === 0 && (
                <p style={{ fontSize: 13, color: "#C7C7CC", textAlign: "center", padding: "10px 0" }}>Aucun arrêt</p>
              )}

              {filteredDates.map(dateKey => renderDateGroup(driver.id, dateKey, stopsByDate[dateKey]))}

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
            contacts={contacts}
            onAdd={handleAddStop}
            onClose={() => setNewStopModal(false)}
          />
        )}

        {editStopModal && (
          <EditStopModal
            editStopModal={editStopModal}
            setEditStopModal={setEditStopModal}
            drivers={drivers}
            contacts={contacts}
            onSave={handleEditStop}
            onClose={() => setEditStopModal(null)}
            onDelete={() => handleDeleteStop(editStopModal.id)}
          />
        )}
      </div>
    </DndContext>
  );
}
