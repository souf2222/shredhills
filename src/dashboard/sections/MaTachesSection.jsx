// src/dashboard/sections/MaTachesSection.jsx
import { useState } from "react";
import { fmtMs, getDL } from "../../utils/helpers";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { ExpandableSection } from "../../components/ExpandableSection";

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

function ActiveTaskCard({ order, hasInProgress, onStart, onPause, onFinish }) {
  const [sending, setSending] = useState(null);
  const dl = getDL(order.deadline);
  return (
    <div key={order.id} className={`oc card ${order.status === "inprogress" ? "bt-blue" : order.status === "paused" ? "bt-yellow" : "bt-orange"}`} style={{ marginBottom:12 }}>
      <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontFamily:"monospace", fontSize:10, color:"#C7C7CC" }}>{order.id}</span>
        <span className={`badge ${order.status==="inprogress"?"bi":order.status==="paused"?"bo":"bp"}`}>
          {order.status==="inprogress"?"⚡ En cours":order.status==="paused"?"⏸ En pause":"⏸ En attente"}
        </span>
        {dl.overdue && <span style={{ fontSize:11, color:"#FF3B30", fontWeight:700 }}>⚠️ En retard</span>}
      </div>
      <h3 style={{ fontSize:17, fontWeight:700, marginBottom:3 }}>{order.clientName}</h3>
      <p style={{ fontSize:14, color:"#6D6D72", lineHeight:1.4, marginBottom:14, whiteSpace:"pre-line" }}>{order.description}</p>
      <div style={{ marginBottom:14 }}><DeadlineRow deadline={order.deadline} createdAt={order.createdAt}/></div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <Chrono order={order}/>
        <div>
          {order.status === "pending" && (
            <button
              className="btn btn-blue"
              disabled={hasInProgress}
              onClick={() => onStart(order.id)}
              title={hasInProgress ? "Une autre tâche est déjà en cours" : ""}
            >
              ▶ Commencer
            </button>
          )}
          {order.status === "inprogress" && (
            <button className="btn btn-outline" style={{ borderColor:"#FF9500", color:"#FF9500" }} onClick={() => onPause(order.id)}>
              ⏸ Pause
            </button>
          )}
          {order.status === "paused" && (
            <button
              className="btn btn-blue"
              disabled={hasInProgress}
              onClick={() => onStart(order.id)}
              title={hasInProgress ? "Une autre tâche est déjà en cours" : ""}
            >
              ▶ Reprendre
            </button>
          )}
          {(order.status === "inprogress" || order.status === "paused") && (
            <button className="btn btn-green" disabled={sending===order.id} onClick={() => { setSending(order.id); onFinish(order.id); }} style={{ marginLeft:8 }}>
              {sending===order.id ? <><span className="sp"/> Envoi…</> : "✓ Terminer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DoneTaskCard({ order }) {
  return (
    <div key={order.id} className="card bt-green" style={{ marginBottom:10, opacity:.6 }}>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <div>
          <p style={{ fontWeight:600, fontSize:14, textDecoration:"line-through", color:"#8E8E93" }}>{order.clientName}</p>
          <p style={{ fontSize:12, color:"#C7C7CC", whiteSpace:"pre-line" }}>{order.description}</p>
        </div>
        <span style={{ fontFamily:"monospace", fontSize:12, color:"#34C759" }}>⏱ {fmtMs(order.elapsed)}</span>
      </div>
    </div>
  );
}

export function MaTachesSection({ orders, onStart, onPause, onFinish }) {
  const [tachesSearch, setTachesSearch] = useState("");
  const [tachesStatus, setTachesStatus] = useState("all");

  const search = tachesSearch.trim().toLowerCase();
  const matchesSearch = (o) =>
    [o.clientName, o.description].join(" ").toLowerCase().includes(search);

  // Pré-filtrage par recherche texte
  const searchedOrders = search ? orders.filter(matchesSearch) : orders;

  // Groupes bruts
  const doneRaw       = searchedOrders.filter(o => o.status === "done");
  const activeRaw     = searchedOrders.filter(o => o.status !== "done");
  const overdueRaw    = activeRaw.filter(o => getDL(o.deadline).overdue);
  const inprogressRaw = activeRaw.filter(o => o.status === "inprogress" && !getDL(o.deadline).overdue);
  const waitingRaw    = activeRaw.filter(o => (o.status === "pending" || o.status === "paused") && !getDL(o.deadline).overdue);

  const hasInProgress = orders.some(o => o.status === "inprogress");

  // Application du filtre status
  const showAll       = tachesStatus === "all";
  const showOverdue   = showAll || tachesStatus === "overdue";
  const showInprogress= showAll || tachesStatus === "inprogress";
  const showWaiting   = showAll || tachesStatus === "waiting";
  const showDone      = showAll || tachesStatus === "done";

  const inprogress = showInprogress ? inprogressRaw : [];
  const overdue    = showOverdue    ? overdueRaw    : [];
  const waiting    = showWaiting    ? waitingRaw    : [];
  const done       = showDone       ? doneRaw       : [];

  const visibleCount = inprogress.length + overdue.length + waiting.length + done.length;

  return (
    <div>
      <PageHeader
        title="Tâches"
        total={orders.length}
        filteredCount={visibleCount}
        search={{ value: tachesSearch, onChange: setTachesSearch, placeholder: "Rechercher..." }}
        filters={[
          <FilterBar
            key="fb-t"
            hasFilters={tachesStatus !== "all" || tachesSearch.trim()}
            onReset={() => { setTachesStatus("all"); setTachesSearch(""); }}
            filters={[
              { key: "status", type: "toggle-group", value: tachesStatus, onChange: setTachesStatus, options: [
                { value: "all",        label: `Toutes (${orders.length})`,           color: "#6D6D72" },
                { value: "inprogress", label: `En cours (${inprogressRaw.length})`, color: "#007AFF" },
                { value: "overdue",    label: `En retard (${overdueRaw.length})`,  color: "#FF3B30" },
                { value: "waiting",    label: `En attente (${waitingRaw.length})`,  color: "#FF9500" },
                { value: "done",       label: `Termin\u00e9es (${doneRaw.length})`,     color: "#34C759" }
              ]}
            ]}
          />
        ]}
      />

      {visibleCount === 0 && (
        <div className="card" style={{ textAlign:"center", padding:48 }}>
          <div style={{ fontSize:44, marginBottom:12 }}></div>
          <p style={{ fontWeight:600, fontSize:17 }}>Aucune tâche trouvée !</p>
        </div>
      )}

      {inprogress.length > 0 && (
        <ExpandableSection title="En cours" count={inprogress.length} defaultExpanded={true} lazy={false}>
          {inprogress.map(order => (
            <ActiveTaskCard
              key={order.id}
              order={order}
              hasInProgress={hasInProgress}
              onStart={onStart}
              onPause={onPause}
              onFinish={onFinish}
            />
          ))}
        </ExpandableSection>
      )}

      {overdue.length > 0 && (
        <ExpandableSection title="En retard" count={overdue.length} defaultExpanded={true} lazy={false}>
          {overdue.map(order => (
            <ActiveTaskCard
              key={order.id}
              order={order}
              hasInProgress={hasInProgress}
              onStart={onStart}
              onPause={onPause}
              onFinish={onFinish}
            />
          ))}
        </ExpandableSection>
      )}

      {waiting.length > 0 && (
        <ExpandableSection title="En attente" count={waiting.length} defaultExpanded={true} lazy={false}>
          {waiting.map(order => (
            <ActiveTaskCard
              key={order.id}
              order={order}
              hasInProgress={hasInProgress}
              onStart={onStart}
              onPause={onPause}
              onFinish={onFinish}
            />
          ))}
        </ExpandableSection>
      )}

      {done.length > 0 && (
        <ExpandableSection title="Terminées" count={done.length} defaultExpanded={false} lazy={true}>
          {done.map(order => (
            <DoneTaskCard key={order.id} order={order} />
          ))}
        </ExpandableSection>
      )}
    </div>
  );
}
