import { useState } from "react";
import { fmtTime } from "../utils/helpers";

export function GestionRoutesSection({ stops, drivers, addStop, updateStop, deleteStop, showToast }) {
  const [newStopModal, setNewStopModal] = useState(false);
  const [editStopModal, setEditStopModal] = useState(null);
  const [newStop, setNewStop] = useState({
    type: "delivery", clientName: "", clientPhone: "", address: "", instructions: "", assignedTo: "", scheduledDate: null, order: 0
  });

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

  return (
    <div>
      {drivers.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button className="btn btn-purple" onClick={() => { setNewStop(n => ({ ...n, assignedTo: drivers[0]?.id || "" })); setNewStopModal(true); }}>+ Arrêt</button>
        </div>
      )}

      {drivers.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#8E8E93" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚐</div>
          <p style={{ fontWeight: 600 }}>Aucun livreur</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Ajoute un utilisateur avec la fonction Livreur.</p>
        </div>
      )}

      {drivers.map(driver => {
        const driverStops = stops.filter(s => s.assignedTo === driver.id);

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

      {/* Add stop modal */}
      {newStopModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setNewStopModal(false)}>
          <div className="sheet">
            <div className="handle" />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>📍 Ajouter un arrêt</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="lbl">Type</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[["delivery", "📦 Livraison"], ["pickup", "📤 Ramassage"]].map(([v, l]) => (
                    <button key={v} onClick={() => setNewStop(n => ({ ...n, type: v }))} className="btn"
                      style={{ flex: 1, justifyContent: "center", background: newStop.type === v ? "#111" : "white", color: newStop.type === v ? "white" : "#3A3A3C", border: "1.5px solid", borderColor: newStop.type === v ? "#111" : "#E5E5EA" }}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="lbl">Livreur</label>
                <select className="sel" value={newStop.assignedTo} onChange={e => setNewStop(n => ({ ...n, assignedTo: e.target.value }))}>
                  <option value="">— Choisir —</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.displayName}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Date</label>
                <input
                  type="date"
                  className="inp"
                  value={newStop.scheduledDate ? new Date(newStop.scheduledDate).toISOString().split("T")[0] : ""}
                  onChange={e => setNewStop(n => ({ ...n, scheduledDate: e.target.value ? new Date(e.target.value + "T12:00:00") : null }))}
                />
              </div>
              <div><label className="lbl">Client</label><input className="inp" placeholder="Sophie Tremblay" value={newStop.clientName} onChange={e => setNewStop(n => ({ ...n, clientName: e.target.value }))} /></div>
              <div><label className="lbl">Téléphone</label><input className="inp" type="tel" placeholder="514-555-0101" value={newStop.clientPhone} onChange={e => setNewStop(n => ({ ...n, clientPhone: e.target.value }))} /></div>
              <div><label className="lbl">Adresse</label><input className="inp" placeholder="1234 rue Ste-Catherine" value={newStop.address} onChange={e => setNewStop(n => ({ ...n, address: e.target.value }))} /></div>
              <div><label className="lbl">Instructions</label><input className="inp" placeholder="Sonner 2 fois…" value={newStop.instructions} onChange={e => setNewStop(n => ({ ...n, instructions: e.target.value }))} /></div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setNewStopModal(false)}>Annuler</button>
                <button className="btn btn-purple" style={{ flex: 2, justifyContent: "center" }} onClick={handleAddStop}>Ajouter</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit stop modal */}
      {editStopModal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setEditStopModal(null)}>
          <div className="sheet">
            <div className="handle" />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>✏️ Modifier l'arrêt</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="lbl">Type</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[["delivery", "📦 Livraison"], ["pickup", "📤 Ramassage"]].map(([v, l]) => (
                    <button key={v} onClick={() => setEditStopModal(n => ({ ...n, type: v }))} className="btn"
                      style={{ flex: 1, justifyContent: "center", background: editStopModal.type === v ? "#111" : "white", color: editStopModal.type === v ? "white" : "#3A3A3C", border: "1.5px solid", borderColor: editStopModal.type === v ? "#111" : "#E5E5EA" }}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="lbl">Livreur</label>
                <select className="sel" value={editStopModal.assignedTo} onChange={e => setEditStopModal(n => ({ ...n, assignedTo: e.target.value }))}>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.displayName}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Date</label>
                <input
                  type="date"
                  className="inp"
                  value={editStopModal.scheduledDate ? (editStopModal.scheduledDate.toDate ? editStopModal.scheduledDate.toDate().toISOString().split("T")[0] : new Date(editStopModal.scheduledDate).toISOString().split("T")[0]) : ""}
                  onChange={e => setEditStopModal(n => ({ ...n, scheduledDate: e.target.value ? new Date(e.target.value + "T12:00:00") : null }))}
                />
              </div>
              <div><label className="lbl">Client</label><input className="inp" value={editStopModal.clientName} onChange={e => setEditStopModal(n => ({ ...n, clientName: e.target.value }))} /></div>
              <div><label className="lbl">Téléphone</label><input className="inp" type="tel" value={editStopModal.clientPhone || ""} onChange={e => setEditStopModal(n => ({ ...n, clientPhone: e.target.value }))} /></div>
              <div><label className="lbl">Adresse</label><input className="inp" value={editStopModal.address} onChange={e => setEditStopModal(n => ({ ...n, address: e.target.value }))} /></div>
              <div><label className="lbl">Instructions</label><input className="inp" value={editStopModal.instructions || ""} onChange={e => setEditStopModal(n => ({ ...n, instructions: e.target.value }))} /></div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setEditStopModal(null)}>Annuler</button>
                <button className="btn btn-purple" style={{ flex: 2, justifyContent: "center" }} onClick={handleEditStop}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminStopRow({ stop, index, total, dateKey, onMove, onEdit, onDelete }) {
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
