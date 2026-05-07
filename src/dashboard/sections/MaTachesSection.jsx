// src/dashboard/sections/MaTachesSection.jsx
import { useState } from "react";
import { fmtMs, fmtHours, getDL, dayStart } from "../../utils/helpers";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";

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

export function MaTachesSection({ orders, onStart, onFinish }) {
  const [sending, setSending] = useState(null);
  const [tachesSearch, setTachesSearch] = useState("");
  const [tachesStatus, setTachesStatus] = useState("all");

  const myOrders  = orders;
  const active    = myOrders.filter(o => o.status !== "done");
  const done      = myOrders.filter(o => o.status === "done");
  const pendingCount = active.length;

  const tachesFiltered = (tachesStatus === "all" ? myOrders : tachesStatus === "active" ? active : done).filter(o =>
    [o.clientName, o.description].join(" ").toLowerCase().includes(tachesSearch.trim().toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="📋 Tâches"
        total={myOrders.length}
        filteredCount={tachesFiltered.length}
        search={{ value: tachesSearch, onChange: setTachesSearch, placeholder: "Rechercher..." }}
        filters={[
          <FilterBar key="fb-t" hasFilters={tachesStatus !== "all" || tachesSearch.trim()} onReset={() => { setTachesStatus("all"); setTachesSearch(""); }} filters={[
            { key: "status", type: "toggle-group", value: tachesStatus, onChange: setTachesStatus, options: [
              { value: "all", label: `Toutes (${myOrders.length})`, color: "#6D6D72" },
              { value: "active", label: `Actives (${active.length})`, color: "#007AFF" },
              { value: "done", label: `Terminées (${done.length})`, color: "#34C759" }
            ]}
          ]} />
        ]}
      />

      {tachesFiltered.length === 0 && (
        <div className="card" style={{ textAlign:"center", padding:48 }}>
          <div style={{ fontSize:44, marginBottom:12 }}>🎉</div>
          <p style={{ fontWeight:600, fontSize:17 }}>Aucune tâche trouvée !</p>
        </div>
      )}

      {tachesFiltered.filter(o => o.status !== "done").sort((a,b) => (a.deadline||9e15)-(b.deadline||9e15)).map(order => {
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
                {order.status === "pending" && <button className="btn btn-blue" onClick={() => onStart(order.id)}>▶ Commencer</button>}
                {order.status === "inprogress" && (
                  <button className="btn btn-green" disabled={sending===order.id} onClick={() => { setSending(order.id); onFinish(order.id); }}>
                    {sending===order.id ? <><span className="sp"/> Envoi…</> : "✓ Terminer"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {tachesFiltered.filter(o => o.status === "done").length > 0 && (
        <div style={{ marginTop:24 }}>
          <p className="sec">Terminées ({tachesFiltered.filter(o => o.status === "done").length})</p>
          {tachesFiltered.filter(o => o.status === "done").map(o => (
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
  );
}
