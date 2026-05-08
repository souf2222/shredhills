// src/dashboard/sections/CommandesSection.jsx
import { getDL, daysUntil, fmtMs } from "../../utils/helpers";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";

export function CommandesSection({ orders, employees, commandesSearch, setCommandesSearch, commandesStatus, setCommandesStatus, onOrderClick, onReassign, onNewOrder }) {
  const adminActive = orders.filter(o => o.status !== "done");
  const adminDone   = orders.filter(o => o.status === "done");
  const commandesFiltered = (commandesStatus === "all" ? orders : commandesStatus === "active" ? adminActive : adminDone).filter(o =>
    [o.clientName, o.clientEmail, o.description].join(" ").toLowerCase().includes(commandesSearch.trim().toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Commandes"
        total={orders.length}
        filteredCount={commandesFiltered.length}
        search={{ value: commandesSearch, onChange: setCommandesSearch, placeholder: "Rechercher..." }}
        button={{ text: "+ Commande", onClick: onNewOrder }}
        filters={[
          <FilterBar key="fb-c" hasFilters={commandesStatus !== "all" || commandesSearch.trim()} onReset={() => { setCommandesStatus("all"); setCommandesSearch(""); }} filters={[
            { key: "status", type: "toggle-group", value: commandesStatus, onChange: setCommandesStatus, options: [
              { value: "all", label: `Toutes (${orders.length})`, color: "#6D6D72" },
              { value: "active", label: `Actives (${adminActive.length})`, color: "#007AFF" },
              { value: "done", label: `Terminées (${adminDone.length})`, color: "#34C759" }
            ]}
          ]} />
        ]}
      />

      {commandesFiltered.length === 0 && (
        <div className="card" style={{ textAlign:"center", padding:48, color:"#8E8E93" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
          <p style={{ fontWeight:600 }}>Aucune commande</p>
        </div>
      )}

      {[...commandesFiltered].sort((a,b) => {
        if (a.status === "done" && b.status !== "done") return 1;
        if (a.status !== "done" && b.status === "done") return -1;
        return (a.deadline||9e15)-(b.deadline||9e15);
      }).map(order => {
        const dl = getDL(order.deadline);
        const days = daysUntil(order.deadline);
        const isDone = order.status === "done";
        return (
          <div key={order.id} className="oc card" onClick={() => onOrderClick(order)}
            style={{
              marginBottom:12, borderTop: isDone ? undefined : `3px solid ${dl.color}`, borderLeft: isDone ? "3px solid #34C759" : undefined,
              cursor:"pointer", transition:"box-shadow .15s, transform .15s", opacity: isDone ? .75 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.1)"; if (isDone) e.currentTarget.style.opacity = 1; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; if (isDone) e.currentTarget.style.opacity = .75; }}
          >
            <div style={{ display:"flex", justifyContent:"space-between", gap:16, flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center", flexWrap:"wrap" }}>
                  {isDone ? <span className="badge bd">✓ Terminé</span>
                    : <span className={`badge ${order.status==="inprogress"?"bi":"bp"}`}>{order.status==="inprogress"?"⚡ En cours":"En attente"}</span>}
                  {!isDone && dl.overdue && <span style={{ fontSize:11, color:"#FF3B30", fontWeight:700 }}>⚠️ En retard</span>}
                </div>
                <p style={{ fontWeight:700, fontSize:15 }}>{order.clientName}<span style={{ fontWeight:400, fontSize:13, color:"#8E8E93", marginLeft:8 }}>{order.clientEmail}</span></p>
                <p style={{ fontSize:13, color:"#6D6D72", marginTop:2 }}>{order.description}</p>
              </div>
              {!isDone && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }} onClick={e => e.stopPropagation()}>
                  <select value={order.assignedTo} onChange={e => onReassign(order.id, e.target.value)}
                    style={{ background:"#F2F2F7", border:"none", borderRadius:8, padding:"5px 10px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", outline:"none" }}>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.displayName}</option>)}
                  </select>
                </div>
              )}
              {!isDone ? (
                <div style={{ textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontSize:32, fontWeight:800, color:"white", lineHeight:1, background: dl.color, borderRadius:12, padding:"6px 14px", minWidth:60, textAlign:"center" }}>
                    {dl.overdue ? Math.abs(days) : Math.max(0, days)}
                  </div>
                  <div style={{ fontSize:11, color:"#8E8E93", marginTop:4, textAlign:"center" }}>
                    {dl.overdue
                      ? (Math.abs(days) === 1 ? "jour de retard" : "jours de retard")
                      : (days === 0 ? "aujourd'hui" : days === 1 ? "jour" : "jours")}
                  </div>
                </div>
              ) : (
                <span style={{ fontFamily:"monospace", fontSize:12, color:"#FF6B35" }}>⏱ {fmtMs(order.elapsed)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
