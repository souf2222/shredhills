// src/dashboard/modals/NewStopModal.jsx
export function NewStopModal({ newStop, setNewStop, drivers, tourneeDate, setTourneeDate, onAdd, onClose }) {
  const hasTourneeDate = tourneeDate !== undefined && setTourneeDate !== undefined;

  const getDateStr = () => {
    const d = hasTourneeDate ? tourneeDate : newStop.scheduledDate;
    if (!d || isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  const setDate = (val) => {
    if (hasTourneeDate) {
      setTourneeDate(val ? new Date(val + "T12:00:00") : new Date());
    } else {
      setNewStop(n => ({ ...n, scheduledDate: val ? new Date(val + "T12:00:00") : null }));
    }
  };

  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="handle"/>
        <h3 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>📍 Ajouter un arrêt</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label className="lbl">Type</label>
            <div style={{ display:"flex", gap:10 }}>
              {[["delivery","📦 Livraison"],["pickup","📤 Ramassage"]].map(([v,l]) => (
                <button key={v} onClick={() => setNewStop(n => ({...n,type:v}))} className="btn"
                  style={{ flex:1, justifyContent:"center", background:newStop.type===v?"#111":"white", color:newStop.type===v?"white":"#3A3A3C", border:"1.5px solid", borderColor:newStop.type===v?"#111":"#E5E5EA" }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="lbl">Livreur <span style={{ color: "#8E8E93", fontWeight: 400 }}>(optionnel)</span></label>
            <select className="sel" value={newStop.assignedTo} onChange={e => setNewStop(n => ({...n,assignedTo:e.target.value}))}>
              <option value="">Non assigné</option>
              {drivers.filter(d => d.permissions?.canViewDeliveries).map(d => <option key={d.id} value={d.id}>{d.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Date</label>
            <input type="date" className="inp" value={getDateStr()} onChange={e => setDate(e.target.value)}/>
          </div>
          <div><label className="lbl">Client <span style={{ color: "#FF3B30" }}>*</span></label><input className="inp" placeholder="Sophie Tremblay" value={newStop.clientName} onChange={e => setNewStop(n => ({...n,clientName:e.target.value}))}/></div>
          <div><label className="lbl">Téléphone</label><input className="inp" type="tel" placeholder="514-555-0101" value={newStop.clientPhone} onChange={e => setNewStop(n => ({...n,clientPhone:e.target.value}))}/></div>
          <div><label className="lbl">Adresse <span style={{ color: "#FF3B30" }}>*</span></label><input className="inp" placeholder="1234 rue Ste-Catherine" value={newStop.address} onChange={e => setNewStop(n => ({...n,address:e.target.value}))}/></div>
          <div><label className="lbl">Instructions</label><input className="inp" placeholder="Sonner 2 fois…" value={newStop.instructions} onChange={e => setNewStop(n => ({...n,instructions:e.target.value}))}/></div>
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onClose}>Annuler</button>
            <button className="btn btn-purple" style={{ flex:2, justifyContent:"center" }} onClick={onAdd}>Ajouter</button>
          </div>
        </div>
      </div>
    </div>
  );
}
