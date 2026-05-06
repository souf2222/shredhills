// src/pages/EmployeePage.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Nav } from "../components/Nav";
import { Sidebar } from "../components/Sidebar";
import { PunchSection } from "../components/PunchSection";
import { Toast } from "../components/Toast";
import { Modal } from "../components/Modal";
import { PhotoUpload } from "../components/PhotoUpload";
import { PhotoLightbox } from "../components/PhotoLightbox";
import { EventsPage } from "./EventsPage";
import { SettingsPage } from "./SettingsPage";
import { fmtMs, fmtHours, fmtDate, getDL, dayStart, DAY } from "../utils/helpers";
import { useRoute } from "../hooks/useRoute";

function DeadlineRow({ deadline, createdAt }) {
  const info = getDL(deadline);
  const pct  = Math.min(100, Math.round((Date.now() - createdAt) / (deadline - createdAt) * 100));
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:`${info.color}12`, border:`1px solid ${info.color}30`, borderRadius:20, padding:"3px 10px" }}>
          {info.urgent && !info.overdue && <span style={{ width:5, height:5, borderRadius:"50%", background:info.color, display:"inline-block", animation:"blink 1s ease infinite" }}/>}
          <span style={{ fontSize:12, fontWeight:600, color:info.color, fontFamily:"monospace" }}>
            {info.overdue ? "EN RETARD" : info.days > 0 ? `${info.days}j ${info.hours}h restants` : `${info.hours}h restantes`}
          </span>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ flex:1, height:3, background:"#F2F2F7", borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, borderRadius:2, background:`linear-gradient(90deg,${info.color}60,${info.color})`, transition:"width .5s" }}/>
        </div>
        <span style={{ fontSize:10, color:info.color, fontWeight:600, whiteSpace:"nowrap" }}>🏁 {new Date(deadline).toLocaleDateString("fr-CA",{ weekday:"short", month:"short", day:"numeric" })}</span>
      </div>
    </div>
  );
}

function Chrono({ order }) {
  const [el, setEl] = useState(order.elapsed || 0);
  const active = order.status === "inprogress";
  return (
    <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:600, color:active?"#FF6B35":"#8E8E93", background:active?"rgba(255,107,53,.1)":"rgba(142,142,147,.08)", padding:"4px 10px", borderRadius:20, display:"inline-flex", alignItems:"center", gap:5 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:active?"#FF6B35":"#C7C7CC", ...(active?{animation:"blink 1s ease infinite"}:{}) }}/>
      {fmtMs(el)}
    </span>
  );
}

