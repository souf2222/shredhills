// src/dashboard/modals/UserModal.jsx
import { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { createAuthUserKeepingSession, sendPasswordReset } from "../../firebase";
import { PERMISSION_LABELS, JOB_OPTIONS, COLORS } from "../constants";

export function UserModal({ user, onSave, onDelete, onClose, currentUserId, showToast }) {
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

  const handleSendPasswordReset = async () => {
    if (!user?.email) { showToast("Adresse courriel manquante."); return; }
    setResettingPwd(true);
    try {
      await sendPasswordReset(user.email);
      showToast(`✉️ Courriel envoyé à ${user.email}`);
    } catch (e) {
      const msgs = {
        "auth/user-not-found": "Aucun compte trouvé pour ce courriel.",
        "auth/invalid-email": "Courriel invalide.",
        "auth/too-many-requests": "Trop de tentatives. Réessayez plus tard.",
        "auth/network-request-failed": "Erreur réseau.",
      };
      showToast(msgs[e.code] || "Erreur : " + (e.message || "inconnue"));
    } finally { setResettingPwd(false); }
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
    if (!form.email || !form.displayName) { showToast("Email et nom requis"); return; }
    if (isNew && (!form.password || form.password.length < 6)) { showToast("Mot de passe min. 6 caractères"); return; }
    setSaving(true);
    try {
      if (isNew) {
        const { uid } = await createAuthUserKeepingSession(form.email.trim(), form.password, form.displayName);
        await setDoc(doc(db, "users", uid), {
          email: form.email.trim(), displayName: form.displayName, role: form.role,
          jobs: form.jobs || [], permissions: form.permissions, color: form.color,
          pin: form.pin || "", createdAt: serverTimestamp(),
        });
        showToast("✅ Utilisateur créé.");
      } else {
        await onSave({
          id: user.id, displayName: form.displayName, role: form.role,
          jobs: form.jobs || [], permissions: form.permissions, color: form.color, pin: form.pin || "",
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
    } finally { setSaving(false); }
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

          <div>
            <label className="lbl">Couleur</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => set("color", c)}
                  style={{ width:30, height:30, borderRadius:"50%", background:c, cursor:"pointer", border: form.color === c ? "3px solid #1C1C1E" : "3px solid transparent" }}/>
              ))}
            </div>
          </div>

          <div>
            <label className="lbl">NIP (optionnel, 4 chiffres)</label>
            <input className="inp" type="text" maxLength={4} placeholder="----" value={form.pin || ""} onChange={e => set("pin", e.target.value.replace(/\D/g,"").slice(0,4))} style={{ letterSpacing:"6px", textAlign:"center" }}/>
          </div>

          {!isNew && user?.email && (
            <div style={{ background:"#F9F9FB", border:"1px solid #EEF0F3", borderRadius:12, padding:"14px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1C1C1E" }}>🔒 Mot de passe</div>
                  <div style={{ fontSize:12, color:"#8E8E93", marginTop:2, lineHeight:1.4 }}>Envoie un courriel sécurisé à l'utilisateur pour qu'il choisisse un nouveau mot de passe.</div>
                </div>
                <button type="button" className="btn btn-outline" style={{ padding:"9px 14px", fontSize:13, whiteSpace:"nowrap" }} onClick={handleSendPasswordReset} disabled={resettingPwd || saving}>
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
