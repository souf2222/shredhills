import { useState } from "react";
import { DAY, dayStart } from "../../utils/helpers";
import { COUNTRIES } from "../../utils/countries";
import { EventAvatar } from "../../components/EventAvatar";
import { CountryDropdown } from "../../components/CountryDropdown";
import { MetaTags } from "../../components/MetaTags";

const EVENT_COLORS = ["#007AFF","#34C759","#FF9500","#FF3B30","#AF52DE","#FF2D55","#00C7BE","#5856D6","#111"];

export function EventModal({ event, users, onSave, onDelete, onClose, currentUserId }) {
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

  const toDateOnlyInput = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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

          {/* All day toggle */}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <input
              type="checkbox"
              id="allDay"
              checked={form.allDay || false}
              onChange={e => {
                const checked = e.target.checked;
                if (checked) {
                  setForm(f => ({
                    ...f,
                    allDay: true,
                    startDate: dayStart(f.startDate),
                    endDate: dayStart(f.endDate),
                  }));
                } else {
                  setForm(f => ({
                    ...f,
                    allDay: false,
                    endDate: f.endDate <= f.startDate ? f.startDate + 3600000 : f.endDate,
                  }));
                }
              }}
              style={{ width:18, height:18, cursor:"pointer" }}
            />
            <label htmlFor="allDay" className="lbl" style={{ marginBottom:0, cursor:"pointer" }}>
              Toute la journée
            </label>
          </div>

          <div style={{ display:"flex", gap:12 }}>
            <div style={{ flex:1 }}>
              <label className="lbl">Début *</label>
              <input
                type={form.allDay ? "date" : "datetime-local"}
                className="inp"
                value={form.allDay ? toDateOnlyInput(form.startDate) : toDateInput(form.startDate)}
                onChange={e => {
                  const newStart = form.allDay
                    ? new Date(e.target.value + "T00:00:00").getTime()
                    : new Date(e.target.value).getTime();
                  setForm(f => ({
                    ...f,
                    startDate: newStart,
                    // Keep endDate >= startDate so events don't get stranded in the past.
                    endDate: f.endDate < newStart
                      ? (f.allDay ? newStart : newStart + 3600000)
                      : f.endDate,
                  }));
                }}
              />
            </div>
            <div style={{ flex:1 }}>
              <label className="lbl">Fin</label>
              <input
                type={form.allDay ? "date" : "datetime-local"}
                className="inp"
                value={form.allDay ? toDateOnlyInput(form.endDate) : toDateInput(form.endDate)}
                onChange={e => set("endDate", form.allDay ? new Date(e.target.value + "T00:00:00").getTime() : new Date(e.target.value).getTime())}
              />
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
