// src/pages/EventsPage.jsx
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { fmtEventDate, fmtEventTime, daysUntil, DAY } from "../utils/helpers";
import { COUNTRIES, CountryFlag, getCountry } from "../utils/countries";
import { MetaTags } from "../components/MetaTags";

const EVENT_COLORS = ["#007AFF","#34C759","#FF9500","#FF3B30","#AF52DE","#FF2D55","#00C7BE","#5856D6","#111"];

// Visual representation of an event: a custom emoji icon takes priority;
// otherwise the country flag is shown; otherwise a neutral calendar emoji.
function EventAvatar({ event, size = 44 }) {
  if (event.icon) {
    return (
      <div style={{
        width:size, height:size, borderRadius:"50%",
        background:(event.color || "#007AFF") + "20",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:Math.round(size * 0.46), flexShrink:0,
      }}>
        {event.icon}
      </div>
    );
  }
  if (event.country) {
    return <CountryFlag code={event.country} size={size}/>;
  }
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background:(event.color || "#007AFF") + "20",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:Math.round(size * 0.46), flexShrink:0,
    }}>
      📅
    </div>
  );
}

function EventBadge({ event }) {
  const days = daysUntil(event.startDate);
  const isPast = days < 0;
  const isToday = days === 0;
  return (
    <span style={{
      fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20,
      background: isPast ? "#F2F2F7" : isToday ? "#FFF3CD" : "#EFF6FF",
      color: isPast ? "#8E8E93" : isToday ? "#FF9500" : "#007AFF"
    }}>
      {isPast ? "Passé" : isToday ? "Aujourd'hui" : `${days}j`}
    </span>
  );
}

