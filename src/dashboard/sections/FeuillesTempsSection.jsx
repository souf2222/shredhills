// src/dashboard/sections/FeuillesTempsSection.jsx
import { useState } from "react";
import { fmtHours, fmtTime, fmtDate, getDateRange, groupByDay, dayStart } from "../../utils/helpers";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { PunchEditModal } from "../../components/PunchEditModal";

export function FeuillesTempsSection({ users, punches, dateRange, setDateRange, customStart, setCustomStart, customEnd, setCustomEnd, updatePunchSession, deletePunchSession, showToast }) {
  const { start: rangeStart, end: rangeEnd } = getDateRange(dateRange, customStart, customEnd);
  const [editPunch, setEditPunch] = useState(null);
  const [editUserId, setEditUserId] = useState(null);

  const clockInUsers = users.filter(u => u.permissions?.canClockIn);

  const rangeLabel = `(${new Date(rangeStart).toLocaleDateString("fr-CA")} au ${new Date(rangeEnd).toLocaleDateString("fr-CA")})`;

  const savePunchEdit = (updated) => {
    updatePunchSession(editUserId, updated);
    setEditPunch(null);
    setEditUserId(null);
    showToast && showToast("Session modifiée", "success");
  };

  const handleDeletePunch = () => {
    if (!window.confirm("Supprimer cette session de pointage ?")) return;
    deletePunchSession(editUserId, editPunch.id);
    setEditPunch(null);
    setEditUserId(null);
    showToast && showToast("Session supprimée", "success");
  };

  return (
    <div>
      <PageHeader
        title={`Gestion des feuilles de temps ${rangeLabel}`}
        total={clockInUsers.length}
        filteredCount={clockInUsers.length}
        filters={[
          <FilterBar
            key="fb-ft"
            hasFilters={dateRange !== "week"}
            onReset={() => { setDateRange("week"); setCustomStart(""); setCustomEnd(""); }}
            filters={[
              {
                key: "range",
                type: "select",
                value: dateRange,
                onChange: setDateRange,
                options: [
                  { value: "week", label: "Cette semaine" },
                  { value: "lastWeek", label: "Semaine passée" },
                  { value: "month", label: "Ce mois" },
                  { value: "custom", label: "Personnalisé" },
                ],
              },
              ...(dateRange === "custom" ? [{
                key: "custom",
                type: "date-range",
                value: { from: customStart, to: customEnd },
                onChange: ({ from, to }) => { setCustomStart(from); setCustomEnd(to); },
              }] : []),
            ]}
          />,
        ]}
      />

      {clockInUsers.map(u => {
        const eps = punches[u.id] || [];
        const rangeMs = eps.filter(p => p.punchIn >= rangeStart && p.punchIn <= rangeEnd && p.punchOut).reduce((a,p) => a + (p.punchOut - p.punchIn), 0);
        const active = eps.some(s => dayStart(s.punchIn) === dayStart(Date.now()) && !s.punchOut);
        const days = groupByDay(eps.filter(p => p.punchIn >= rangeStart && p.punchIn <= rangeEnd));

        return (
          <div key={u.id} className="card" style={{ marginBottom:14, borderLeft:`4px solid ${u.color}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:44, height:44, borderRadius:14, background:u.color+"18", color:u.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700 }}>{u.displayName?.[0]}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:16 }}>{u.displayName}</div>
                  <div style={{ fontSize:11, color:"#8E8E93" }}>{u.email}</div>
                </div>
                {active && <span style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(52,199,89,.1)", border:"1px solid rgba(52,199,89,.3)", borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:600, color:"#34C759" }}><span style={{ width:5, height:5, borderRadius:"50%", background:"#34C759", animation:"blink 1s ease infinite" }}/>En service</span>}
              </div>
              <div style={{ fontSize:24, fontWeight:700, color:"#007AFF" }}>{fmtHours(rangeMs)}</div>
            </div>
            <div style={{ borderTop:"1px solid #F2F2F7", paddingTop:12 }}>
              {days.length === 0 && <p style={{ fontSize:13, color:"#C7C7CC", textAlign:"center", padding:"8px 0" }}>Aucun pointage</p>}
              {days.map(({ dayTs, sessions, totalMs:dMs, hasActive }) => (
                <div key={dayTs} style={{ marginBottom:8, background:"#F9F9F9", borderRadius:10, padding:"9px 12px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:600, textTransform:"capitalize" }}>{new Date(dayTs).toLocaleDateString("fr-CA",{ weekday:"long", month:"long", day:"numeric" })}</span>
                    <span style={{ fontFamily:"monospace", fontWeight:800, color:hasActive?"#FF9500":"#007AFF", fontSize:13 }}>{fmtHours(dMs)}</span>
                  </div>
                  {sessions.map((s,i) => (
                    <div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11, color:"#6D6D72", padding:"1px 0" }}>
                      <span>Session {i+1} : {fmtTime(s.punchIn)} → {s.punchOut?fmtTime(s.punchOut):"en cours"}{s.note && <span style={{ color:"#FF9500", marginLeft:4 }}>✏️ {s.note}</span>}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        {s.punchOut && <span style={{ fontFamily:"monospace", fontWeight:600 }}>{fmtHours(s.punchOut - s.punchIn)}</span>}
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: 10, padding: "2px 7px", flexShrink: 0 }}
                          onClick={() => { setEditPunch(s); setEditUserId(u.id); }}
                        >
                          Modif.
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {editPunch && <PunchEditModal punch={editPunch} onSave={savePunchEdit} onDelete={handleDeletePunch} onClose={() => { setEditPunch(null); setEditUserId(null); }} />}
    </div>
  );
}
