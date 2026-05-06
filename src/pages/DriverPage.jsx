// src/pages/DriverPage.jsx
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Nav } from "../components/Nav";
import { Sidebar } from "../components/Sidebar";
import { PunchSection } from "../components/PunchSection";
import { SignatureCanvas } from "../components/SignatureCanvas";
import { Toast } from "../components/Toast";
import { EventsPage } from "./EventsPage";
import { SettingsPage } from "./SettingsPage";
import { MesRoutesSection } from "./MesRoutesSection";
import { fmtMs, fmtTime, dayStart, DAY } from "../utils/helpers";
import { useRoute } from "../hooks/useRoute";

function StopConfirmModal({ stop, onComplete, onCancel }) {
  const [photoTaken, setPhotoTaken] = useState(false);
  const [sigData,    setSigData]    = useState(null);
  const [note,       setNote]       = useState("");
  const [showSig,    setShowSig]    = useState(false);
  const fileRef = useRef(null);
  const canComplete = photoTaken && sigData;

  const complete = () => {
    onComplete({ ...stop, status:"completed", completedAt:Date.now(), photoUrl:"captured", signatureUrl:sigData, note });
  };

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:16 }}>
        <div style={{ background:"white", borderRadius:20, padding:24, width:"100%", maxWidth:500, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 -8px 40px rgba(0,0,0,.15)" }}>
          <div style={{ width:36, height:4, background:"#E5E5EA", borderRadius:2, margin:"0 auto 20px" }}/>
          <div style={{ background:stop.type==="delivery"?"#EFF6FF":"#FFF8ED", borderRadius:14, padding:"14px 16px", marginBottom:20, borderLeft:`4px solid ${stop.type==="delivery"?"#007AFF":"#FF9500"}` }}>
            <p style={{ fontWeight:700, fontSize:15, marginBottom:2 }}>{stop.clientName}</p>
            <p style={{ fontSize:13, color:"#6D6D72", marginBottom:4 }}>📍 {stop.address}</p>
            {stop.clientPhone && <p style={{ fontSize:13, color:"#6D6D72" }}>📞 {stop.clientPhone}</p>}
            {stop.instructions && <div style={{ marginTop:8, background:"rgba(0,0,0,.04)", borderRadius:8, padding:"8px 10px" }}><p style={{ fontSize:12, color:"#6D6D72", fontStyle:"italic" }}>💬 {stop.instructions}</p></div>}
          </div>

          {/* Photo */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:photoTaken?"#34C759":"#E5E5EA", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:photoTaken?"white":"#8E8E93" }}>{photoTaken?"✓":"1"}</div>
              <span style={{ fontWeight:600, fontSize:14, color:photoTaken?"#34C759":"#1C1C1E" }}>Photo de preuve</span>
            </div>
            {!photoTaken ? (
              <button className="btn btn-outline" style={{ width:"100%", justifyContent:"center", gap:10 }} onClick={() => fileRef.current.click()}>
                <span style={{ fontSize:18 }}>📸</span> Prendre une photo
              </button>
            ) : (
              <div style={{ background:"#EDFFF3", borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, color:"#34C759", fontWeight:600 }}>📸 Photo enregistrée</span>
                <button onClick={() => setPhotoTaken(false)} style={{ background:"none", border:"none", fontSize:12, color:"#8E8E93", cursor:"pointer" }}>Reprendre</button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={e => { if(e.target.files[0]) setPhotoTaken(true); }}/>
          </div>

          {/* Signature */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:sigData?"#34C759":"#E5E5EA", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:sigData?"white":"#8E8E93" }}>{sigData?"✓":"2"}</div>
              <span style={{ fontWeight:600, fontSize:14, color:sigData?"#34C759":"#1C1C1E" }}>Signature du client</span>
            </div>
            {!sigData ? (
              <button className="btn btn-outline" style={{ width:"100%", justifyContent:"center", gap:10 }} onClick={() => setShowSig(true)}>
                <span style={{ fontSize:18 }}>✍️</span> Faire signer le client
              </button>
            ) : (
              <div style={{ border:"1px solid #E5E5EA", borderRadius:12, overflow:"hidden" }}>
                <img src={sigData} alt="Signature" style={{ width:"100%", height:80, objectFit:"contain" }}/>
                <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 12px", borderTop:"1px solid #F2F2F7" }}>
                  <span style={{ fontSize:12, color:"#34C759", fontWeight:600 }}>✅ Signature enregistrée</span>
                  <button onClick={() => setSigData(null)} style={{ background:"none", border:"none", fontSize:12, color:"#8E8E93", cursor:"pointer" }}>Resigner</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom:20 }}>
            <label className="lbl">Note (optionnel)</label>
            <input className="inp" placeholder="Ex: Laissé avec le voisin…" value={note} onChange={e => setNote(e.target.value)}/>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onCancel}>Annuler</button>
            <button className="btn btn-green" style={{ flex:2, justifyContent:"center", opacity:canComplete?1:.4 }} onClick={() => canComplete && complete()}>
              ✅ Confirmer
            </button>
          </div>
          {!canComplete && <p style={{ fontSize:12, color:"#FF9500", textAlign:"center", marginTop:8 }}>📸 Photo + ✍️ Signature requis</p>}
        </div>
      </div>
      {showSig && <SignatureCanvas onSave={d => { setSigData(d); setShowSig(false); }} onCancel={() => setShowSig(false)}/>}
    </>
  );
}