// ─── List View ───────────────────────────────────────────────────────────────
function ListView({ events, onEdit, canManage }) {
  const upcoming = events.filter(e => e.endDate >= Date.now()).sort((a,b) => a.startDate - b.startDate);
  const past     = events.filter(e => e.endDate < Date.now()).sort((a,b) => b.startDate - a.startDate);

  const EventRow = ({ event }) => {
    const days = daysUntil(event.startDate);
    const isPast = event.endDate < Date.now();
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

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ events, onEdit, canManage }) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const getEventsForDay = (day) => {
    const dayStart = new Date(year, month, day).setHours(0,0,0,0);
    const dayEnd   = new Date(year, month, day).setHours(23,59,59,999);
    return events.filter(e => e.startDate <= dayEnd && e.endDate >= dayStart);
  };

  const monthName = viewDate.toLocaleDateString("fr-CA", { month:"long", year:"numeric" });
  const dayNames  = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
  const cells = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="card" style={{ padding:20 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <button className="btn btn-outline" style={{ padding:"8px 14px" }} onClick={prevMonth}>‹</button>
        <h3 style={{ fontSize:17, fontWeight:700, textTransform:"capitalize" }}>{monthName}</h3>
        <button className="btn btn-outline" style={{ padding:"8px 14px" }} onClick={nextMonth}>›</button>
      </div>

      {/* Day names */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {dayNames.map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:600, color:"#8E8E93", padding:"4px 0" }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`}/>;
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const dayEvents = getEventsForDay(day);
          return (
            <div key={day} style={{
              minHeight:64, padding:"4px 6px", borderRadius:10,
              background: isToday ? "#007AFF" : dayEvents.length > 0 ? "#F0F7FF" : "#F9F9F9",
              border: isToday ? "none" : "1px solid #F2F2F7",
            }}>
              <div style={{ fontSize:13, fontWeight: isToday ? 800 : 600, color: isToday ? "white" : "#1C1C1E", marginBottom:3 }}>{day}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                {dayEvents.slice(0,2).map(e => (
                  <div key={e.id}
                    onClick={() => canManage && onEdit(e)}
                    style={{ background: isToday ? "rgba(255,255,255,.25)" : e.color || "#007AFF", borderRadius:4, padding:"1px 4px", fontSize:9, fontWeight:600, color: isToday ? "white" : "white", cursor: canManage ? "pointer" : "default", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {e.title}
                  </div>
                ))}
                {dayEvents.length > 2 && <div style={{ fontSize:9, color: isToday ? "rgba(255,255,255,.8)" : "#8E8E93" }}>+{dayEvents.length - 2}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Cards View ──────────────────────────────────────────────────────────────
function CardsView({ events, onEdit, canManage }) {
  const sorted = [...events].sort((a,b) => a.startDate - b.startDate);

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
      {sorted.length === 0 && (
        <div className="card" style={{ textAlign:"center", padding:48, gridColumn:"1/-1" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📅</div>
          <p style={{ fontWeight:600 }}>Aucun événement</p>
        </div>
      )}
      {sorted.map(event => {
        const days    = daysUntil(event.startDate);
        const isPast  = event.endDate < Date.now();
        const isToday = days === 0 && !isPast;
        return (
          <div key={event.id}
            className="event-card"
            onClick={() => canManage && onEdit(event)}
            style={{ background: isPast ? "#F9F9F9" : event.color || "#007AFF", opacity: isPast ? 0.65 : 1 }}
          >
            <div style={{ padding:"20px 20px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <EventAvatar event={event} size={44}/>
                {!isPast && (
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:36, fontWeight:800, color:"white", lineHeight:1 }}>{days}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.8)" }}>{days === 1 ? "jour" : "jours"}</div>
                  </div>
                )}
                {isPast && <span className="badge bp">Passé</span>}
              </div>
              <h3 style={{ fontSize:17, fontWeight:800, color: isPast ? "#1C1C1E" : "white", marginBottom:4, lineHeight:1.3 }}>{event.title}</h3>
              {event.subtitle && <p style={{ fontSize:13, color: isPast ? "#8E8E93" : "rgba(255,255,255,.85)", marginBottom:6 }}>{event.subtitle}</p>}
              {event.description && <p style={{ fontSize:12, color: isPast ? "#8E8E93" : "rgba(255,255,255,.75)", lineHeight:1.5 }}>{event.description}</p>}
            </div>
            <div style={{ background:"rgba(0,0,0,.12)", padding:"10px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:12, color: isPast ? "#8E8E93" : "rgba(255,255,255,.9)", fontWeight:500 }}>
                🗓 {fmtEventDate(event.startDate)}
              </div>
              {event.location && <div style={{ fontSize:11, color: isPast ? "#C7C7CC" : "rgba(255,255,255,.7)" }}>📍 {event.location}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Country dropdown (custom, with circular SVG flags) ─────────────────────
function CountryDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const selected = getCountry(value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Autofocus the search field when opening
  useEffect(() => {
    if (open) {
      setFilter("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const q = filter.trim().toLowerCase();
  const items = q
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    : COUNTRIES;

  const pick = (code) => { onChange(code); setOpen(false); };

  return (
    <div ref={rootRef} style={{ position:"relative" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width:"100%", display:"flex", alignItems:"center", gap:12,
          background:"#F2F2F7", border:"1.5px solid transparent",
          borderRadius:12, padding:"10px 14px", cursor:"pointer",
          fontFamily:"inherit", fontSize:15, color:"#1C1C1E",
          transition:"all .15s",
          ...(open ? { background:"white", borderColor:"#007AFF", boxShadow:"0 0 0 3px rgba(0,122,255,.12)" } : {}),
        }}
      >
        {selected ? (
          <>
            <CountryFlag code={selected.code} size={26}/>
            <span style={{ flex:1, textAlign:"left", fontWeight:600 }}>{selected.name}</span>
            <span style={{ fontSize:11, color:"#8E8E93", fontFamily:"monospace" }}>{selected.code}</span>
          </>
        ) : (
          <>
            <div style={{
              width:26, height:26, borderRadius:"50%",
              border:"1.5px dashed #C7C7CC", color:"#8E8E93",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:13,
            }}>∅</div>
            <span style={{ flex:1, textAlign:"left", color:"#8E8E93" }}>Aucun pays</span>
          </>
        )}
        <span aria-hidden style={{ color:"#8E8E93", fontSize:11, transform: open ? "rotate(180deg)" : "none", transition:"transform .15s" }}>▼</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          style={{
            position:"absolute", top:"calc(100% + 6px)", left:0, right:0,
            background:"white", borderRadius:14,
            boxShadow:"0 12px 32px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.06)",
            zIndex:20, overflow:"hidden",
            animation:"fup .15s ease",
          }}
        >
          {/* Search */}
          <div style={{ padding:"10px 12px", borderBottom:"1px solid #F2F2F7" }}>
            <input
              ref={inputRef}
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Rechercher un pays…"
              className="inp"
              style={{ padding:"8px 12px", fontSize:14 }}
            />
          </div>

          <div style={{ maxHeight:260, overflowY:"auto", padding:"6px 0" }}>
            {/* "None" option */}
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => pick("")}
              style={{
                width:"100%", display:"flex", alignItems:"center", gap:12,
                padding:"9px 14px", background: !value ? "#EFF6FF" : "white",
                border:"none", cursor:"pointer", fontFamily:"inherit",
                textAlign:"left", color:"#1C1C1E", fontSize:14,
                borderBottom:"1px solid #F2F2F7",
              }}
              onMouseEnter={e => { if (value) e.currentTarget.style.background = "#F9F9FB"; }}
              onMouseLeave={e => { if (value) e.currentTarget.style.background = "white"; }}
            >
              <div style={{
                width:26, height:26, borderRadius:"50%",
                border:"1.5px dashed #C7C7CC", color:"#8E8E93",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, flexShrink:0,
              }}>∅</div>
              <span style={{ color:"#8E8E93" }}>Aucun pays</span>
              {!value && <span style={{ marginLeft:"auto", color:"#007AFF", fontSize:13, fontWeight:700 }}>✓</span>}
            </button>

            {items.length === 0 && (
              <div style={{ padding:"20px 14px", textAlign:"center", color:"#8E8E93", fontSize:13 }}>
                Aucun résultat
              </div>
            )}

            {items.map(c => {
              const isSelected = value === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => pick(c.code)}
                  style={{
                    width:"100%", display:"flex", alignItems:"center", gap:12,
                    padding:"9px 14px",
                    background: isSelected ? "#EFF6FF" : "white",
                    border:"none", cursor:"pointer", fontFamily:"inherit",
                    textAlign:"left", color:"#1C1C1E", fontSize:14,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#F9F9FB"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "white"; }}
                >
                  <CountryFlag code={c.code} size={26}/>
                  <span style={{ flex:1, fontWeight: isSelected ? 700 : 500 }}>{c.name}</span>
                  <span style={{ fontSize:11, color:"#8E8E93", fontFamily:"monospace" }}>{c.code}</span>
                  {isSelected && <span style={{ color:"#007AFF", fontSize:13, fontWeight:700 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Event Details Modal (read-only) ────────────────────────────────────────
// Shown to users who have `canViewEvents` but not `canManageEvents`.
// Mirrors the layout of EventModal so the look stays consistent, but renders
// every field as plain text and exposes no Save / Delete actions.
function EventDetailsModal({ event, users, onClose }) {
  const startStr = event.allDay
    ? fmtEventDate(event.startDate)
    : `${fmtEventDate(event.startDate)} · ${fmtEventTime(event.startDate)}`;
  const endStr = event.endDate
    ? (event.allDay
        ? (event.endDate - event.startDate > DAY ? fmtEventDate(event.endDate) : null)
        : `${fmtEventDate(event.endDate)} · ${fmtEventTime(event.endDate)}`)
    : null;

  const days   = daysUntil(event.startDate);
  const isPast = event.endDate < Date.now();
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

// ─── Event Modal ─────────────────────────────────────────────────────────────
function EventModal({ event, users, onSave, onDelete, onClose, currentUserId }) {
  const isNew = !event?.id;
  const [form, setForm] = useState(() => event || {
    title:"", subtitle:"", description:"", icon:"", country:"",
    startDate: Date.now() + DAY, endDate: Date.now() + DAY + 3600000,
    allDay: false, location:"", color:"#007AFF",
    assignedTo: [], createdBy: currentUserId,
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toDateInput = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  const toggleUser = (uid) => {
    const cur = form.assignedTo || [];
    set("assignedTo", cur.includes(uid) ? cur.filter(x => x !== uid) : [...cur, uid]);
  };

  const ICONS = ["📅","🏍","🎉","🏆","🛠","📦","🤝","🎤","🏕","🚗","✈️","⚙️"];

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxWidth:560 }}>
        <div className="handle"/>
        <h3 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>
          {isNew ? "➕ Nouvel événement" : "✏️ Modifier l'événement"}
        </h3>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Live preview */}
          <div style={{
            display:"flex", alignItems:"center", gap:14,
            background:"#F9F9FB", border:"1px solid #EEF0F3",
            borderRadius:14, padding:"12px 14px",
          }}>
            <EventAvatar event={form} size={48}/>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:".08em", color:"#8E8E93", textTransform:"uppercase" }}>Aperçu</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#1C1C1E", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {form.title || "Titre de l'événement"}
              </div>
              <div style={{ fontSize:11, color:"#8E8E93" }}>
                {form.icon
                  ? "Icône personnalisée"
                  : form.country
                    ? (COUNTRIES.find(c => c.code === form.country)?.name || "Drapeau")
                    : "Icône par défaut"}
              </div>
            </div>
          </div>

          {/* Country picker — dropdown */}
          <div>
            <label className="lbl">
              Pays
              <span style={{ fontWeight:400, color:"#8E8E93", marginLeft:6 }}>
                · drapeau utilisé comme icône par défaut
              </span>
            </label>
            <CountryDropdown value={form.country} onChange={(code) => set("country", code)}/>
          </div>

          {/* Icon picker — optional override */}
          <div>
            <label className="lbl">
              Icône personnalisée
              <span style={{ fontWeight:400, color:"#8E8E93", marginLeft:6 }}>
                · remplace le drapeau
              </span>
            </label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {/* "None" → revert to flag */}
              <button
                type="button"
                onClick={() => set("icon", "")}
                aria-pressed={!form.icon}
                title="Aucune icône personnalisée"
                style={{
                  fontSize:14, width:40, height:40, borderRadius:10,
                  border:"2px dashed",
                  borderColor: !form.icon ? "#007AFF" : "#D1D1D6",
                  background: !form.icon ? "#EFF6FF" : "white",
                  color:"#8E8E93", cursor:"pointer",
                }}
              >
                ∅
              </button>
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => set("icon", ic)}
                  style={{ fontSize:20, width:40, height:40, borderRadius:10, border:"2px solid", borderColor: form.icon === ic ? "#007AFF" : "#E5E5EA", background: form.icon === ic ? "#EFF6FF" : "white", cursor:"pointer" }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div><label className="lbl">Titre *</label><input className="inp" placeholder="Nom de l'événement" value={form.title} onChange={e => set("title", e.target.value)}/></div>
          <div><label className="lbl">Sous-titre</label><input className="inp" placeholder="Ex: Show Fracas, Courchevel…" value={form.subtitle || ""} onChange={e => set("subtitle", e.target.value)}/></div>
          <div><label className="lbl">Description</label><textarea className="inp" rows={2} placeholder="Détails supplémentaires…" value={form.description || ""} onChange={e => set("description", e.target.value)} style={{ resize:"none" }}/></div>
          <div><label className="lbl">Lieu</label><input className="inp" placeholder="Ville, adresse…" value={form.location || ""} onChange={e => set("location", e.target.value)}/></div>

          <div style={{ display:"flex", gap:12 }}>
            <div style={{ flex:1 }}>
              <label className="lbl">Début *</label>
              <input type="datetime-local" className="inp" value={toDateInput(form.startDate)} onChange={e => set("startDate", new Date(e.target.value).getTime())}/>
            </div>
            <div style={{ flex:1 }}>
              <label className="lbl">Fin</label>
              <input type="datetime-local" className="inp" value={toDateInput(form.endDate)} onChange={e => set("endDate", new Date(e.target.value).getTime())}/>
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="lbl">Couleur</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {EVENT_COLORS.map(c => (
                <div key={c} onClick={() => set("color", c)}
                  style={{ width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer", border: form.color === c ? "3px solid #1C1C1E" : "3px solid transparent", transition:"border .15s" }}/>
              ))}
            </div>
          </div>

          {/* Assign users */}
          {users.length > 0 && (
            <div>
              <label className="lbl">Participants</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {users.map(u => {
                  const selected = (form.assignedTo || []).includes(u.id);
                  return (
                    <button key={u.id} onClick={() => toggleUser(u.id)}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:20, border:"1.5px solid", borderColor: selected ? u.color : "#E5E5EA", background: selected ? u.color+"18" : "white", cursor:"pointer", fontSize:13, fontWeight:selected?600:400, color: selected ? u.color : "#3A3A3C", transition:"all .15s" }}>
                      <div style={{ width:18, height:18, borderRadius:"50%", background:u.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"white" }}>{u.displayName?.[0]}</div>
                      {u.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Audit footer (edit only) */}
          {!isNew && (
            <MetaTags
              createdBy={event.createdBy}
              createdAt={event.createdAt}
              updatedAt={event.updatedAt}
              users={users}
            />
          )}

          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            {!isNew && <button className="btn btn-red" style={{ padding:"11px 16px" }} onClick={() => onDelete(event.id)}>Supprimer</button>}
            <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" style={{ flex:2, justifyContent:"center", opacity:form.title ? 1 : .5 }}
              onClick={() => form.title && onSave(form)}>
              {isNew ? "Créer" : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main EventsPage ─────────────────────────────────────────────────────────
export function EventsPage({ events, users, addEvent, updateEvent, deleteEvent, showToast }) {
  const { can, userProfile } = useAuth();
  const canManage = can("canManageEvents");
  // Read-only access. Managers implicitly have view rights.
  const canView   = canManage || can("canViewEvents");
  // Whether clicking a card opens any modal at all.
  const canOpen   = canManage || canView;

  const [view,       setView]       = useState("list");
  const [modal,      setModal]      = useState(null); // null | "new" | event object
  const [filterText, setFilterText] = useState("");

  const filtered = events.filter(e =>
    !filterText ||
    e.title?.toLowerCase().includes(filterText.toLowerCase()) ||
    e.location?.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleSave = async (form) => {
    try {
      if (form.id) {
        await updateEvent(form.id, form);
        showToast("Événement mis à jour !");
      } else {
        await addEvent({ ...form, createdBy: userProfile.id });
        showToast("Événement créé !");
      }
      setModal(null);
    } catch (e) {
      showToast("Erreur: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet événement ?")) return;
    try {
      await deleteEvent(id);
      showToast("Événement supprimé.");
      setModal(null);
    } catch (e) {
      showToast("Erreur: " + e.message);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <div className="tabs" style={{ flex:1, minWidth:200 }}>
          {[["list","≡ Liste"],["calendar","📅 Calendrier"],["cards","⊞ Grille"]].map(([v,l]) => (
            <button key={v} className={`tab ${view===v?"on":""}`} onClick={() => setView(v)}>{l}</button>
          ))}
        </div>
        <input className="inp" placeholder="Rechercher…" value={filterText} onChange={e => setFilterText(e.target.value)}
          style={{ maxWidth:200 }}/>
        {canManage && (
          <button className="btn btn-primary" style={{ padding:"10px 18px" }} onClick={() => setModal("new")}>
            + Événement
          </button>
        )}
      </div>

      {/* Views — `canManage` here just means "make rows clickable". Viewers
          can also open a (read-only) modal, so we pass `canOpen` instead. */}
      {view === "list"     && <ListView     events={filtered} onEdit={setModal} canManage={canOpen}/>}
      {view === "calendar" && <CalendarView events={filtered} onEdit={setModal} canManage={canOpen}/>}
      {view === "cards"    && <CardsView    events={filtered} onEdit={setModal} canManage={canOpen}/>}

      {/* Modal — managers get the full editor; viewers get a read-only sheet.
          The "new" sentinel always opens the editor (only managers can trigger it). */}
      {modal && (
        canManage ? (
          <EventModal
            event={modal === "new" ? null : modal}
            users={users}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setModal(null)}
            currentUserId={userProfile?.id}
          />
        ) : (
          <EventDetailsModal
            event={modal}
            users={users}
            onClose={() => setModal(null)}
          />
        )
      )}
    </div>
  );
}
