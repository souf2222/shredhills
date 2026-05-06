// src/pages/AdminPage.jsx
import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Nav } from "../components/Nav";
import { Sidebar } from "../components/Sidebar";
import { Toast } from "../components/Toast";
import { MetaTags } from "../components/MetaTags";
import { Modal } from "../components/Modal";
import { PhotoLightbox } from "../components/PhotoLightbox";
import { PhotoUpload } from "../components/PhotoUpload";
import { CategoriesManager } from "../components/CategoriesManager";
import { EventsPage } from "./EventsPage";
import { SettingsPage } from "./SettingsPage";
import { GestionRoutesSection } from "./GestionRoutesSection";
import { createAuthUserKeepingSession, sendPasswordReset } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { fmtMs, fmtHours, fmtDate, fmtTime, getDL, getDateRange, groupByDay, dayStart, daysUntil, DAY } from "../utils/helpers";
import { useRoute } from "../hooks/useRoute";

const PERMISSION_LABELS = {
  canManageUsers:        "Gérer les utilisateurs",
  canManageOrders:       "Gérer les commandes",
  canManageEvents:       "Gérer les événements",
  canViewEvents:         "Voir les événements",
  canManagePurchases:    "Approuver les achats",
  canManageDeliveries:   "Gérer les livraisons",
  canViewReports:        "Voir les feuilles de temps",
  canClockIn:            "Pointage (entrée/sortie)",
  canViewTasks:          "Voir les tâches",
  canSubmitPurchases:    "Soumettre des achats",
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  const dateA = a.toDate ? a.toDate() : new Date(a);
  const dateB = b.toDate ? b.toDate() : new Date(b);
  return dateA.toDateString() === dateB.toDateString();
};

const JOB_OPTIONS = [
  { id:"employee",   label:"👷 Employé" },
  { id:"driver",     label:"🚐 Livreur" },
  { id:"accountant", label:"📊 Comptable" },
  { id:"admin",      label:"⚙️ Admin" },
];

const COLORS = ["#FF6B35","#007AFF","#34C759","#FF9500","#AF52DE","#FF3B30","#00C7BE","#5856D6","#111"];