export function EmployeePage({ db: fsData }) {
  const { userProfile, can } = useAuth();
  const {
    orders, punches, purchases, events, users, categories,
    addPunchSession, closePunchSession, updatePunchSession,
    updateOrder, addPurchase, addEvent, updateEvent, deleteEvent,
  } = fsData;

  const { section, navigate, replace } = useRoute();
  const [toast, setToast] = useState(null);
  const [sending, setSending] = useState(null);
  const [newPurchaseModal, setNewPurchaseModal] = useState(false);
  const [newPurchase, setNewPurchase] = useState({ description: "", amount: "", categoryId: "", photoFile: null });
  const [submitting, setSubmitting] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const showToast = (msg) => setToast(msg);

  const myOrders  = orders.filter(o => o.assignedTo === userProfile.id);
  const active    = myOrders.filter(o => o.status !== "done");
  const done      = myOrders.filter(o => o.status === "done");
  const myPurchases = purchases.filter(p => p.empId === userProfile.id);
  const pendingCount = myOrders.filter(o => o.status !== "done").length;

  const startOrder = async (id) => {
    await updateOrder(id, { status:"inprogress", startTime:Date.now(), elapsed:0 });
    showToast("⏱ Chrono démarré !");
  };
  const finishOrder = async (id) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const elapsed = order.startTime ? Date.now() - order.startTime + (order.elapsed || 0) : (order.elapsed || 0);
    await updateOrder(id, { status:"done", endTime:Date.now(), elapsed });
    setSending(null);
    showToast("✅ Commande terminée !");
  };

  const submitPurchase = async () => {
    if (!newPurchase.description.trim() || !newPurchase.amount) {
      showToast("Description et montant requis");
      return;
    }
    if (!newPurchase.categoryId) {
      showToast("Choisis une catégorie");
      return;
    }
    const cat = categories.find(c => c.id === newPurchase.categoryId);
    setSubmitting(true);
    try {
      await addPurchase({
        empId: userProfile.id,
        empName: userProfile.displayName,
        description: newPurchase.description.trim(),
        amount: parseFloat(newPurchase.amount) || 0,
        categoryId: newPurchase.categoryId,
        categoryLabel: cat?.label || "",
        categoryEmoji: cat?.emoji || "",
        categoryColor: cat?.color || "#8E8E93",
        status: "pending",
        photoUrl: null,
        photoPath: null,
        approvedAt: null,
        refusedAt: null,
        refusedReason: "",
        decidedBy: null,
        decidedByName: null,
      }, newPurchase.photoFile);
      setNewPurchase({ description: "", amount: "", categoryId: "", photoFile: null });
      setNewPurchaseModal(false);
      showToast("Demande envoyée !");
    } catch (err) {
      console.error(err);
      showToast("Erreur d'envoi. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  // Build tab list based on permissions
  const tabs = [];
  if (can("canClockIn"))         tabs.push(["pointage",    "🕐 Pointage"]);
  if (can("canViewTasks"))       tabs.push(["taches",      `📋 Tâches${pendingCount>0?` (${pendingCount})`:""}`]);
  if (can("canSubmitPurchases")) tabs.push(["achats",      "🧾 Demandes d'achat"]);
  if (can("canManageEvents") || can("canViewEvents")) tabs.push(["evenements", "📅 Événements"]);
  tabs.push(["parametres", "⚙️ Paramètres"]);

  // URL-driven tab — fallback to first permitted tab if section is invalid.
  const tabIds = tabs.map(([id]) => id);
  const tab = tabIds.includes(section) ? section : (tabIds[0] || "");
  useEffect(() => {
    if (tabIds.length > 0 && !tabIds.includes(section)) {
      replace(tabIds[0]);
    }
  }, [section, tabIds.join("|")]);// eslint-disable-line
  const setTab = (id) => navigate(id);

  const isClockedIn = (punches[userProfile.id] || []).some(s => dayStart(s.punchIn) === dayStart(Date.now()) && !s.punchOut);

  return (
    <div className="app-shell">
      <Sidebar
        tabs={tabs}
        active={tab}
        onNavigate={setTab}
        subtitle={userProfile.jobs?.map(j => j === "employee" ? "Employé" : j === "driver" ? "Livreur" : j).join(" · ")}
        badge={isClockedIn && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,149,0,.14)", border:"1px solid rgba(255,149,0,.35)", borderRadius:20, padding:"4px 10px" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#FF9500", animation:"blink 1s ease infinite", display:"inline-block" }}/>
            <span style={{ fontSize:11, fontWeight:700, color:"#FFB340", fontFamily:"monospace" }}>En service</span>
          </div>
        )}
      />

      <div className="app-shell-content" style={{ maxWidth:860, margin:"0 auto" }}>

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

        {/* TÂCHES */}
        {tab === "taches" && can("canViewTasks") && (
          <div>
            {active.length === 0 && (
              <div className="card" style={{ textAlign:"center", padding:48 }}>
                <div style={{ fontSize:44, marginBottom:12 }}>🎉</div>
                <p style={{ fontWeight:600, fontSize:17 }}>Aucune tâche en attente !</p>
              </div>
            )}
            {[...active].sort((a,b) => (a.deadline||9e15)-(b.deadline||9e15)).map(order => {
              const dl = getDL(order.deadline);
              return (
                <div key={order.id} className="oc card" style={{ marginBottom:12, borderTop:`3px solid ${dl.color}` }}>
                  <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap", alignItems:"center" }}>
                    <span style={{ fontFamily:"monospace", fontSize:10, color:"#C7C7CC" }}>{order.id}</span>
                    <span className={`badge ${order.status==="inprogress"?"bi":"bp"}`}>{order.status==="inprogress"?"⚡ En cours":"⏸ En attente"}</span>
                    {dl.overdue && <span style={{ fontSize:11, color:"#FF3B30", fontWeight:700 }}>⚠️ En retard</span>}
                  </div>
                  <h3 style={{ fontSize:17, fontWeight:700, marginBottom:3 }}>{order.clientName}</h3>
                  <p style={{ fontSize:14, color:"#6D6D72", lineHeight:1.4, marginBottom:14 }}>{order.description}</p>
                  <div style={{ marginBottom:14 }}><DeadlineRow deadline={order.deadline} createdAt={order.createdAt}/></div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                    <Chrono order={order}/>
                    <div>
                      {order.status === "pending" && <button className="btn btn-blue" onClick={() => startOrder(order.id)}>▶ Commencer</button>}
                      {order.status === "inprogress" && (
                        <button className="btn btn-green" disabled={sending===order.id} onClick={() => { setSending(order.id); finishOrder(order.id); }}>
                          {sending===order.id ? <><span className="sp"/> Envoi…</> : "✓ Terminer"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {done.length > 0 && (
              <div style={{ marginTop:24 }}>
                <p className="sec">Terminées ({done.length})</p>
                {done.map(o => (
                  <div key={o.id} className="card" style={{ marginBottom:10, opacity:.6, borderLeft:"3px solid #34C759" }}>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <div>
                        <p style={{ fontWeight:600, fontSize:14, textDecoration:"line-through", color:"#8E8E93" }}>{o.clientName}</p>
                        <p style={{ fontSize:12, color:"#C7C7CC" }}>{o.description}</p>
                      </div>
                      <span style={{ fontFamily:"monospace", fontSize:12, color:"#34C759" }}>⏱ {fmtMs(o.elapsed)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACHATS */}
        {tab === "achats" && can("canSubmitPurchases") && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:10, flexWrap:"wrap" }}>
              <p style={{ fontSize:14, color:"#8E8E93" }}>Remboursements et factures.</p>
              <button
                className="btn btn-primary"
                style={{ padding:"9px 16px", fontSize:13 }}
                onClick={() => setNewPurchaseModal(true)}
                disabled={categories.length === 0}
                title={categories.length === 0 ? "Aucune catégorie disponible" : ""}
              >
                + Nouvelle demande
              </button>
            </div>
            {categories.length === 0 && (
              <div className="card" style={{ textAlign:"center", padding:24, marginBottom:12, background:"#FFF8E1", borderLeft:"4px solid #FF9500" }}>
                <p style={{ fontWeight:600, fontSize:14, color:"#B36200" }}>⚠️ Aucune catégorie configurée.</p>
                <p style={{ fontSize:12, color:"#8E8E93", marginTop:4 }}>Demande à un administrateur d'en créer avant de soumettre une demande.</p>
              </div>
            )}
            {myPurchases.length === 0 && categories.length > 0 && (
              <div className="card" style={{ textAlign:"center", padding:40 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🧾</div>
                <p style={{ fontWeight:600 }}>Aucune demande</p>
              </div>
            )}
            {myPurchases.map(p => (
              <div key={p.id} className="oc card" style={{ marginBottom:12, borderLeft:`4px solid ${p.status==="approved"?"#34C759":p.status==="refused"?"#FF3B30":"#FF9500"}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center", flexWrap:"wrap" }}>
                      <span className={`badge ${p.status==="approved"?"ba":p.status==="refused"?"br":"bw"}`}>
                        {p.status==="approved"?"✅ Approuvé":p.status==="refused"?"❌ Refusé":"⏳ En attente"}
                      </span>
                      {p.categoryLabel && (
                        <span style={{
                          fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
                          background:`${p.categoryColor||"#8E8E93"}18`,
                          color:p.categoryColor||"#8E8E93",
                          border:`1px solid ${p.categoryColor||"#8E8E93"}30`,
                        }}>
                          {p.categoryEmoji} {p.categoryLabel}
                        </span>
                      )}
                    </div>
                    <p style={{ fontWeight:700, fontSize:15, wordBreak:"break-word" }}>{p.description}</p>
                    <p style={{ fontSize:22, fontWeight:800, margin:"4px 0" }}>{p.amount?.toFixed(2)} $</p>
                    {p.status === "refused" && p.refusedReason && (
                      <p style={{ fontSize:12, color:"#FF3B30", marginTop:4 }}>Motif : {p.refusedReason}</p>
                    )}
                  </div>
                  {p.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(p.photoUrl)}
                      style={{
                        flex:"0 0 auto", border:"none", padding:0, cursor:"pointer",
                        borderRadius:10, overflow:"hidden", background:"#F2F2F7",
                      }}
                      title="Voir la facture"
                    >
                      <img src={p.photoUrl} alt="Facture" style={{ width:72, height:72, objectFit:"cover", display:"block" }}/>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ÉVÉNEMENTS */}
        {tab === "evenements" && (
          <EventsPage
            events={events}
            users={users}
            addEvent={addEvent}
            updateEvent={updateEvent}
            deleteEvent={deleteEvent}
            showToast={showToast}
          />
        )}

        {/* PARAMÈTRES */}
        {tab === "parametres" && <SettingsPage showToast={showToast}/>}
      </div>

      {/* Modal nouvelle demande d'achat */}
      <Modal
        open={newPurchaseModal}
        onClose={() => !submitting && setNewPurchaseModal(false)}
        title="🧾 Nouvelle demande"
      >
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label className="lbl">Description *</label>
            <input
              className="inp"
              placeholder="Encre sérigraphie noire 5L"
              value={newPurchase.description}
              onChange={e => setNewPurchase(n => ({ ...n, description: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="lbl">Montant ($) *</label>
            <input
              className="inp"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              value={newPurchase.amount}
              onChange={e => setNewPurchase(n => ({ ...n, amount: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="lbl">Catégorie *</label>
            {categories.length === 0 ? (
              <p style={{ fontSize:12, color:"#FF9500" }}>Aucune catégorie disponible.</p>
            ) : (
              <select
                className="sel"
                value={newPurchase.categoryId}
                onChange={e => setNewPurchase(n => ({ ...n, categoryId: e.target.value }))}
                disabled={submitting}
              >
                <option value="">— Choisir —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="lbl">Preuve d'achat (facture)</label>
            <PhotoUpload
              value={newPurchase.photoFile}
              onChange={(file) => setNewPurchase(n => ({ ...n, photoFile: file }))}
              label="📸 Photographier ou joindre la facture"
            />
            <p style={{ fontSize:11, color:"#8E8E93", marginTop:-4 }}>
              Optionnel mais recommandé pour accélérer l'approbation.
            </p>
          </div>

          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button
              className="btn btn-outline"
              style={{ flex:1, justifyContent:"center" }}
              onClick={() => setNewPurchaseModal(false)}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              className="btn btn-primary"
              style={{ flex:2, justifyContent:"center" }}
              onClick={submitPurchase}
              disabled={submitting}
            >
              {submitting ? <><span className="sp"/> Envoi…</> : "Envoyer"}
            </button>
          </div>
        </div>
      </Modal>

      <PhotoLightbox url={lightboxUrl} alt="Facture" onClose={() => setLightboxUrl(null)}/>

      {toast && <Toast message={toast} onDone={() => setToast(null)}/>}
    </div>
  );
}
