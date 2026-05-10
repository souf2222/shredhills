import { fmtEventDate, fmtEventTime, daysUntil, isEventPast } from "../../utils/helpers";
import { COUNTRIES, CountryFlag } from "../../utils/countries";
import { EventAvatar } from "../../components/EventAvatar";
import { MetaTags } from "../../components/MetaTags";

export function EventDetailsModal({ event, users, onClose }) {
  const startStr = event.allDay
    ? fmtEventDate(event.startDate)
    : `${fmtEventDate(event.startDate)} · ${fmtEventTime(event.startDate)}`;
  const endStr = event.endDate
    ? (event.allDay
        ? (event.endDate - event.startDate >= 86400000 ? fmtEventDate(event.endDate) : null)
        : `${fmtEventDate(event.endDate)} · ${fmtEventTime(event.endDate)}`)
    : null;

  const days   = daysUntil(event.startDate);
  const isPast = isEventPast(event);
  const country = event.country ? COUNTRIES.find(c => c.code === event.country) : null;

  // Resolve assigned user names (skip ids that no longer exist).
  const participants = (event.assignedTo || [])
    .map(uid => users.find(u => u.id === uid))
    .filter(Boolean);

  // Small reusable "info row" used inside the details card.
  const Row = ({ icon, label, children }) => (
    <div style={{
      display:"flex", gap:12, alignItems:"flex-start",
      padding:"12px 0", borderBottom:"1px solid #F2F2F7",
    }}>
      <div style={{
        width:32, height:32, borderRadius:10,
        background:"#F2F2F7", display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:15, flexShrink:0,
      }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, color:"#8E8E93", fontWeight:600, textTransform:"uppercase", letterSpacing:".04em" }}>
          {label}
        </div>
        <div style={{ fontSize:14, color:"#1C1C1E", marginTop:2, wordBreak:"break-word" }}>
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxWidth:560 }}>
        <div className="handle"/>

        {/* Hero header — colored band with avatar, title and countdown */}
        <div style={{
          background: isPast ? "#F2F2F7" : (event.color || "#007AFF"),
          color: isPast ? "#1C1C1E" : "white",
          borderRadius:16, padding:"18px 20px", marginBottom:16,
          display:"flex", gap:14, alignItems:"center",
        }}>
          <EventAvatar event={event} size={56}/>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:18, fontWeight:800, lineHeight:1.2, wordBreak:"break-word" }}>
              {event.title}
            </div>
            {event.subtitle && (
              <div style={{
                fontSize:13, marginTop:2,
                color: isPast ? "#6D6D72" : "rgba(255,255,255,.85)",
              }}>
                {event.subtitle}
              </div>
            )}
          </div>
          {!isPast && (
            <div style={{ textAlign:"center", flexShrink:0 }}>
              <div style={{ fontSize:30, fontWeight:800, lineHeight:1 }}>{Math.max(0, days)}</div>
              <div style={{ fontSize:11, opacity:.85, marginTop:2 }}>
                {days === 0 ? "aujourd'hui" : days === 1 ? "jour" : "jours"}
              </div>
            </div>
          )}
          {isPast && (
            <span className="badge" style={{ background:"rgba(0,0,0,.08)", color:"#6D6D72" }}>
              Passé
            </span>
          )}
        </div>

        {/* Body — info rows */}
        <div style={{ marginTop:4 }}>
          <Row icon="🗓" label="Début">{startStr}</Row>
          {endStr && <Row icon="🏁" label="Fin">{endStr}</Row>}
          {event.location && <Row icon="📍" label="Lieu">{event.location}</Row>}
          {country && (
            <Row icon="🌐" label="Pays">
              <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
                <CountryFlag code={country.code} size={18}/>
                {country.name}
              </span>
            </Row>
          )}
          {event.description && (
            <Row icon="📝" label="Description">
              <div style={{ whiteSpace:"pre-wrap", lineHeight:1.5 }}>{event.description}</div>
            </Row>
          )}
          {participants.length > 0 && (
            <Row icon="👥" label={`Participants (${participants.length})`}>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:4 }}>
                {participants.map(u => (
                  <span key={u.id} style={{
                    display:"inline-flex", alignItems:"center", gap:6,
                    padding:"4px 10px", borderRadius:20,
                    background: (u.color || "#8E8E93") + "18",
                    color: u.color || "#3A3A3C",
                    fontSize:12, fontWeight:600,
                  }}>
                    <span style={{
                      width:16, height:16, borderRadius:"50%",
                      background:u.color || "#8E8E93", color:"white",
                      display:"inline-flex", alignItems:"center", justifyContent:"center",
                      fontSize:9, fontWeight:700,
                    }}>{u.displayName?.[0]}</span>
                    {u.displayName}
                  </span>
                ))}
              </div>
            </Row>
          )}
        </div>

        {/* Audit footer */}
        <MetaTags
          createdBy={event.createdBy}
          createdAt={event.createdAt}
          updatedAt={event.updatedAt}
          users={users}
        />

        <div style={{ display:"flex", marginTop:16 }}>
          <button className="btn btn-primary" style={{ flex:1, justifyContent:"center" }} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
