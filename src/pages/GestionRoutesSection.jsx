import { useState, useMemo } from "react";
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

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const handleAddStop = async () => {
    if (!newStop.clientName || !newStop.address || !newStop.assignedTo) return;
    const driverStops = stops.filter(s => s.assignedTo === newStop.assignedTo && s.status !== "completed");
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

  const handleMoveStop = async (stopId, direction, dateKey) => {
    const stop = stops.find(s => s.id === stopId);
    if (!stop || !stop.scheduledDate) return;

    const dateStr = stop.scheduledDate.toDate ? stop.scheduledDate.toDate().toDateString() : new Date(stop.scheduledDate).toDateString();
    const driverStops = stops.filter(s => s.assignedTo === stop.assignedTo && s.scheduledDate && (s.scheduledDate.toDate ? s.scheduledDate.toDate().toDateString() : new Date(s.scheduledDate).toDateString()) === dateStr);
    const sorted = [...driverStops].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = sorted.findIndex(s => s.id === stopId);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const swapped = sorted[newIdx];
    const orderA = sorted[idx].order ?? (idx + 1);
    const orderB = swapped.order ?? (newIdx + 1);
    await updateStop(stopId, { order: orderB });
    await updateStop(swapped.id, { order: orderA });
  };

  const filteredStops = useMemo(() => {
    const norm = searchText.trim().toLowerCase();
    return stops.filter(s => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!norm) return true;
      return (
        (s.clientName || "").toLowerCase().includes(norm) ||
        (s.address || "").toLowerCase().includes(norm) ||
        (s.instructions || "").toLowerCase().includes(norm)
      );
    });
  }, [stops, searchText, statusFilter]);

  const visibleDrivers = drivers.filter(d => filteredStops.some(s => s.assignedTo === d.id));
  const totalStops = stops.length;
  const filteredCount = filteredStops.length;

  return (
    <div>
      <PageHeader
        title="Tournées"
        total={totalStops}
        filteredCount={filteredCount}
        search={{ value: searchText, onChange: setSearchText, placeholder: "Rechercher un arrêt…" }}
        button={{ text: "+ Arrêt", onClick: () => { setNewStop(n => ({ ...n, assignedTo: drivers[0]?.id || "" })); setNewStopModal(true); }, className: "btn btn-purple" }}
      />

      <FilterBar
        hasFilters={statusFilter !== "all" || searchText.trim().length > 0}
        onReset={() => { setStatusFilter("all"); setSearchText(""); }}
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
            ],
          },
        ]}
      />

      {drivers.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#8E8E93" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚐</div>
          <p style={{ fontWeight: 600 }}>Aucun livreur</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Ajoute un utilisateur avec la fonction Livreur.</p>
        </div>
      )}

      {drivers.map(driver => {
        const hasAny = visibleDrivers.some(d => d.id === driver.id);
        if (!hasAny && (searchText.trim() || statusFilter !== "all")) return null;

        const driverStops = filteredStops.filter(s => s.assignedTo === driver.id);

        const stopsByDate = {};
        const noDateStops = [];
        driverStops.forEach(stop => {
          if (!stop.scheduledDate) {
            noDateStops.push(stop);
          } else {
            const dateKey = stop.scheduledDate.toDate ? stop.scheduledDate.toDate().toDateString() : new Date(stop.scheduledDate).toDateString();
            if (!stopsByDate[dateKey]) stopsByDate[dateKey] = [];
            stopsByDate[dateKey].push(stop);
          }
        });

        const sortedDates = Object.keys(stopsByDate).sort((a, b) => new Date(a) - new Date(b));
        const totalPending = driverStops.filter(s => s.status === "pending").length;
        const totalDoing = driverStops.filter(s => s.status === "doing").length;
        const totalCompleted = driverStops.filter(s => s.status === "completed").length;

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
              </div>
            </div>

            {sortedDates.length === 0 && noDateStops.length === 0 && (
              <p style={{ fontSize: 13, color: "#C7C7CC", textAlign: "center", padding: "10px 0" }}>Aucun arrêt</p>
            )}

            {sortedDates.map(dateKey => {
              const dateStops = [...stopsByDate[dateKey]].sort((a, b) => (a.order || 0) - (b.order || 0));
              const dateObj = new Date(dateKey);
              const dateOnly = new Date(dateObj); dateOnly.setHours(0, 0, 0, 0);
              let dateLabel;
              if (dateOnly.getTime() === today.getTime()) dateLabel = "Aujourd'hui";
              else if (dateOnly.getTime() === today.getTime() + 86400000) dateLabel = "Demain";
              else dateLabel = dateObj.toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short" });

              const pending = dateStops.filter(s => s.status === "pending");
              const doing = dateStops.filter(s => s.status === "doing");
              const completed = dateStops.filter(s => s.status === "completed");

              return (
                <div key={dateKey} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #E5E5EA" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1C1C1E" }}>📅 {dateLabel}</span>
                    <span style={{ fontSize: 11, color: "#AF52DE" }}>({pending.length} à faire, {doing.length} en cours, {completed.length} fait)</span>
                  </div>
                  {dateStops.map((stop, i) => (
                    <AdminStopRow
                      key={stop.id}
                      stop={stop}
                      index={i}
                      total={dateStops.length}
                      dateKey={dateKey}
                      onMove={handleMoveStop}
                      onEdit={() => setEditStopModal(stop)}
                      onDelete={handleDeleteStop}
                    />
                  ))}
                </div>
              );
            })}

            {noDateStops.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "2px dashed #E5E5EA" }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>🔲 Sans date ({noDateStops.length})</p>
                {noDateStops.map((stop, i) => (
                  <AdminStopRow
                    key={stop.id}
                    stop={stop}
                    index={i}
                    total={noDateStops.length}
                    onEdit={() => setEditStopModal(stop)}
                    onDelete={handleDeleteStop}
                  />
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
        />
      )}
    </div>
  );
}
