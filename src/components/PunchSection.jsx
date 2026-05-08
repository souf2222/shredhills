// src/components/PunchSection.jsx
import { useState, useEffect, useRef } from "react";
import { fmtMs, fmtHours, fmtTime, fmtTimeInput, dayStart, groupByDay, DAY } from "../utils/helpers";
import { PageHeader } from "./PageHeader";

function PunchEditModal({ punch, onSave, onClose }) {
  const [pIn,  setPIn]  = useState(fmtTimeInput(punch.punchIn));
  const [pOut, setPOut] = useState(punch.punchOut ? fmtTimeInput(punch.punchOut) : "");
  const [note, setNote] = useState(punch.note || "");
  const changed = pIn !== fmtTimeInput(punch.punchIn) || (pOut !== (punch.punchOut ? fmtTimeInput(punch.punchOut) : ""));
  const ok = !changed || note.trim().length > 0;

  const save = () => {
    const ni = new Date(pIn).getTime(), no = pOut ? new Date(pOut).getTime() : null;
    if (isNaN(ni) || (no && no <= ni)) return;
    onSave({ ...punch, punchIn: ni, punchOut: no, note });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"white", borderRadius:20, padding:28, width:420, maxWidth:"100%", boxShadow:"0 20px 60px rgba(0,0,0,.15)" }}>
        <h3 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>✏️ Modifier la session</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div><label className="lbl">Punch in</label><input type="datetime-local" className="inp" value={pIn} onChange={e => setPIn(e.target.value)}/></div>
          <div><label className="lbl">Punch out</label><input type="datetime-local" className="inp" value={pOut} onChange={e => setPOut(e.target.value)}/></div>
          <div>
            <label className="lbl">Note {changed && <span style={{ color:"#FF9500" }}>(obligatoire)</span>}</label>
            <input className="inp" placeholder="Ex: Oublié de puncher à 8h30…" value={note} onChange={e => setNote(e.target.value)}/>
          </div>
          {changed && !note.trim() && <p style={{ fontSize:12, color:"#FF9500" }}>⚠️ Note requise pour toute modification.</p>}
        </div>
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" style={{ flex:2, justifyContent:"center", opacity:ok?1:.5 }} onClick={() => ok && save()}>Sauvegarder</button>
        </div>
      </div>
    </div>
  );
}

