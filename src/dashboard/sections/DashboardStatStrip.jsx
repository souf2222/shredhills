// src/dashboard/sections/DashboardStatStrip.jsx
import { dayStart } from "../../utils/helpers";

export function DashboardStatStrip({ events, orders, stops, users, punches, userProfile }) {
  const adminActive = orders.filter(o => o.status !== "done");
  const adminDone   = orders.filter(o => o.status === "done");
  const isClockedIn = (punches[userProfile.id] || []).some(s => dayStart(s.punchIn) === dayStart(Date.now()) && !s.punchOut);

  const stats = [
    { label: "Événements", val: events.filter(e => e.endDate >= Date.now()).length, c: "#007AFF" },
    { label: "En cours",   val: orders.filter(o => o.status === "inprogress").length, c: "#FF9500" },
    { label: "Terminées",  val: adminDone.length, c: "#34C759" },
    { label: "Livraisons", val: stops.filter(s => s.status === "pending").length, c: "#AF52DE" },
    { label: "En retard",  val: orders.filter(o => o.status !== "done" && o.deadline && o.deadline < Date.now()).length, c: "#FF3B30" },
    { label: "Utilisateurs", val: users.length, c: "#6D6D72" },
  ];

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ flex:1, minWidth:120, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:11, color:"#8E8E93" }}>{s.label}</span>
            <span style={{ fontSize:20, fontWeight:700, color:s.c }}>{s.val}</span>
          </div>
        ))}
      </div>
      {isClockedIn && (
        <div className="card" style={{ marginBottom:16, padding:"12px 14px", display:"flex", alignItems:"center", gap:10, background:"#F0F9FF", borderLeft:"4px solid #007AFF" }}>
          <span style={{ width:10, height:10, borderRadius:"50%", background:"#34C759", display:"inline-block", animation:"blink 1s ease infinite" }} />
          <span style={{ fontWeight:600, fontSize:14 }}>Tu es en service — bon travail !</span>
        </div>
      )}
    </div>
  );
}
