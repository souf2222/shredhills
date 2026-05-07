// src/dashboard/modals/EditStopModal.jsx
export function EditStopModal({ editStopModal, setEditStopModal, drivers, onSave, onClose }) {
  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="handle"/>
        <h3 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>✏️ Modifier l'arrêt</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label className="lbl">Type</label>
            <div style={{ display:"flex", gap:10 }}>
              {[["delivery","📦 Livraison"],["pickup","📤 Ramassage"]].map(([v,l]) => (
                <button key={v} onClick={() => setEditStopModal(n => ({...n,type:v}))} className="btn"
                  style={{ flex:1, justifyContent:"center", background:editStopModal.type===v?"#111":"white", color:editStopModal.type===v?"white":"#3A3A3C", border:"1.5px solid", borderColor:editStopModal.type===v?"#111":"#E5E5EA" }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="lbl">Livreur</label>
            <select className="sel" value={editStopModal.assignedTo} onChange={e => setEditStopModal(n => ({...n,assignedTo:e.target.value}))}>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">Date</label>
            <input type="date" className="inp"
              value={editStopModal.scheduledDate ? (editStopModal.scheduledDate.toDate ? editStopModal.scheduledDate.toDate().toISOString().split("T")[0] : new Date(editStopModal.scheduledDate).toISOString().split("T")[0]) : ""}
              onChange={e => setEditStopModal(n => ({...n, scheduledDate: e.target.value ? new Date(e.target.value + "T12:00:00") : null}))}
            />
          </div>
          <div><label className="lbl">Client</label><input className="inp" placeholder="Sophie Tremblay" value={editStopModal.clientName} onChange={e => setEditStopModal(n => ({...n,clientName:e.target.value}))}/></div>
          <div><label className="lbl">Téléphone</label><input className="inp" type="tel" placeholder="514-555-0101" value={editStopModal.clientPhone || ""} onChange={e => setEditStopModal(n => ({...n,clientPhone:e.target.value}))}/></div>
          <div><label className="lbl">Adresse</label><input className="inp" placeholder="1234 rue Ste-Catherine" value={editStopModal.address} onChange={e => setEditStopModal(n => ({...n,address:e.target.value}))}/></div>
          <div><label className="lbl">Instructions</label><input className="inp" placeholder="Sonner 2 fois…" value={editStopModal.instructions || ""} onChange={e => setEditStopModal(n => ({...n,instructions:e.target.value}))}/></div>
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onClose}>Annuler</button>
            <button className="btn btn-purple" style={{ flex:2, justifyContent:"center" }} onClick={onSave}>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