export function PunchSection({ userId, punches, addPunchSession, closePunchSession, updatePunchSession, showToast }) {
  const sessions   = punches[userId] || [];
  const [,tick]    = useState(0);
  const [editPunch, setEditPunch] = useState(null);

  useEffect(() => {
    const t = setInterval(() => tick(x => x+1), 1000);
    return () => clearInterval(t);
  }, []);

  const todayStart_ = dayStart(Date.now());
  const todaySess   = sessions.filter(s => dayStart(s.punchIn) === todayStart_);
  const activeSess  = todaySess.find(s => !s.punchOut) || null;
  const isClockedIn = !!activeSess;

  const todayDoneMs  = todaySess.filter(s => s.punchOut).reduce((a,s) => a + (s.punchOut - s.punchIn), 0);
  const todayLiveMs  = activeSess ? Date.now() - activeSess.punchIn : 0;
  const todayTotalMs = todayDoneMs + todayLiveMs;

  const wkStart     = Date.now() - (new Date().getDay() || 7) * DAY;
  const totalMsWeek = sessions.filter(s => s.punchIn >= wkStart && s.punchOut).reduce((a,s) => a + (s.punchOut - s.punchIn), 0);
  const totalMsAll  = sessions.filter(s => s.punchOut).reduce((a,s) => a + (s.punchOut - s.punchIn), 0);

  const punchIn = async () => {
    const session = { id:`P-${Date.now().toString(36).toUpperCase()}`, punchIn:Date.now(), punchOut:null, note:"" };
    await addPunchSession(userId, session);
    showToast("Punch in !");
  };

  const punchOut_ = async () => {
    if (activeSess) {
      await closePunchSession(userId, activeSess.id);
      showToast("Pause !");
    }
  };

  const savePunchEdit = async (updated) => {
    await updatePunchSession(userId, updated);
    setEditPunch(null);
    showToast("Session modifiée");
  };

  return (
    <div>
      <PageHeader title="Ma feuille de temps" total={sessions.length} />
      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        {[
          { label:"Aujourd'hui", val:fmtHours(todayTotalMs), c:isClockedIn?"#FF9500":"#34C759" },
          { label:"Semaine",     val:fmtHours(totalMsWeek),  c:"#007AFF" },
          { label:"Total",       val:fmtHours(totalMsAll),   c:"#6D6D72" },
        ].map(s => (
          <div key={s.label} className="card" style={{ flex:1, textAlign:"center", padding:"14px 8px" }}>
            <div style={{ fontSize:16, fontWeight:800, color:s.c, fontFamily:"monospace" }}>{s.val}</div>
            <div style={{ fontSize:11, color:"#8E8E93", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ textAlign:"center", padding:"30px 20px", marginBottom:20 }}>
        {isClockedIn ? (
          <>
            {todaySess.filter(s => s.punchOut).length > 0 && (
              <div style={{ background:"#F9F9F9", borderRadius:12, padding:"10px 14px", marginBottom:16, textAlign:"left" }}>
                <p style={{ fontSize:12, color:"#8E8E93", fontWeight:600, marginBottom:6 }}>Sessions d'aujourd'hui :</p>
                {todaySess.filter(s => s.punchOut).map((s,i) => (
                  <div key={s.id} style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:2 }}>
                    <span style={{ color:"#6D6D72" }}>Session {i+1} : {fmtTime(s.punchIn)} → {fmtTime(s.punchOut)}</span>
                    <span style={{ fontFamily:"monospace", color:"#007AFF", fontWeight:600 }}>{fmtHours(s.punchOut - s.punchIn)}</span>
                  </div>
                ))}
                <div style={{ borderTop:"1px solid #E5E5EA", marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontSize:12 }}>
                  <span style={{ color:"#8E8E93" }}>Déjà accumulé :</span>
                  <span style={{ fontFamily:"monospace", fontWeight:700, color:"#34C759" }}>{fmtHours(todayDoneMs)}</span>
                </div>
              </div>
            )}
            <p style={{ fontSize:13, color:"#8E8E93", marginBottom:2 }}>En cours depuis <strong>{fmtTime(activeSess.punchIn)}</strong></p>
            <div style={{ fontFamily:"monospace", fontSize:40, fontWeight:800, color:"#FF9500", letterSpacing:"-2px", margin:"10px 0 6px" }}>{fmtMs(todayLiveMs)}</div>
            <p style={{ fontSize:13, fontWeight:700, marginBottom:20 }}>Total : <span style={{ color:"#34C759" }}>{fmtHours(todayTotalMs)}</span></p>
            <button className="btn-clock-out" onClick={punchOut_}>⏸ Pause / Punch Out</button>
            <p style={{ fontSize:12, color:"#C7C7CC", marginTop:10 }}>Les heures s'accumulent à chaque retour.</p>
          </>
        ) : (
          <>
            {todaySess.length > 0 && (
              <div style={{ background:"#F0FFF4", borderRadius:12, padding:"10px 14px", marginBottom:16, textAlign:"left", border:"1px solid #BBF7D0" }}>
                <p style={{ fontSize:12, color:"#166534", fontWeight:600, marginBottom:4 }}>
                  Déjà accumulé aujourd'hui : <span style={{ fontFamily:"monospace", fontSize:14 }}>{fmtHours(todayTotalMs)}</span>
                </p>
              </div>
            )}
            <div style={{ fontSize:44, marginBottom:8 }}>👋</div>
            <p style={{ fontSize:17, fontWeight:600, marginBottom:4 }}>
              {todaySess.length > 0 ? "Bienvenue de retour !" : "Prêt à commencer ?"}
            </p>
            <p style={{ fontSize:14, color:"#8E8E93", marginBottom:22 }}>
              {todaySess.length > 0 ? "Reprends ta journée." : "Clique pour démarrer."}
            </p>
            <button className="btn-clock-in" onClick={punchIn}>▶ Punch In</button>
          </>
        )}
      </div>

      {sessions.length > 0 && (
        <div className="card">
          <p className="sec">Historique</p>
          {groupByDay(sessions).map(({ dayTs, sessions: sess, totalMs, hasActive }) => (
            <div key={dayTs} style={{ background:"#F9F9F9", borderRadius:12, padding:"11px 14px", marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:700, textTransform:"capitalize" }}>
                  {new Date(dayTs).toLocaleDateString("fr-CA", { weekday:"long", month:"long", day:"numeric" })}
                </span>
                <span style={{ fontFamily:"monospace", fontWeight:800, color:hasActive?"#FF9500":"#007AFF", fontSize:14 }}>
                  {fmtHours(totalMs + (hasActive ? Date.now() - sess.find(s => !s.punchOut).punchIn : 0))}
                </span>
              </div>
              {sess.map((s, i) => (
                <div key={s.id} style={{ display:"flex", alignItems:"center", padding:"5px 0", borderBottom:"1px solid #F2F2F7", gap:8 }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:"#E5E5EA", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#6D6D72", flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1, fontSize:12 }}>
                    <span style={{ color:"#3A3A3C" }}>
                      {fmtTime(s.punchIn)}
                      {s.punchOut && <span style={{ color:"#8E8E93" }}> → {fmtTime(s.punchOut)}</span>}
                      {!s.punchOut && <span style={{ color:"#34C759", fontWeight:600 }}> → en cours</span>}
                    </span>
                    {s.note && <div style={{ fontSize:11, color:"#FF9500", marginTop:1 }}>✏️ {s.note}</div>}
                  </div>
                  {s.punchOut && <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:600, color:"#6D6D72", flexShrink:0 }}>{fmtHours(s.punchOut - s.punchIn)}</span>}
                  <button className="btn btn-outline" style={{ fontSize:11, padding:"3px 9px", flexShrink:0 }} onClick={() => setEditPunch(s)}>Modif.</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {editPunch && <PunchEditModal punch={editPunch} onSave={savePunchEdit} onClose={() => setEditPunch(null)}/>}
    </div>
  );
}
