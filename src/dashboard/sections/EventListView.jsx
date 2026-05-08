import { fmtEventDate, fmtEventTime, daysUntil, isEventPast } from "../../utils/helpers";
import { EventAvatar } from "../../components/EventAvatar";

export function EventListView({ events, onEdit, canManage }) {
  const upcoming = events.filter(e => !isEventPast(e)).sort((a,b) => a.startDate - b.startDate);
  const past     = events.filter(e => isEventPast(e)).sort((a,b) => b.startDate - a.startDate);

  const EventRow = ({ event }) => {
    const days = daysUntil(event.startDate);
    const isPast = isEventPast(event);
    return (
      <div
        onClick={() => canManage && onEdit(event)}
        style={{
          display:"flex", alignItems:"center", gap:14,
          background: isPast ? "#F9F9F9" : "white",
          borderRadius:16, padding:"16px 18px", marginBottom:8,
          boxShadow:"0 1px 4px rgba(0,0,0,.06)",
          cursor: canManage ? "pointer" : "default",
          transition:"all .15s",
          borderLeft:`4px solid ${event.color || "#007AFF"}`,
          opacity: isPast ? 0.6 : 1,
        }}
        onMouseEnter={e => { if(canManage) e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)"; }}
        onMouseLeave={e => e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.06)"}
      >
        <EventAvatar event={event} size={44}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:15, color: isPast ? "#8E8E93" : "#1C1C1E", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {event.title}
          </div>
          {event.subtitle && <div style={{ fontSize:12, color:"#8E8E93", marginTop:1 }}>{event.subtitle}</div>}
          <div style={{ fontSize:12, color:"#8E8E93", display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
            <span>🗓</span>
            <span>
              {event.allDay
                ? fmtEventDate(event.startDate)
                : `${fmtEventDate(event.startDate)}${event.endDate - event.startDate > 60000 ? ` · ${fmtEventTime(event.startDate)} – ${fmtEventTime(event.endDate)}` : ""}`
              }
            </span>
          </div>
          {event.location && <div style={{ fontSize:12, color:"#8E8E93", display:"flex", gap:4, marginTop:1 }}><span>📍</span><span>{event.location}</span></div>}
        </div>
        {!isPast && (
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:32, fontWeight:800, color:"white", lineHeight:1, background:event.color || "#007AFF", borderRadius:12, padding:"6px 14px", minWidth:60, textAlign:"center" }}>
              {Math.max(0, days)}
            </div>
            <div style={{ fontSize:11, color:"#8E8E93", marginTop:4, textAlign:"center" }}>
              {days === 0 ? "aujourd'hui" : days === 1 ? "jour" : "jours"}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {upcoming.length === 0 && past.length === 0 && (
        <div className="card" style={{ textAlign:"center", padding:48 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📅</div>
          <p style={{ fontWeight:600, fontSize:17 }}>Aucun événement</p>
          {canManage && <p style={{ fontSize:13, color:"#8E8E93", marginTop:4 }}>Clique sur + pour en ajouter un.</p>}
        </div>
      )}
      {upcoming.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <p className="sec" style={{ marginBottom:12 }}>À venir ({upcoming.length})</p>
          {upcoming.map(e => <EventRow key={e.id} event={e}/>)}
        </div>
      )}
      {past.length > 0 && (
        <div>
          <p className="sec" style={{ marginBottom:12 }}>Passés ({past.length})</p>
          {past.map(e => <EventRow key={e.id} event={e}/>)}
        </div>
      )}
    </div>
  );
}