// ═══ USER MODAL (Create / Edit) ══════════════════════════════════════════════
function UserModal({ user, onSave, onDelete, onClose, currentUserId, showToast }) {
  const isNew = !user?.id;
  const [form, setForm] = useState(() => user || {
    email:"", password:"", displayName:"",
    role:"user", jobs:["employee"],
    color:"#FF6B35", pin:"",
    permissions: {
      canManageUsers: false, canManageOrders: false, canManageEvents: false, canViewEvents: true,
      canManagePurchases: false, canManageDeliveries: false, canViewReports: false,
      canClockIn: true, canViewTasks: true, canSubmitPurchases: true,
    }
  });
  const [showPwd, setShowPwd] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [resettingPwd, setResettingPwd] = useState(false);

  // Trigger a Firebase password-reset email for the user being edited.
  // We can't set another user's password directly from the client SDK (by
  // design), so we delegate to Firebase: the user receives a secure link and
  // picks a new password themselves. No secrets leak through the admin UI.
  const handleSendPasswordReset = async () => {
    if (!user?.email) {
      showToast("Adresse courriel manquante.");
      return;
    }
    setResettingPwd(true);
    try {
      await sendPasswordReset(user.email);
      showToast(`✉️ Courriel envoyé à ${user.email}`);
    } catch (e) {
      const msgs = {
        "auth/user-not-found":      "Aucun compte trouvé pour ce courriel.",
        "auth/invalid-email":       "Courriel invalide.",
        "auth/too-many-requests":   "Trop de tentatives. Réessayez plus tard.",
        "auth/network-request-failed": "Erreur réseau.",
      };
      showToast(msgs[e.code] || "Erreur : " + (e.message || "inconnue"));
    } finally {
      setResettingPwd(false);
    }
  };

  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));
  const setPerm = (k,v) => setForm(f => ({ ...f, permissions: { ...f.permissions, [k]: v } }));
  const toggleJob = (jid) => {
    const cur = form.jobs || [];
    set("jobs", cur.includes(jid) ? cur.filter(x => x !== jid) : [...cur, jid]);
  };

  const applyTemplate = (tpl) => {
    if (tpl === "admin") {
      setForm(f => ({ ...f, role:"admin", jobs:["admin"], permissions: Object.fromEntries(Object.keys(PERMISSION_LABELS).map(k => [k, true])) }));
    } else if (tpl === "accountant") {
      setForm(f => ({ ...f, role:"user", jobs:["accountant"], permissions: {
        canManageUsers:true, canManageOrders:false, canManageEvents:false, canViewEvents:true,
        canManagePurchases:true, canManageDeliveries:false, canViewReports:true,
        canClockIn:true, canViewTasks:false, canSubmitPurchases:true,
      }}));
    } else if (tpl === "employee") {
      setForm(f => ({ ...f, role:"user", jobs:["employee"], permissions: {
        canManageUsers:false, canManageOrders:false, canManageEvents:false, canViewEvents:true,
        canManagePurchases:false, canManageDeliveries:false, canViewReports:false,
        canClockIn:true, canViewTasks:true, canSubmitPurchases:true,
      }}));
    } else if (tpl === "driver") {
      setForm(f => ({ ...f, role:"user", jobs:["driver"], permissions: {
        canManageUsers:false, canManageOrders:false, canManageEvents:false, canViewEvents:true,
        canManagePurchases:false, canManageDeliveries:true, canViewReports:false,
        canClockIn:true, canViewTasks:false, canSubmitPurchases:false,
      }}));
    }
  };

  const handleSave = async () => {
    if (!form.email || !form.displayName) {
      showToast("Email et nom requis");
      return;
    }
    if (isNew && (!form.password || form.password.length < 6)) {
      showToast("Mot de passe min. 6 caractères");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        // Provision the new Auth account on a *secondary* Firebase app so
        // the admin's session on the main app stays untouched. See the
        // helper definition in firebase.js for the rationale.
        const { uid } = await createAuthUserKeepingSession(
          form.email.trim(),
          form.password,
          form.displayName
        );
        await setDoc(doc(db, "users", uid), {
          email: form.email.trim(),
          displayName: form.displayName,
          role: form.role,
          jobs: form.jobs || [],
          permissions: form.permissions,
          color: form.color,
          pin: form.pin || "",
          createdAt: serverTimestamp(),
        });
        showToast("✅ Utilisateur créé.");
      } else {
        await onSave({
          id: user.id,
          displayName: form.displayName,
          role: form.role,
          jobs: form.jobs || [],
          permissions: form.permissions,
          color: form.color,
          pin: form.pin || "",
        });
      }
      onClose();
    } catch (e) {
      const msgs = {
        "auth/email-already-in-use": "Courriel déjà utilisé.",
        "auth/invalid-email": "Courriel invalide.",
        "auth/weak-password": "Mot de passe trop faible.",
      };
      showToast(msgs[e.code] || "Erreur : " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxWidth:600 }}>
        <div className="handle"/>
        <h3 style={{ fontSize:20, fontWeight:700, marginBottom:6 }}>
          {isNew ? "➕ Nouvel utilisateur" : "✏️ Modifier l'utilisateur"}
        </h3>
        {!isNew && <p style={{ fontSize:12, color:"#8E8E93", marginBottom:20, fontFamily:"monospace" }}>{user.email}</p>}

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Templates */}
          {isNew && (
            <div>
              <label className="lbl">Modèle rapide (optionnel)</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <button className="btn btn-outline" style={{ fontSize:12, padding:"6px 12px" }} onClick={() => applyTemplate("admin")}>⚙️ Admin</button>
                <button className="btn btn-outline" style={{ fontSize:12, padding:"6px 12px" }} onClick={() => applyTemplate("accountant")}>📊 Comptable</button>
                <button className="btn btn-outline" style={{ fontSize:12, padding:"6px 12px" }} onClick={() => applyTemplate("employee")}>👷 Employé</button>
                <button className="btn btn-outline" style={{ fontSize:12, padding:"6px 12px" }} onClick={() => applyTemplate("driver")}>🚐 Livreur</button>
              </div>
            </div>
          )}

          <div><label className="lbl">Nom complet</label><input className="inp" value={form.displayName} onChange={e => set("displayName", e.target.value)}/></div>

          {isNew && (
            <>
              <div><label className="lbl">Courriel</label><input className="inp" type="email" value={form.email} onChange={e => set("email", e.target.value)}/></div>
              <div>
                <label className="lbl">Mot de passe (min. 6)</label>
                <div style={{ display:"flex", gap:6 }}>
                  <input className="inp" type={showPwd?"text":"password"} value={form.password} onChange={e => set("password", e.target.value)}/>
                  <button className="btn btn-outline" style={{ padding:"0 14px" }} onClick={() => setShowPwd(s => !s)} type="button">{showPwd?"🙈":"👁"}</button>
                </div>
              </div>
            </>
          )}

          {/* Role */}
          <div>
            <label className="lbl">Rôle</label>
            <div style={{ display:"flex", gap:10 }}>
              {[["user","👤 Utilisateur"],["admin","⚙️ Admin"]].map(([v,l]) => (
                <button key={v} onClick={() => set("role", v)} className="btn"
                  style={{ flex:1, justifyContent:"center", background:form.role===v?"#111":"white", color:form.role===v?"white":"#3A3A3C", border:"1.5px solid", borderColor:form.role===v?"#111":"#E5E5EA" }}>{l}</button>
              ))}
            </div>
            {form.role === "admin" && <p style={{ fontSize:12, color:"#8E8E93", marginTop:6 }}>Les admins ont toutes les permissions automatiquement.</p>}
          </div>

          {/* Jobs */}
          <div>
            <label className="lbl">Fonctions (peut en avoir plusieurs)</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {JOB_OPTIONS.map(j => {
                const selected = (form.jobs || []).includes(j.id);
                return (
                  <button key={j.id} onClick={() => toggleJob(j.id)}
                    style={{ padding:"8px 14px", borderRadius:20, border:"1.5px solid", borderColor: selected ? "#007AFF" : "#E5E5EA", background: selected ? "#EFF6FF" : "white", cursor:"pointer", fontSize:13, fontWeight:selected?600:400, color: selected ? "#007AFF" : "#3A3A3C", fontFamily:"inherit" }}>
                    {j.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions (only if not admin) */}
          {form.role !== "admin" && (
            <div>
              <label className="lbl">Permissions spécifiques</label>
              <div style={{ background:"#F9F9F9", borderRadius:12, padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <label key={key} style={{ display:"flex", alignItems:"center", gap:10, fontSize:14, cursor:"pointer" }}>
                    <input type="checkbox" checked={form.permissions?.[key] || false} onChange={e => setPerm(key, e.target.checked)} style={{ width:18, height:18 }}/>
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Color */}
          <div>
            <label className="lbl">Couleur</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => set("color", c)}
                  style={{ width:30, height:30, borderRadius:"50%", background:c, cursor:"pointer", border: form.color === c ? "3px solid #1C1C1E" : "3px solid transparent" }}/>
              ))}
            </div>
          </div>

          {/* PIN */}
          <div>
            <label className="lbl">NIP (optionnel, 4 chiffres)</label>
            <input className="inp" type="text" maxLength={4} placeholder="----" value={form.pin || ""} onChange={e => set("pin", e.target.value.replace(/\D/g,"").slice(0,4))} style={{ letterSpacing:"6px", textAlign:"center" }}/>
          </div>

          {/* Password reset — edit only. Firebase sends the user a secure link
              so the admin never handles their password directly. */}
          {!isNew && user?.email && (
            <div style={{
              background:"#F9F9FB", border:"1px solid #EEF0F3",
              borderRadius:12, padding:"14px 16px",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1C1C1E" }}>
                    🔒 Mot de passe
                  </div>
                  <div style={{ fontSize:12, color:"#8E8E93", marginTop:2, lineHeight:1.4 }}>
                    Envoie un courriel sécurisé à l'utilisateur pour qu'il choisisse un nouveau mot de passe.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding:"9px 14px", fontSize:13, whiteSpace:"nowrap" }}
                  onClick={handleSendPasswordReset}
                  disabled={resettingPwd || saving}
                >
                  {resettingPwd ? <><span className="sp" style={{ borderTopColor:"#3A3A3C" }}/> Envoi…</> : "✉️ Envoyer le lien"}
                </button>
              </div>
            </div>
          )}

          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            {!isNew && user.id !== currentUserId && (
              <button className="btn btn-red" style={{ padding:"11px 16px" }} onClick={() => onDelete(user.id)}>Supprimer</button>
            )}
            <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" style={{ flex:2, justifyContent:"center", opacity: saving ? .5 : 1 }} onClick={handleSave} disabled={saving}>
              {saving ? <><span className="sp"/> Sauvegarde…</> : (isNew ? "Créer" : "Sauvegarder")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Order Modal ─────────────────────────────────────────────────────────────
// Unified modal for both creating a new order and editing an existing one.
// Same UX pattern as EventModal: cards open this modal; Delete button only
// appears when editing.
function OrderModal({ order, employees, users, onSave, onDelete, onClose }) {
  const isNew = !order?.id;

  const defaultDeadline = Date.now() + 5 * DAY;
  const [form, setForm] = useState(() => order ? { ...order } : {
    clientName:"", clientEmail:"", description:"",
    assignedTo:"", status:"pending",
    deadline: defaultDeadline,
    startTime:null, endTime:null, elapsed:0,
  });
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Format a timestamp as YYYY-MM-DD for a <input type="date">.
  const toDateInput = (ts) => {
    const d = new Date(ts || Date.now());
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  // Parse YYYY-MM-DD as a local date, anchored at end-of-day so the deadline
  // remains "today" until midnight rather than expiring at 00:00.
  const fromDateInput = (s) => {
    if (!s) return Date.now();
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  };

  const dl = getDL(form.deadline);
  const canSubmit = form.clientName?.trim() && form.assignedTo;

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
            <label className="lbl">Nom du client *</label>
            <input className="inp" placeholder="Sophie Tremblay"
              value={form.clientName || ""}
              onChange={e => set("clientName", e.target.value)}/>
          </div>

          <div>
            <label className="lbl">Courriel</label>
            <input className="inp" type="email" placeholder="client@exemple.com"
              value={form.clientEmail || ""}
              onChange={e => set("clientEmail", e.target.value)}/>
          </div>

          <div>
            <label className="lbl">Description</label>
            <textarea className="inp" rows={3} placeholder="50x t-shirts noirs, sérigraphie 2 couleurs…"
              value={form.description || ""}
              onChange={e => set("description", e.target.value)}
              style={{ resize:"vertical", minHeight:72 }}/>
          </div>

          <div>
            <label className="lbl">Assigner à *</label>
            <select className="sel" value={form.assignedTo || ""}
              onChange={e => set("assignedTo", e.target.value)}>
              <option value="">— Choisir un employé —</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.displayName}</option>
              ))}
            </select>
          </div>

          {/* Status (edit only) */}
          {!isNew && (
            <div>
              <label className="lbl">Statut</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {STATUS_OPTIONS.map(opt => {
                  const active = form.status === opt.v;
                  return (
                    <button key={opt.v} type="button"
                      onClick={() => set("status", opt.v)}
                      style={{
                        flex:1, minWidth:120,
                        padding:"9px 12px", borderRadius:10,
                        border:"1.5px solid",
                        borderColor: active ? opt.color : "#E5E5EA",
                        background: active ? opt.color + "18" : "white",
                        color: active ? opt.color : "#3A3A3C",
                        fontWeight: active ? 700 : 500,
                        cursor:"pointer", fontFamily:"inherit", fontSize:13,
                        transition:"all .15s",
                      }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deadline */}
          <div>
            <label className="lbl">
              Échéance
              {!dl.overdue && (
                <span style={{ marginLeft:8, fontWeight:600, color:dl.color }}>
                  · {dl.days > 0 ? `${dl.days}j ${dl.hours}h restants` : `${dl.hours}h restantes`}
                </span>
              )}
              {dl.overdue && (
                <span style={{ marginLeft:8, fontWeight:700, color:"#FF3B30" }}>
                  · ⚠️ En retard
                </span>
              )}
            </label>
            <input type="date" className="inp"
              value={toDateInput(form.deadline)}
              onChange={e => set("deadline", fromDateInput(e.target.value))}/>
            {isNew && (
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                {[1,2,3,5,7,10,14,21,30].map(d => (
                  <button key={d} type="button"
                    onClick={() => set("deadline", Date.now() + d * DAY)}
                    style={{
                      padding:"5px 11px", borderRadius:16,
                      border:"1px solid #E5E5EA", background:"white",
                      fontSize:12, fontWeight:600, color:"#6D6D72",
                      cursor:"pointer", fontFamily:"inherit",
                    }}>
                    +{d}j
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time tracked (edit only, read-only) */}
          {!isNew && (form.elapsed > 0 || form.startTime) && (
            <div style={{
              background:"#F9F9FB", border:"1px solid #EEF0F3",
              borderRadius:12, padding:"10px 14px",
              display:"flex", justifyContent:"space-between", alignItems:"center",
            }}>
              <span style={{ fontSize:12, color:"#8E8E93", fontWeight:600 }}>
                ⏱ Temps suivi
              </span>
              <span style={{ fontFamily:"monospace", fontWeight:700, color:"#FF6B35" }}>
                {fmtMs(form.elapsed || 0)}
              </span>
            </div>
          )}

          {/* Audit footer (edit only) */}
          {!isNew && (
            <MetaTags
              createdBy={order.createdBy}
              createdAt={order.createdAt}
              updatedAt={order.updatedAt}
              users={users}
            />
          )}

          <div style={{ display:"flex", gap:10, marginTop:6, flexWrap:"wrap" }}>
            {!isNew && (
              <button className="btn btn-red" style={{ padding:"11px 16px" }}
                onClick={remove} disabled={deleting || saving}>
                {deleting ? <><span className="sp"/> Suppression…</> : "Supprimer"}
              </button>
            )}
            <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }}
              onClick={onClose} disabled={saving || deleting}>
              Annuler
            </button>
            <button className="btn btn-primary"
              style={{ flex:2, justifyContent:"center", opacity: canSubmit ? 1 : .5 }}
              onClick={submit}
              disabled={!canSubmit || saving || deleting}>
              {saving ? <><span className="sp"/> {isNew ? "Création…" : "Sauvegarde…"}</>
                      : (isNew ? "Créer" : "Sauvegarder")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ PURCHASES SUBMIT VIEW ═══════════════════════════════════════════════════
// Personal view for users who can submit purchase requests.
// - Header: explanatory text + "+ Nouvelle demande" button.
// - List of the current user's own purchases (already filtered by caller).
// - Status badge, category badge, amount, refusal reason, receipt thumbnail.
// No approve/refuse/delete actions here — those live in PurchasesAdminView.
function PurchasesSubmitView({ purchases, categories, onNewPurchase, onPhotoClick }) {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:10, flexWrap:"wrap" }}>
        <p style={{ fontSize:14, color:"#8E8E93" }}>
          Tes demandes de remboursement et leur statut.
        </p>
        <button
          className="btn btn-primary"
          style={{ padding:"9px 16px", fontSize:13 }}
          onClick={onNewPurchase}
          disabled={categories.length === 0}
          title={categories.length === 0 ? "Aucune catégorie disponible" : ""}
        >
          + Nouvelle demande
        </button>
      </div>

      {categories.length === 0 && (
        <div className="card" style={{ textAlign:"center", padding:24, marginBottom:12, background:"#FFF8E1", borderLeft:"4px solid #FF9500" }}>
          <p style={{ fontWeight:600, fontSize:14, color:"#B36200" }}>⚠️ Aucune catégorie configurée.</p>
          <p style={{ fontSize:12, color:"#8E8E93", marginTop:4 }}>Demande à un administrateur d'en créer avant de soumettre une demande.</p>
        </div>
      )}

      {purchases.length === 0 && categories.length > 0 && (
        <div className="card" style={{ textAlign:"center", padding:40 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🧾</div>
          <p style={{ fontWeight:600 }}>Aucune demande</p>
          <p style={{ fontSize:12, color:"#8E8E93", marginTop:4 }}>Clique sur « + Nouvelle demande » pour soumettre un remboursement.</p>
        </div>
      )}

      {purchases.map(p => (
        <div
          key={p.id}
          className="oc card"
          style={{
            marginBottom:12,
            borderLeft:`4px solid ${p.status==="approved"?"#34C759":p.status==="refused"?"#FF3B30":"#FF9500"}`,
          }}
        >
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center", flexWrap:"wrap" }}>
                <span className={`badge ${p.status==="approved"?"ba":p.status==="refused"?"br":"bw"}`}>
                  {p.status==="approved"?"✅ Approuvé":p.status==="refused"?"❌ Refusé":"⏳ En attente"}
                </span>
                {p.categoryLabel && (
                  <span style={{
                    fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
                    background:`${p.categoryColor||"#8E8E93"}18`,
                    color:p.categoryColor||"#8E8E93",
                    border:`1px solid ${p.categoryColor||"#8E8E93"}30`,
                  }}>
                    {p.categoryEmoji} {p.categoryLabel}
                  </span>
                )}
                {p.purchaseDate && (
                  <span style={{ fontSize:11, color:"#8E8E93" }}>
                    📅 {fmtDate(p.purchaseDate)}
                  </span>
                )}
              </div>
              <p style={{ fontWeight:700, fontSize:15, wordBreak:"break-word" }}>{p.description}</p>
              <p style={{ fontSize:22, fontWeight:800, margin:"4px 0" }}>{(Number(p.amount) || 0).toFixed(2)} $</p>
              {p.status === "refused" && p.refusedReason && (
                <p style={{ fontSize:12, color:"#FF3B30", marginTop:4 }}>Motif : {p.refusedReason}</p>
              )}
            </div>
            {p.photoUrl && (
              <button
                type="button"
                onClick={() => onPhotoClick?.(p.photoUrl)}
                style={{
                  flex:"0 0 auto", border:"none", padding:0, cursor:"pointer",
                  borderRadius:10, overflow:"hidden", background:"#F2F2F7",
                }}
                title="Voir la facture"
              >
                <img src={p.photoUrl} alt="Facture" style={{ width:72, height:72, objectFit:"cover", display:"block" }}/>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══ PURCHASES ADMIN VIEW ════════════════════════════════════════════════════
// Listing of purchase requests for admins / accountants.
// - Filters: status (pending/approved/refused/all), category, employee.
// - Visual category badge on each card.
// - Clickable receipt thumbnail → opens the lightbox viewer.
// - Actions: approve (pending), refuse-with-reason (pending), delete (any).
// - Header button to open the categories CRUD modal.
function PurchasesAdminView({
  purchases, users, categories,
  filter, setFilter,
  onApprove, onRefuseStart, onDelete, onPhotoClick, onManageCategories,
}) {
  // Compute the set of employees who ever submitted a purchase so the
  // employee filter stays useful even if the team changes over time.
  const empOptions = useMemo(() => {
    const seen = new Map();
    for (const p of purchases) {
      if (p.empId && !seen.has(p.empId)) {
        seen.set(p.empId, p.empName || users.find(u => u.id === p.empId)?.displayName || "—");
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [purchases, users]);

  // Filter purchases based on current filter state.
  const filtered = purchases.filter(p => {
    if (filter.status    !== "all" && p.status     !== filter.status)    return false;
    if (filter.categoryId!== "all" && p.categoryId !== filter.categoryId) return false;
    if (filter.empId     !== "all" && p.empId      !== filter.empId)      return false;
    return true;
  });

  // Totals shown in the stat row. Pending is always shown; the rest reflect
  // the currently filtered result set to help answer "how much did I just
  // approve this week?".
  const pendingCount  = purchases.filter(p => p.status === "pending").length;
  const approvedTotal = filtered.filter(p => p.status === "approved")
    .reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const refusedCount  = filtered.filter(p => p.status === "refused").length;

  const STATUS_FILTERS = [
    { v:"pending",  label:`⏳ En attente${pendingCount?` (${pendingCount})`:""}`, color:"#FF9500" },
    { v:"approved", label:"✅ Approuvées", color:"#34C759" },
    { v:"refused",  label:"❌ Refusées",   color:"#FF3B30" },
    { v:"all",      label:"Toutes",        color:"#6D6D72" },
  ];

  return (
    <div>
      {/* Header row: title, manage-categories button */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <p style={{ fontSize:14, color:"#8E8E93" }}>
          Approuve ou refuse les demandes de remboursement de l'équipe.
        </p>
        <button
          className="btn btn-outline"
          style={{ padding:"8px 14px", fontSize:13 }}
          onClick={onManageCategories}
        >
          🏷️ Gérer les catégories
        </button>
      </div>

      {/* Status toggles */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
        {STATUS_FILTERS.map(s => {
          const active = filter.status === s.v;
          return (
            <button
              key={s.v}
              type="button"
              onClick={() => setFilter(f => ({ ...f, status: s.v }))}
              style={{
                padding:"7px 14px", borderRadius:20,
                border:"1.5px solid",
                borderColor: active ? s.color : "#E5E5EA",
                background:  active ? `${s.color}18` : "white",
                color:       active ? s.color : "#3A3A3C",
                fontWeight: active ? 700 : 500,
                cursor:"pointer", fontFamily:"inherit", fontSize:13,
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Secondary filters: category + employee */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        <select
          value={filter.categoryId}
          onChange={e => setFilter(f => ({ ...f, categoryId: e.target.value }))}
          style={{ background:"white", border:"1px solid #E5E5EA", borderRadius:10, padding:"8px 12px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
        >
          <option value="all">🏷️ Toutes les catégories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
          ))}
        </select>

        <select
          value={filter.empId}
          onChange={e => setFilter(f => ({ ...f, empId: e.target.value }))}
          style={{ background:"white", border:"1px solid #E5E5EA", borderRadius:10, padding:"8px 12px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
        >
          <option value="all">👥 Tous les employés</option>
          {empOptions.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>

        {(filter.status !== "all" || filter.categoryId !== "all" || filter.empId !== "all") && (
          <button
            className="btn btn-outline"
            style={{ padding:"8px 12px", fontSize:12 }}
            onClick={() => setFilter({ status:"all", categoryId:"all", empId:"all" })}
          >
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* Summary strip for the current filter */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <div className="card" style={{ flex:1, minWidth:150, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:"#8E8E93" }}>Résultats</span>
          <span style={{ fontSize:18, fontWeight:700 }}>{filtered.length}</span>
        </div>
        <div className="card" style={{ flex:1, minWidth:150, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:"#8E8E93" }}>Total approuvé</span>
          <span style={{ fontSize:18, fontWeight:700, color:"#34C759" }}>{approvedTotal.toFixed(2)} $</span>
        </div>
        <div className="card" style={{ flex:1, minWidth:150, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:11, color:"#8E8E93" }}>Refusées</span>
          <span style={{ fontSize:18, fontWeight:700, color:"#FF3B30" }}>{refusedCount}</span>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="card" style={{ textAlign:"center", padding:48, color:"#8E8E93" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🧾</div>
          <p style={{ fontWeight:600 }}>Aucune demande</p>
          <p style={{ fontSize:12, marginTop:4 }}>Modifie les filtres pour voir plus de résultats.</p>
        </div>
      )}

      {/* Cards */}
      {filtered.map(p => {
        const catColor = p.categoryColor || "#8E8E93";
        const borderColor =
          p.status === "approved" ? "#34C759" :
          p.status === "refused"  ? "#FF3B30" : "#FF9500";
        const submittedMs = p.submittedAt?.toMillis ? p.submittedAt.toMillis() : p.submittedAt;

        return (
          <div key={p.id} className="oc card" style={{ marginBottom:12, borderLeft:`4px solid ${borderColor}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14, flexWrap:"wrap" }}>
              {/* Left column — text content */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center", flexWrap:"wrap" }}>
                  <span className={`badge ${p.status==="approved"?"ba":p.status==="refused"?"br":"bw"}`}>
                    {p.status==="approved"?"✅ Approuvé":p.status==="refused"?"❌ Refusé":"⏳ En attente"}
                  </span>
                  {p.categoryLabel && (
                    <span style={{
                      fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
                      background:`${catColor}18`, color:catColor,
                      border:`1px solid ${catColor}30`,
                    }}>
                      {p.categoryEmoji} {p.categoryLabel}
                    </span>
                  )}
                  <span style={{ fontSize:11, color:"#8E8E93" }}>
                    👤 {p.empName || "—"}
                  </span>
                  {p.purchaseDate && (
                    <span style={{ fontSize:11, color:"#8E8E93" }}>
                      · 📅 {fmtDate(p.purchaseDate)}
                    </span>
                  )}
                  {submittedMs && (
                    <span style={{ fontSize:11, color:"#C7C7CC" }}>
                      · soumis {fmtDate(submittedMs)}
                    </span>
                  )}
                </div>

                <p style={{ fontWeight:700, fontSize:15, wordBreak:"break-word" }}>{p.description}</p>
                <p style={{ fontSize:24, fontWeight:800, margin:"4px 0", color:"#1C1C1E" }}>
                  {(Number(p.amount) || 0).toFixed(2)} $
                </p>

                {p.status === "refused" && p.refusedReason && (
                  <p style={{ fontSize:12, color:"#FF3B30", marginTop:4 }}>
                    Motif : {p.refusedReason}
                  </p>
                )}
                {p.decidedByName && p.status !== "pending" && (
                  <p style={{ fontSize:11, color:"#8E8E93", marginTop:4 }}>
                    Par {p.decidedByName}
                  </p>
                )}
              </div>

              {/* Right column — receipt thumbnail */}
              {p.photoUrl ? (
                <button
                  type="button"
                  onClick={() => onPhotoClick?.(p.photoUrl)}
                  style={{
                    flex:"0 0 auto", border:"none", padding:0, cursor:"pointer",
                    borderRadius:10, overflow:"hidden", background:"#F2F2F7",
                  }}
                  title="Voir la facture en grand"
                >
                  <img
                    src={p.photoUrl}
                    alt="Facture"
                    style={{ width:96, height:96, objectFit:"cover", display:"block" }}
                  />
                </button>
              ) : (
                <div style={{
                  flex:"0 0 auto", width:96, height:96, borderRadius:10,
                  background:"#F9F9FB", border:"1px dashed #E5E5EA",
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  color:"#C7C7CC", fontSize:11, gap:4,
                }}>
                  <span style={{ fontSize:22 }}>🧾</span>
                  <span>Pas de photo</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap", justifyContent:"flex-end" }}>
              {p.status === "pending" && (
                <>
                  <button className="btn btn-green" style={{ padding:"8px 14px", fontSize:13 }} onClick={() => onApprove(p.id)}>
                    ✓ Approuver
                  </button>
                  <button className="btn btn-red" style={{ padding:"8px 14px", fontSize:13 }} onClick={() => onRefuseStart(p)}>
                    ✕ Refuser
                  </button>
                </>
              )}
              <button className="btn btn-soft-red" style={{ padding:"8px 12px", fontSize:12 }} onClick={() => onDelete(p)}>
                🗑️ Supprimer
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ ADMIN PAGE ══════════════════════════════════════════════════════════════
export function AdminPage({ db: fsData }) {
  const { userProfile, can } = useAuth();
  const {
    users, orders, stops, punches, purchases, events, categories,
    updateUser, deleteUser,
    addOrder, updateOrder, deleteOrder,
    addStop, updateStop, deleteStop,
    addPurchase,
    updatePurchase, approvePurchase: fsApprovePurchase, refusePurchase: fsRefusePurchase, deletePurchase,
    addCategory, updateCategory, deleteCategory,
    addEvent, updateEvent, deleteEvent,
  } = fsData;

  const { section, navigate, replace } = useRoute();
  const [toast,    setToast]    = useState(null);
  const [userModal,setUserModal]= useState(null); // null | "new" | user object
  const [orderModal, setOrderModal] = useState(null); // null | "new" | order object
  const [newStopModal,  setNewStopModal]  = useState(false);
  const [editStopModal, setEditStopModal] = useState(null);
  const [newStop,  setNewStop]  = useState({ type:"delivery", clientName:"", clientPhone:"", address:"", instructions:"", assignedTo:"", scheduledDate:null, order:0 });
  const [tourneeDate, setTourneeDate] = useState(() => {
    const d = new Date(); d.setHours(12,0,0,0); return d;
  });

  const getTourneeDateStr = () => {
    if (!tourneeDate || isNaN(tourneeDate.getTime())) return "";
    return tourneeDate.toISOString().split("T")[0];
  };
  const [dateRange, setDateRange]     = useState("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");
  const [refuseModal, setRefuseModal] = useState(null);
  const [refuseReason, setRefuseReason] = useState("");
  const [refusing, setRefusing] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [categoriesModal, setCategoriesModal] = useState(false);
  const [purchaseFilter, setPurchaseFilter] = useState({ status: "all", categoryId: "all", empId: "all" });
  const [deletePurchaseModal, setDeletePurchaseModal] = useState(null);
  const [newPurchaseModal, setNewPurchaseModal] = useState(false);
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const [newPurchase, setNewPurchase] = useState({
    description: "", amount: "", categoryId: "", photoFile: null,
    purchaseDate: todayStr(),
  });
  const [submittingPurchase, setSubmittingPurchase] = useState(false);

  const showToast = (m) => setToast(m);

  const employees = users.filter(u => u.jobs?.includes("employee"));
  const drivers   = users.filter(u => u.jobs?.includes("driver"));
  const adminActive = orders.filter(o => o.status !== "done");
  const adminDone   = orders.filter(o => o.status === "done");
  const pendingPurchases = purchases.filter(p => p.status === "pending").length;

  // Build tabs based on permissions
  const tabs = [];
  if (can("canManageEvents") || can("canViewEvents")) tabs.push(["evenements", `📅 Événements${events.filter(e => e.endDate >= Date.now()).length>0?` (${events.filter(e => e.endDate >= Date.now()).length})`:""}`]);
  if (can("canManageOrders"))                      tabs.push(["commandes", `📦 Commandes${adminActive.length>0?` (${adminActive.length})`:""}`]);
  if (can("canManageDeliveries"))                  tabs.push(["tournees",  "🚐 Tournées"]);
  if (can("canManageUsers"))                       tabs.push(["equipe",    "👥 Équipe"]);
  if (can("canSubmitPurchases"))                   tabs.push(["mes-achats", `🧾 Mes achats`]);
  if (can("canManagePurchases"))                   tabs.push(["achats",    `📋 Gestion des achats${pendingPurchases>0?` (${pendingPurchases})`:""}`]);
  if (can("canViewReports"))                       tabs.push(["feuilles-de-temps",  "⏱️ Feuilles de temps"]);
  tabs.push(["parametres", "⚙️ Paramètres"]);

  // Active tab is taken from the URL. Fall back to the first permitted tab
  // if the URL section is empty or not in the list.
  const tabIds = tabs.map(([id]) => id);
  const tab = tabIds.includes(section) ? section : (tabIds[0] || "");
  useEffect(() => {
    if (tabIds.length > 0 && !tabIds.includes(section)) {
      replace(tabIds[0]);
    }
  }, [section, tabIds.join("|")]);// eslint-disable-line
  const setTab = (id) => navigate(id);

  const handleSaveUser = async (updated) => {
    await updateUser(updated);
    showToast("Utilisateur mis à jour");
  };
  const handleDeleteUser = async (id) => {
    if (!window.confirm("Supprimer ce compte? (Le compte Firebase Auth reste actif mais son profil est effacé)")) return;
    try { await deleteUser(id); showToast("Utilisateur supprimé"); setUserModal(null); }
    catch(e) { showToast("Erreur: "+e.message); }
  };

  // Unified create + edit handler used by OrderModal.
  const handleSaveOrder = async (form) => {
    try {
      if (form.id) {
        // Strip non-stored fields and persist the rest.
        const { id, ...data } = form;
        await updateOrder(id, data);
        showToast("Commande mise à jour !");
      } else {
        await addOrder({
          clientName:  form.clientName,
          clientEmail: form.clientEmail || "",
          description: form.description || "",
          assignedTo:  form.assignedTo,
          status:      "pending",
          startTime:   null,
          endTime:     null,
          elapsed:     0,
          deadline:    form.deadline || (Date.now() + 5 * DAY),
          createdBy:   userProfile?.id || null,
        });
        showToast("Commande créée !");
      }
      setOrderModal(null);
    } catch (e) {
      showToast("Erreur: " + e.message);
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm("Supprimer cette commande ?")) return;
    try {
      await deleteOrder(id);
      showToast("Commande supprimée");
      setOrderModal(null);
    } catch(e) { showToast("Erreur: "+e.message); }
  };

  const reassignOrder = async (oid, newEmp) => {
    await updateOrder(oid, { assignedTo: newEmp });
    showToast("Assigné !");
  };

  const handleAddStop = async () => {
    if (!newStop.clientName || !newStop.address || !newStop.assignedTo) return;
    const driverStops = stops.filter(s => s.assignedTo === newStop.assignedTo && s.status !== "completed");
    const maxOrder = driverStops.length > 0 ? Math.max(...driverStops.map(s => s.order || 0)) : 0;
    await addStop({ 
      ...newStop, 
      status:"pending", 
      completedAt:null, 
      photoUrl:null, 
      signatureUrl:null, 
      note:"", 
      orderId:null,
      scheduledDate: tourneeDate,
      order: maxOrder + 1
    });
    setNewStop({ type:"delivery", clientName:"", clientPhone:"", address:"", instructions:"", assignedTo:"", scheduledDate:null, order:0 });
    setNewStopModal(false);
    showToast("Arrêt ajouté !");
  };

  const handleDeleteStop = async (id) => {
    if (!window.confirm("Supprimer cet arrêt ?")) return;
    try { await deleteStop(id); showToast("Arrêt supprimé"); }
    catch(e) { showToast("Erreur: "+e.message); }
  };

  const handleMoveStop = async (stopId, direction, dateKey) => {
    const stop = stops.find(s => s.id === stopId);
    if (!stop || !stop.scheduledDate) return;
    
    const dateStr = stop.scheduledDate.toDate ? stop.scheduledDate.toDate().toDateString() : new Date(stop.scheduledDate).toDateString();
    const driverStops = stops.filter(s => s.assignedTo === stop.assignedTo && s.scheduledDate && (s.scheduledDate.toDate ? s.scheduledDate.toDate().toDateString() : new Date(s.scheduledDate).toDateString()) === dateStr);
    const sorted = [...driverStops].sort((a,b) => (a.order||0) - (b.order||0));
    const idx = sorted.findIndex(s => s.id === stopId);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const swapped = sorted[newIdx];
    const orderA = sorted[idx].order ?? (idx + 1);
    const orderB = swapped.order ?? (newIdx + 1);
    await updateStop(stopId, { order: orderB });
    await updateStop(swapped.id, { order: orderA });
  };

  const handleEditStop = async () => {
    if (!editStopModal.clientName || !editStopModal.address) return;
    await updateStop(editStopModal.id, {
      clientName: editStopModal.clientName,
      clientPhone: editStopModal.clientPhone,
      address: editStopModal.address,
      instructions: editStopModal.instructions,
      type: editStopModal.type,
      assignedTo: editStopModal.assignedTo,
      scheduledDate: editStopModal.scheduledDate
    });
    setEditStopModal(null);
    showToast("Arrêt modifié !");
  };

  const approvePurchase = async (id) => {
    try {
      await fsApprovePurchase(id, userProfile?.id || null, userProfile?.displayName || null);
      showToast("Approuvé");
    } catch (e) {
      showToast("Erreur : " + e.message);
    }
  };
  const refusePurchase = async () => {
    if (!refuseReason.trim() || refusing) return;
    setRefusing(true);
    try {
      await fsRefusePurchase(refuseModal.id, refuseReason.trim(), userProfile?.id || null, userProfile?.displayName || null);
      setRefuseModal(null);
      setRefuseReason("");
      showToast("Refusé");
    } catch (e) {
      showToast("Erreur : " + e.message);
    } finally {
      setRefusing(false);
    }
  };
  const handleDeletePurchase = async (p) => {
    try {
      await deletePurchase(p.id, p.photoPath);
      setDeletePurchaseModal(null);
      showToast("Demande supprimée");
    } catch (e) {
      showToast("Erreur : " + e.message);
    }
  };

  const submitPurchase = async () => {
    if (!newPurchase.description.trim() || !newPurchase.amount) {
      showToast("Description et montant requis");
      return;
    }
    if (!newPurchase.categoryId) {
      showToast("Choisis une catégorie");
      return;
    }
    if (!newPurchase.purchaseDate) {
      showToast("Choisis une date");
      return;
    }
    const cat = categories.find(c => c.id === newPurchase.categoryId);
    // Parse YYYY-MM-DD as local noon to avoid timezone day-shift surprises.
    const [yy, mm, dd] = newPurchase.purchaseDate.split("-").map(Number);
    const purchaseDateMs = new Date(yy, (mm || 1) - 1, dd || 1, 12, 0, 0, 0).getTime();
    setSubmittingPurchase(true);
    try {
      await addPurchase({
        empId: userProfile.id,
        empName: userProfile.displayName,
        description: newPurchase.description.trim(),
        amount: parseFloat(newPurchase.amount) || 0,
        categoryId: newPurchase.categoryId,
        categoryLabel: cat?.label || "",
        categoryEmoji: cat?.emoji || "",
        categoryColor: cat?.color || "#8E8E93",
        status: "pending",
        photoUrl: null,
        photoPath: null,
        approvedAt: null,
        refusedAt: null,
        refusedReason: "",
        decidedBy: null,
        decidedByName: null,
        purchaseDate: purchaseDateMs,
      }, newPurchase.photoFile);
      setNewPurchase({
        description: "", amount: "", categoryId: "", photoFile: null,
        purchaseDate: todayStr(),
      });
      setNewPurchaseModal(false);
      showToast("Demande envoyée !");
    } catch (err) {
      console.error(err);
      showToast("Erreur d'envoi. Réessaie.");
    } finally {
      setSubmittingPurchase(false);
    }
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange(dateRange, customStart, customEnd);

  return (
    <div className="app-shell">
      <Sidebar
        tabs={tabs}
        active={tab}
        onNavigate={setTab}
        subtitle="Administration"
        badge={pendingPurchases > 0 && can("canManagePurchases") && (
          <div style={{ background:"#FF3B30", color:"white", borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:700 }}>
            {pendingPurchases} demande{pendingPurchases>1?"s":""} en attente
          </div>
        )}
      />

      <div className="app-shell-content">
        {/* Stat strip */}
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          {[
            { label:"Événements", val:events.filter(e => e.endDate >= Date.now()).length, c:"#007AFF" },
            { label:"En cours",   val:orders.filter(o => o.status==="inprogress").length, c:"#FF9500" },
            { label:"Terminées",  val:adminDone.length, c:"#34C759" },
            { label:"Livraisons", val:stops.filter(s => s.status==="pending").length, c:"#AF52DE" },
            { label:"En retard",  val:orders.filter(o => o.status!=="done" && o.deadline && o.deadline < Date.now()).length, c:"#FF3B30" },
            { label:"Utilisateurs", val:users.length, c:"#6D6D72" },
          ].map(s => (
            <div key={s.label} className="card" style={{ flex:1, minWidth:120, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#8E8E93" }}>{s.label}</span>
              <span style={{ fontSize:20, fontWeight:700, color:s.c }}>{s.val}</span>
            </div>
          ))}
        </div>

        {/* Section-level actions */}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          {tab === "equipe" && can("canManageUsers") && <button className="btn btn-outline" onClick={() => setUserModal("new")}>+ Utilisateur</button>}
          {tab === "commandes" && can("canManageOrders") && <button className="btn btn-primary" onClick={() => setOrderModal("new")}>+ Commande</button>}
          {tab === "tournees" && can("canManageDeliveries") && drivers.length > 0 && <button className="btn btn-purple" onClick={() => { setNewStop(n => ({...n, assignedTo: drivers[0]?.id || ""})); setNewStopModal(true); }}>+ Arrêt</button>}
        </div>

        {/* ─── ÉVÉNEMENTS ─── */}
        {tab === "evenements" && (
          <EventsPage events={events} users={users} addEvent={addEvent} updateEvent={updateEvent} deleteEvent={deleteEvent} showToast={showToast}/>
        )}

        {/* ─── COMMANDES ─── */}
        {tab === "commandes" && can("canManageOrders") && (
          <div>
            {adminActive.length === 0 && (
              <div className="card" style={{ textAlign:"center", padding:48, color:"#8E8E93" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
                <p style={{ fontWeight:600 }}>Aucune commande active</p>
              </div>
            )}
            {[...adminActive].sort((a,b) => (a.deadline||9e15)-(b.deadline||9e15)).map(order => {
              const emp = users.find(u => u.id === order.assignedTo);
              const dl = getDL(order.deadline);
              const days = daysUntil(order.deadline);
              return (
                <div
                  key={order.id}
                  className="oc card"
                  onClick={() => setOrderModal(order)}
                  style={{
                    marginBottom:12,
                    borderTop:`3px solid ${dl.color}`,
                    cursor:"pointer",
                    transition:"box-shadow .15s, transform .15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; }}
                >
                  <div style={{ display:"flex", justifyContent:"space-between", gap:16, flexWrap:"wrap", alignItems:"center" }}>
                    <div style={{ flex:1, minWidth:200 }}>
                      <div style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center", flexWrap:"wrap" }}>
                        <span className={`badge ${order.status==="inprogress"?"bi":"bp"}`}>{order.status==="inprogress"?"⚡ En cours":"En attente"}</span>
                        {dl.overdue && <span style={{ fontSize:11, color:"#FF3B30", fontWeight:700 }}>⚠️ En retard</span>}
                      </div>
                      <p style={{ fontWeight:700, fontSize:15 }}>{order.clientName}<span style={{ fontWeight:400, fontSize:13, color:"#8E8E93", marginLeft:8 }}>{order.clientEmail}</span></p>
                      <p style={{ fontSize:13, color:"#6D6D72", marginTop:2 }}>{order.description}</p>
                    </div>

                    {/* Quick-reassign select (stops propagation so it doesn't open the modal) */}
                    <div
                      style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <select value={order.assignedTo} onChange={e => reassignOrder(order.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={{ background:"#F2F2F7", border:"none", borderRadius:8, padding:"5px 10px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", outline:"none" }}>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.displayName}</option>)}
                      </select>
                    </div>

                    {/* Days-left badge — same visual as the events list */}
                    <div style={{ textAlign:"center", flexShrink:0 }}>
                      <div style={{
                        fontSize:32, fontWeight:800, color:"white", lineHeight:1,
                        background: dl.color, borderRadius:12,
                        padding:"6px 14px", minWidth:60, textAlign:"center",
                      }}>
                        {dl.overdue ? Math.abs(days) : Math.max(0, days)}
                      </div>
                      <div style={{ fontSize:11, color:"#8E8E93", marginTop:4, textAlign:"center" }}>
                        {dl.overdue
                          ? (Math.abs(days) === 1 ? "jour de retard" : "jours de retard")
                          : (days === 0 ? "aujourd'hui" : days === 1 ? "jour" : "jours")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {adminDone.length > 0 && (
              <div style={{ marginTop:24 }}>
                <p className="sec">Historique ({adminDone.length})</p>
                {adminDone.slice(0,20).map(o => (
                  <div
                    key={o.id}
                    className="card"
                    onClick={() => setOrderModal(o)}
                    style={{
                      marginBottom:10, opacity:.75,
                      borderLeft:"3px solid #34C759",
                      cursor:"pointer", transition:"opacity .15s, box-shadow .15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = .75; e.currentTarget.style.boxShadow = ""; }}
                  >
                    <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10, alignItems:"center" }}>
                      <div>
                        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                          <span className="badge bd">✓ Terminé</span>
                        </div>
                        <p style={{ fontWeight:600, fontSize:14 }}>{o.clientName}<span style={{ fontWeight:400, color:"#8E8E93", fontSize:13 }}> — {o.description}</span></p>
                      </div>
                      <span style={{ fontFamily:"monospace", fontSize:12, color:"#FF6B35" }}>⏱ {fmtMs(o.elapsed)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── GESTION DES ROUTES ─── */}
        {tab === "tournees" && can("canManageDeliveries") && (
          <GestionRoutesSection
            stops={stops}
            drivers={drivers}
            addStop={addStop}
            updateStop={updateStop}
            deleteStop={deleteStop}
            showToast={showToast}
          />
        )}

        {/* ─── ÉQUIPE ─── */}
        {tab === "equipe" && can("canManageUsers") && (
          <div>
            <p style={{ fontSize:13, color:"#8E8E93", marginBottom:16 }}>Gérer les comptes, permissions et fonctions.</p>
            {users.map(u => {
              const isMe = u.id === userProfile.id;
              return (
                <div key={u.id} className="card" style={{ marginBottom:10, borderLeft:`4px solid ${u.color}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:14, background:u.color+"18", color:u.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, flexShrink:0 }}>{u.displayName?.[0]}</div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15 }}>
                          {u.displayName}
                          {isMe && <span style={{ fontSize:11, color:"#34C759", marginLeft:6, fontWeight:600 }}>(vous)</span>}
                        </div>
                        <div style={{ fontSize:12, color:"#8E8E93" }}>{u.email}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4, flexWrap:"wrap" }}>
                          {u.role === "admin" && <span className="badge bv">⚙️ Admin</span>}
                          {(u.jobs || []).map(j => (
                            <span key={j} className="badge bp" style={{ textTransform:"capitalize" }}>{j === "employee" ? "Employé" : j === "driver" ? "Livreur" : j === "accountant" ? "Comptable" : j}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button className="btn btn-outline" style={{ fontSize:13, padding:"8px 16px" }} onClick={() => setUserModal(u)}>Modifier</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── MES DEMANDES D'ACHAT ─── */}
        {tab === "mes-achats" && can("canSubmitPurchases") && (
          <PurchasesSubmitView
            purchases={purchases.filter(p => p.empId === userProfile.id)}
            categories={categories}
            onNewPurchase={() => {
              setNewPurchase({
                description: "", amount: "", categoryId: "", photoFile: null,
                purchaseDate: todayStr(),
              });
              setNewPurchaseModal(true);
            }}
            onPhotoClick={(url) => setLightboxUrl(url)}
          />
        )}

        {/* ─── GESTION DES ACHATS ─── */}
        {tab === "achats" && can("canManagePurchases") && (
          <PurchasesAdminView
            purchases={purchases}
            users={users}
            categories={categories}
            filter={purchaseFilter}
            setFilter={setPurchaseFilter}
            onApprove={approvePurchase}
            onRefuseStart={(p) => { setRefuseModal(p); setRefuseReason(""); }}
            onDelete={(p) => setDeletePurchaseModal(p)}
            onPhotoClick={(url) => setLightboxUrl(url)}
            onManageCategories={() => setCategoriesModal(true)}
          />
        )}

        {/* ─── FEUILLES DE TEMPS ─── */}
        {tab === "feuilles-de-temps" && can("canViewReports") && (
          <div>
            <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
              <select value={dateRange} onChange={e => setDateRange(e.target.value)}
                style={{ background:"white", border:"1px solid #E5E5EA", borderRadius:10, padding:"8px 12px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                <option value="week">Cette semaine</option>
                <option value="lastWeek">Semaine passée</option>
                <option value="month">Ce mois</option>
                <option value="custom">Personnalisé</option>
              </select>
              {dateRange === "custom" && (
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ background:"white", border:"1px solid #E5E5EA", borderRadius:10, padding:"8px 12px", fontSize:13, fontFamily:"inherit" }}/>
                  <span style={{ color:"#8E8E93" }}>à</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ background:"white", border:"1px solid #E5E5EA", borderRadius:10, padding:"8px 12px", fontSize:13, fontFamily:"inherit" }}/>
                </div>
              )}
            </div>

            {users.filter(u => u.permissions?.canClockIn).map(u => {
              const eps    = punches[u.id] || [];
              const rangeMs = eps.filter(p => p.punchIn >= rangeStart && p.punchIn <= rangeEnd && p.punchOut).reduce((a,p) => a + (p.punchOut - p.punchIn), 0);
              const active = eps.some(s => dayStart(s.punchIn) === dayStart(Date.now()) && !s.punchOut);
              const days   = groupByDay(eps.filter(p => p.punchIn >= rangeStart && p.punchIn <= rangeEnd));

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
                          <div key={s.id} style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6D6D72", padding:"1px 0" }}>
                            <span>Session {i+1} : {fmtTime(s.punchIn)} → {s.punchOut?fmtTime(s.punchOut):"en cours"}{s.note && <span style={{ color:"#FF9500", marginLeft:4 }}>✏️ {s.note}</span>}</span>
                            {s.punchOut && <span style={{ fontFamily:"monospace", fontWeight:600 }}>{fmtHours(s.punchOut - s.punchIn)}</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── PARAMÈTRES ─── */}
        {tab === "parametres" && <SettingsPage showToast={showToast}/>}
      </div>

      {/* Modals */}
      {userModal && (
        <UserModal
          user={userModal === "new" ? null : userModal}
          onSave={handleSaveUser}
          onDelete={handleDeleteUser}
          onClose={() => setUserModal(null)}
          currentUserId={userProfile.id}
          showToast={showToast}
        />
      )}

      {orderModal && (
        <OrderModal
          order={orderModal === "new" ? null : orderModal}
          employees={employees}
          users={users}
          onSave={handleSaveOrder}
          onDelete={handleDeleteOrder}
          onClose={() => setOrderModal(null)}
        />
      )}

      {newStopModal && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setNewStopModal(false)}>
          <div className="sheet">
            <div className="handle"/>
            <h3 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>📍 Ajouter un arrêt</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label className="lbl">Type</label>
                <div style={{ display:"flex", gap:10 }}>
                  {[["delivery","📦 Livraison"],["pickup","📤 Ramassage"]].map(([v,l]) => (
                    <button key={v} onClick={() => setNewStop(n => ({...n,type:v}))} className="btn"
                      style={{ flex:1, justifyContent:"center", background:newStop.type===v?"#111":"white", color:newStop.type===v?"white":"#3A3A3C", border:"1.5px solid", borderColor:newStop.type===v?"#111":"#E5E5EA" }}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="lbl">Livreur</label>
                <select className="sel" value={newStop.assignedTo} onChange={e => setNewStop(n => ({...n,assignedTo:e.target.value}))}>
                  <option value="">— Choisir —</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.displayName}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Date</label>
                <input 
                  type="date" 
                  className="inp"
                  value={getTourneeDateStr()}
                  onChange={e => e.target.value ? setTourneeDate(new Date(e.target.value + "T12:00:00")) : setTourneeDate(new Date())}
                />
              </div>
              <div><label className="lbl">Client</label><input className="inp" placeholder="Sophie Tremblay" value={newStop.clientName} onChange={e => setNewStop(n => ({...n,clientName:e.target.value}))}/></div>
              <div><label className="lbl">Téléphone</label><input className="inp" type="tel" placeholder="514-555-0101" value={newStop.clientPhone} onChange={e => setNewStop(n => ({...n,clientPhone:e.target.value}))}/></div>
              <div><label className="lbl">Adresse</label><input className="inp" placeholder="1234 rue Ste-Catherine" value={newStop.address} onChange={e => setNewStop(n => ({...n,address:e.target.value}))}/></div>
              <div><label className="lbl">Instructions</label><input className="inp" placeholder="Sonner 2 fois…" value={newStop.instructions} onChange={e => setNewStop(n => ({...n,instructions:e.target.value}))}/></div>
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={() => setNewStopModal(false)}>Annuler</button>
                <button className="btn btn-purple" style={{ flex:2, justifyContent:"center" }} onClick={handleAddStop}>Ajouter</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editStopModal && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setEditStopModal(null)}>
          <div className="sheet">
            <div className="handle"/>
            <h3 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>✏️ Modifier l'arrêt</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label className="lbl">Type</label>
                <div style={{ display:"flex", gap:10 }}>
                  {[["delivery","📦 Livraison"],["pickup","📤 Ramassage"]].map(([v,l]) => (
                    <button key={v} onClick={() => setEditStopModal(n => ({...n,type:v}))} className="btn"
                      style={{ flex:1, justifyContent:"center", background:editStopModal.type===v?"#111":"white", color:editStopModal.type===v?"white":"#3A3A3C", border:"1.5px solid", borderColor:editStopModal.type===v?"#111":"#E5E5EA" }}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="lbl">Livreur</label>
                <select className="sel" value={editStopModal.assignedTo} onChange={e => setEditStopModal(n => ({...n,assignedTo:e.target.value}))}>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.displayName}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Date</label>
                <input 
                  type="date" 
                  className="inp"
                  value={editStopModal.scheduledDate ? (editStopModal.scheduledDate.toDate ? editStopModal.scheduledDate.toDate().toISOString().split("T")[0] : new Date(editStopModal.scheduledDate).toISOString().split("T")[0]) : ""}
                  onChange={e => setEditStopModal(n => ({...n, scheduledDate: e.target.value ? new Date(e.target.value + "T12:00:00") : null}))}
                />
              </div>
              <div><label className="lbl">Client</label><input className="inp" placeholder="Sophie Tremblay" value={editStopModal.clientName} onChange={e => setEditStopModal(n => ({...n,clientName:e.target.value}))}/></div>
              <div><label className="lbl">Téléphone</label><input className="inp" type="tel" placeholder="514-555-0101" value={editStopModal.clientPhone || ""} onChange={e => setEditStopModal(n => ({...n,clientPhone:e.target.value}))}/></div>
              <div><label className="lbl">Adresse</label><input className="inp" placeholder="1234 rue Ste-Catherine" value={editStopModal.address} onChange={e => setEditStopModal(n => ({...n,address:e.target.value}))}/></div>
              <div><label className="lbl">Instructions</label><input className="inp" placeholder="Sonner 2 fois…" value={editStopModal.instructions || ""} onChange={e => setEditStopModal(n => ({...n,instructions:e.target.value}))}/></div>
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={() => setEditStopModal(null)}>Annuler</button>
                <button className="btn btn-purple" style={{ flex:2, justifyContent:"center" }} onClick={handleEditStop}>Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={!!refuseModal}
        onClose={() => !refusing && (setRefuseModal(null), setRefuseReason(""))}
        title="❌ Refuser la demande"
        maxWidth={460}
      >
        {refuseModal && (
          <>
            <p style={{ fontSize:13, color:"#8E8E93", marginBottom:16 }}>
              {refuseModal.empName} — <strong>{refuseModal.amount?.toFixed(2)} $</strong>
              {refuseModal.categoryLabel && <> · {refuseModal.categoryEmoji} {refuseModal.categoryLabel}</>}
            </p>
            <label className="lbl">Raison (obligatoire)</label>
            <textarea
              className="inp"
              rows={3}
              placeholder="Ex: Facture illisible, montant incorrect…"
              value={refuseReason}
              onChange={e => setRefuseReason(e.target.value)}
              style={{ resize:"none" }}
              disabled={refusing}
            />
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button
                className="btn btn-outline"
                style={{ flex:1, justifyContent:"center" }}
                onClick={() => { setRefuseModal(null); setRefuseReason(""); }}
                disabled={refusing}
              >
                Annuler
              </button>
              <button
                className="btn btn-red"
                style={{ flex:2, justifyContent:"center", opacity: refuseReason.trim() ? 1 : .5 }}
                onClick={refusePurchase}
                disabled={!refuseReason.trim() || refusing}
              >
                {refusing ? <><span className="sp"/> …</> : "Confirmer le refus"}
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!deletePurchaseModal}
        onClose={() => setDeletePurchaseModal(null)}
        title="Supprimer cette demande ?"
        maxWidth={420}
      >
        {deletePurchaseModal && (
          <>
            <p style={{ fontSize:14, marginBottom:10 }}>
              <strong>{deletePurchaseModal.description}</strong>
            </p>
            <p style={{ fontSize:13, color:"#8E8E93", marginBottom:16 }}>
              {deletePurchaseModal.empName} — {deletePurchaseModal.amount?.toFixed(2)} $
            </p>
            <p style={{ fontSize:12, color:"#FF3B30", marginBottom:16 }}>
              ⚠️ Action irréversible. La pièce jointe sera aussi supprimée.
            </p>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={() => setDeletePurchaseModal(null)}>Annuler</button>
              <button className="btn btn-soft-red" style={{ flex:1, justifyContent:"center" }} onClick={() => handleDeletePurchase(deletePurchaseModal)}>Supprimer</button>
            </div>
          </>
        )}
      </Modal>

      <CategoriesManager
        open={categoriesModal}
        onClose={() => setCategoriesModal(false)}
        categories={categories}
        addCategory={addCategory}
        updateCategory={updateCategory}
        deleteCategory={deleteCategory}
        showToast={showToast}
      />

      {/* Modal nouvelle demande d'achat */}
      <Modal
        open={newPurchaseModal}
        onClose={() => !submittingPurchase && setNewPurchaseModal(false)}
        title="🧾 Nouvelle demande"
      >
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label className="lbl">Description *</label>
            <input
              className="inp"
              placeholder="Encre sérigraphie noire 5L"
              value={newPurchase.description}
              onChange={e => setNewPurchase(n => ({ ...n, description: e.target.value }))}
              disabled={submittingPurchase}
            />
          </div>

          <div>
            <label className="lbl">Montant ($) *</label>
            <input
              className="inp"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              value={newPurchase.amount}
              onChange={e => setNewPurchase(n => ({ ...n, amount: e.target.value }))}
              disabled={submittingPurchase}
            />
          </div>

          <div>
            <label className="lbl">Catégorie *</label>
            {categories.length === 0 ? (
              <p style={{ fontSize:12, color:"#FF9500" }}>Aucune catégorie disponible.</p>
            ) : (
              <select
                className="sel"
                value={newPurchase.categoryId}
                onChange={e => setNewPurchase(n => ({ ...n, categoryId: e.target.value }))}
                disabled={submittingPurchase}
              >
                <option value="">— Choisir —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="lbl">Date de la dépense *</label>
            <input
              className="inp"
              type="date"
              value={newPurchase.purchaseDate}
              onChange={e => setNewPurchase(n => ({ ...n, purchaseDate: e.target.value }))}
              disabled={submittingPurchase}
            />
          </div>

          <div>
            <label className="lbl">Preuve d'achat (facture)</label>
            <PhotoUpload
              value={newPurchase.photoFile}
              onChange={(file) => setNewPurchase(n => ({ ...n, photoFile: file }))}
              label="📸 Photographier ou joindre la facture"
            />
            <p style={{ fontSize:11, color:"#8E8E93", marginTop:-4 }}>
              Optionnel mais recommandé pour accélérer l'approbation.
            </p>
          </div>

          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button
              className="btn btn-outline"
              style={{ flex:1, justifyContent:"center" }}
              onClick={() => setNewPurchaseModal(false)}
              disabled={submittingPurchase}
            >
              Annuler
            </button>
            <button
              className="btn btn-primary"
              style={{ flex:2, justifyContent:"center" }}
              onClick={submitPurchase}
              disabled={submittingPurchase}
            >
              {submittingPurchase ? <><span className="sp"/> Envoi…</> : "Envoyer"}
            </button>
          </div>
        </div>
      </Modal>

      <PhotoLightbox url={lightboxUrl} alt="Facture" onClose={() => setLightboxUrl(null)}/>

      {toast && <Toast message={toast} onDone={() => setToast(null)}/>}
    </div>
  );
}