export function DriverPage({ db: fsData }) {
  const { userProfile, can } = useAuth();
  const { stops, punches, events, users, addPunchSession, closePunchSession, updatePunchSession, updateStop, addStop, addEvent, updateEvent, deleteEvent } = fsData;

  const { section, navigate, replace } = useRoute();
  const [confirmStop, setConfirmStop] = useState(null);
  const [newStopModal,setNewStopModal]= useState(false);
  const [newStop,     setNewStop]     = useState({ type:"delivery", clientName:"", clientPhone:"", address:"", instructions:"", scheduledDate:null, order:0 });
  const [toast,       setToast]       = useState(null);
  const [tourneeDate, setTourneeDate] = useState(() => { const d = new Date(); d.setHours(12,0,0,0); return d; });

  const showToast = (msg) => setToast(msg);

  const isSameDay = (a, b) => {
    if (!a || !b) return false;
    const dateA = a.toDate ? a.toDate() : new Date(a);
    const dateB = b.toDate ? b.toDate() : new Date(b);
    return dateA.toDateString() === dateB.toDateString();
  };

  const myStops     = stops.filter(s => s.assignedTo === userProfile.id);
  const pending     = myStops.filter(s => s.status === "pending");
  const doing       = myStops.filter(s => s.status === "doing");
  const completed   = myStops.filter(s => s.status === "completed");
  const isClockedIn = (punches[userProfile.id] || []).some(s => dayStart(s.punchIn) === dayStart(Date.now()) && !s.punchOut);

  const completeStop = async (updated) => {
    await updateStop(updated.id, updated);
    setConfirmStop(null);
    showToast("✅ Livraison confirmée !");
  };

  const handleAddStop = async () => {
    if (!newStop.clientName || !newStop.address) return;
    const today = new Date(); today.setHours(12,0,0,0);
    const driverStops = myStops.filter(s => s.status !== "completed");
    const maxOrder = driverStops.length > 0 ? Math.max(...driverStops.map(s => s.order || 0)) : 0;
    await addStop({ 
      ...newStop, 
      assignedTo:userProfile.id, 
      status:"pending", 
      completedAt:null, 
      photoUrl:null, 
      signatureUrl:null, 
      note:"", 
      orderId:null,
      scheduledDate: today,
      order: maxOrder + 1
    });
    setNewStop({ type:"delivery", clientName:"", clientPhone:"", address:"", instructions:"", scheduledDate:null, order:0 });
    setNewStopModal(false);
    showToast("Arrêt ajouté !");
  };

  const tabs = [
    ["tournee", `🚐 Tournée${pending.length + doing.length > 0 ? ` (${pending.length + doing.length})` : ""}`],
  ];
  if (can("canClockIn")) tabs.push(["pointage", "🕐 Pointage"]);
  if (can("canManageEvents") || can("canViewEvents")) tabs.push(["evenements", "📅 Événements"]);
  tabs.push(["parametres", "⚙️ Paramètres"]);

  // URL-driven tab
  const tabIds = tabs.map(([id]) => id);
  const tab = tabIds.includes(section) ? section : (tabIds[0] || "");
  useEffect(() => {
    if (tabIds.length > 0 && !tabIds.includes(section)) {
      replace(tabIds[0]);
    }
  }, [section, tabIds.join("|")]);// eslint-disable-line
  const setTab = (id) => navigate(id);

  return (
    <div className="app-shell">
      <Sidebar
        tabs={tabs}
        active={tab}
        onNavigate={setTab}
        subtitle="Livreur"
        badge={isClockedIn && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(175,82,222,.15)", border:"1px solid rgba(175,82,222,.4)", borderRadius:20, padding:"4px 10px" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#AF52DE", animation:"blink 1s ease infinite", display:"inline-block" }}/>
            <span style={{ fontSize:11, fontWeight:700, color:"#C87AE8" }}>En service</span>
          </div>
        )}
      />

      <div className="app-shell-content" style={{ maxWidth:860, margin:"0 auto" }}>

        {/* MES ROUTES */}
        {tab === "tournee" && (
          <MesRoutesSection
            stops={stops}
            updateStop={updateStop}
            userProfile={userProfile}
            showToast={showToast}
          />
        )}

        {/* POINTAGE */}
        {tab === "pointage" && can("canClockIn") && (
          <PunchSection
            userId={userProfile.id}
            punches={punches}
            addPunchSession={addPunchSession}
            closePunchSession={closePunchSession}
            updatePunchSession={updatePunchSession}
            showToast={showToast}
          />
        )}

        {/* ÉVÉNEMENTS */}
        {tab === "evenements" && (
          <EventsPage events={events} users={users} addEvent={addEvent} updateEvent={updateEvent} deleteEvent={deleteEvent} showToast={showToast}/>
        )}

        {/* PARAMÈTRES */}
        {tab === "parametres" && <SettingsPage showToast={showToast}/>}
      </div>

      {/* Confirmation modal */}
      {confirmStop && <StopConfirmModal stop={confirmStop} onComplete={completeStop} onCancel={() => setConfirmStop(null)}/>}

      {/* Ajout arrêt */}
      {newStopModal && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setNewStopModal(false)}>
          <div className="sheet">
            <div className="handle"/>
            <h3 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>📍 Ajouter un arrêt</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label className="lbl">Type</label>
                <div style={{ display:"flex", gap:10 }}>
                  {[["delivery","📦 Livraison"],["pickup","📤 Ramassage"]].map(([v,l]) => (
                    <button key={v} onClick={() => setNewStop(n => ({...n,type:v}))} className="btn"
                      style={{ flex:1, justifyContent:"center", background:newStop.type===v?"#111":"white", color:newStop.type===v?"white":"#3A3A3C", border:"1.5px solid", borderColor:newStop.type===v?"#111":"#E5E5EA" }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="lbl">Nom du client</label><input className="inp" placeholder="Sophie Tremblay" value={newStop.clientName} onChange={e => setNewStop(n => ({...n,clientName:e.target.value}))}/></div>
              <div><label className="lbl">Téléphone</label><input className="inp" type="tel" placeholder="514-555-0101" value={newStop.clientPhone} onChange={e => setNewStop(n => ({...n,clientPhone:e.target.value}))}/></div>
              <div><label className="lbl">Adresse</label><input className="inp" placeholder="1234 rue Ste-Catherine, Montréal" value={newStop.address} onChange={e => setNewStop(n => ({...n,address:e.target.value}))}/></div>
              <div><label className="lbl">Instructions</label><input className="inp" placeholder="Sonner 2 fois…" value={newStop.instructions} onChange={e => setNewStop(n => ({...n,instructions:e.target.value}))}/></div>
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={() => setNewStopModal(false)}>Annuler</button>
                <button className="btn btn-purple" style={{ flex:2, justifyContent:"center" }} onClick={handleAddStop}>Ajouter</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)}/>}
    </div>
  );
}
