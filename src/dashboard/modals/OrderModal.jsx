// src/dashboard/modals/OrderModal.jsx
import { useState } from "react";
import { getDL, fmtMs, DAY } from "../../utils/helpers";
import { MetaTags } from "../../components/MetaTags";
import { ContactPicker } from "../../components/ContactPicker";

export function OrderModal({ order, employees, users, contacts, onSave, onDelete, onClose }) {
  const isNew = !order?.id;
  const [form, setForm] = useState(() => order ? { ...order } : {
    clientName:"", clientEmail:"", description:"",
    assignedTo:"", status:"pending",
    deadline: Date.now() + 5 * DAY,
    startTime:null, endTime:null, elapsed:0,
    contactId: null,
  });
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleContactChange = (contactData) => {
    if (!contactData) {
      set("contactId", null);
      set("clientName", "");
      set("clientEmail", "");
      return;
    }
    set("contactId", contactData.id || null);
    set("clientName", contactData.name || "");
    set("clientEmail", contactData.email || "");
  };

  const toDateInput = (ts) => {
    const d = new Date(ts || Date.now());
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  const fromDateInput = (s) => {
    if (!s) return Date.now();
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  };

  const dl = getDL(form.deadline);
  const canSubmit = form.clientName?.trim();

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!order?.id || deleting) return;
    setDeleting(true);
    try { await onDelete(order.id); }
    finally { setDeleting(false); }
  };

  const STATUS_OPTIONS = [
    { v:"pending",    label:"⏸ En attente", color:"#8E8E93" },
    { v:"inprogress", label:"⚡ En cours",   color:"#007AFF" },
    { v:"done",       label:"✓ Terminée",    color:"#34C759" },
  ];

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxWidth:560 }}>
        <div className="handle"/>
        <h3 style={{ fontSize:20, fontWeight:700, marginBottom:6 }}>
          {isNew ? "📦 Nouvelle commande" : "✏️ Modifier la commande"}
        </h3>
        {!isNew && (
          <p style={{ fontSize:12, color:"#C7C7CC", fontFamily:"monospace", marginBottom:16 }}>
            {order.id}
          </p>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <ContactPicker
              contacts={contacts}
              value={form.contactId || null}
              onChange={handleContactChange}
              label="Client"
              required
              placeholder="Rechercher un contact…"
            />
          </div>

          {!form.contactId && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label className="lbl">Nom du client *</label>
                <input className="inp" placeholder="Sophie Tremblay" value={form.clientName || ""} onChange={e => set("clientName", e.target.value)}/>
              </div>
              <div>
                <label className="lbl">Courriel</label>
                <input className="inp" type="email" placeholder="client@exemple.com" value={form.clientEmail || ""} onChange={e => set("clientEmail", e.target.value)}/>
              </div>
            </div>
          )}

          <div>
            <label className="lbl">Description</label>
            <textarea className="inp" rows={3} placeholder="50x t-shirts noirs, sérigraphie 2 couleurs…" value={form.description || ""} onChange={e => set("description", e.target.value)} style={{ resize:"vertical", minHeight:72 }}/>
          </div>

          <div>
            <label className="lbl">Assigner à</label>
            <select className="sel" value={form.assignedTo || ""} onChange={e => set("assignedTo", e.target.value)}>
              <option value="">Non assigné</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.displayName}</option>
              ))}
            </select>
          </div>

          {!isNew && (
            <div>
              <label className="lbl">Statut</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {STATUS_OPTIONS.map(opt => {
                  const active = form.status === opt.v;
                  return (
                    <button key={opt.v} type="button" onClick={() => set("status", opt.v)}
                      style={{
                        flex:1, minWidth:120, padding:"9px 12px", borderRadius:10, border:"1.5px solid",
                        borderColor: active ? opt.color : "#E5E5EA", background: active ? opt.color + "18" : "white",
                        color: active ? opt.color : "#3A3A3C", fontWeight: active ? 700 : 500,
                        cursor:"pointer", fontFamily:"inherit", fontSize:13, transition:"all .15s",
                      }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="lbl">
              Échéance
              {!dl.overdue && (
                <span style={{ marginLeft:8, fontWeight:600, color:dl.color }}>
                  · {dl.days > 0 ? `${dl.days}j ${dl.hours}h restants` : `${dl.hours}h restantes`}
                </span>
              )}
              {dl.overdue && (
                <span style={{ marginLeft:8, fontWeight:700, color:"#FF3B30" }}>· ⚠️ En retard</span>
              )}
            </label>
            <input type="date" className="inp" value={toDateInput(form.deadline)} onChange={e => set("deadline", fromDateInput(e.target.value))}/>
            {isNew && (
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                {[1,2,3,5,7,10,14,21,30].map(d => (
                  <button key={d} type="button" onClick={() => set("deadline", Date.now() + d * DAY)}
                    style={{ padding:"5px 11px", borderRadius:16, border:"1px solid #E5E5EA", background:"white", fontSize:12, fontWeight:600, color:"#6D6D72", cursor:"pointer", fontFamily:"inherit" }}>
                    +{d}j
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isNew && (form.elapsed > 0 || form.startTime) && (
            <div style={{ background:"#F9F9FB", border:"1px solid #EEF0F3", borderRadius:12, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, color:"#8E8E93", fontWeight:600 }}>⏱ Temps suivi</span>
              <span style={{ fontFamily:"monospace", fontWeight:700, color:"#FF6B35" }}>{fmtMs(form.elapsed || 0)}</span>
            </div>
          )}

          {!isNew && (
            <MetaTags createdBy={order.createdBy} createdAt={order.createdAt} updatedAt={order.updatedAt} users={users} />
          )}

          <div style={{ display:"flex", gap:10, marginTop:6, flexWrap:"wrap" }}>
            {!isNew && (
              <button className="btn btn-red" style={{ padding:"11px 16px" }} onClick={remove} disabled={deleting || saving}>
                {deleting ? <><span className="sp"/> Suppression…</> : "Supprimer"}
              </button>
            )}
            <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onClose} disabled={saving || deleting}>Annuler</button>
            <button className="btn btn-primary" style={{ flex:2, justifyContent:"center", opacity: canSubmit ? 1 : .5 }} onClick={submit} disabled={!canSubmit || saving || deleting}>
              {saving ? <><span className="sp"/> {isNew ? "Création…" : "Sauvegarde…"}</>
                      : (isNew ? "Créer" : "Sauvegarder")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
