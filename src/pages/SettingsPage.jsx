// src/pages/SettingsPage.jsx
// User settings: profile info (read-only) + password change.
// Firebase requires recent re-authentication for password updates,
// so the form asks for the current password and re-auths before updating.

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { reauthenticate, changePassword } from "../firebase";

// Defined outside the parent component so React doesn't unmount the <input>
// on every keystroke (which would steal focus and break controlled typing).
function PwdField({ label, value, onChange, show, setShow, autoComplete, hint }) {
  return (
    <div>
      <label className="lbl">{label}</label>
      <div style={{ position:"relative" }}>
        <input
          className="inp"
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          style={{ paddingRight: 76 }}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          aria-label={show ? "Cacher le mot de passe" : "Afficher le mot de passe"}
          style={{
            position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
            background:"none", border:"none", cursor:"pointer",
            color:"#8E8E93", fontSize:13, fontWeight:600, padding:"6px 8px",
            fontFamily:"inherit"
          }}
        >
          {show ? "Cacher" : "Afficher"}
        </button>
      </div>
      {hint && <div style={{ fontSize:12, color:"#8E8E93", marginTop:6 }}>{hint}</div>}
    </div>
  );
}

export function SettingsPage({ showToast }) {
  const { userProfile, firebaseUser } = useAuth();

  const [currentPwd,  setCurrentPwd]  = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState(false);

  const reset = () => {
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setShowCurrent(false); setShowNew(false);
  };

  // Map Firebase auth error codes to friendly French messages.
  const friendlyError = (err) => {
    const code = err?.code || "";
    if (code === "auth/wrong-password" || code === "auth/invalid-credential")
      return "Mot de passe actuel incorrect.";
    if (code === "auth/weak-password")
      return "Mot de passe trop faible (minimum 6 caractères).";
    if (code === "auth/too-many-requests")
      return "Trop de tentatives. Réessayez dans quelques minutes.";
    if (code === "auth/requires-recent-login")
      return "Reconnexion requise. Déconnectez-vous puis reconnectez-vous.";
    if (code === "auth/network-request-failed")
      return "Erreur réseau. Vérifiez votre connexion.";
    return err?.message || "Une erreur est survenue.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(false);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setError("Tous les champs sont requis.");
      return;
    }
    if (newPwd.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (newPwd === currentPwd) {
      setError("Le nouveau mot de passe doit être différent de l'actuel.");
      return;
    }

    setSubmitting(true);
    try {
      await reauthenticate(currentPwd);
      await changePassword(newPwd);
      reset();
      setSuccess(true);
      showToast?.("✅ Mot de passe mis à jour");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Simple visual strength meter for the new password (length + character classes).
  const strength = (() => {
    if (!newPwd) return { score: 0, label: "", color: "#E5E5EA" };
    let s = 0;
    if (newPwd.length >= 6)  s++;
    if (newPwd.length >= 10) s++;
    if (/[A-Z]/.test(newPwd) && /[a-z]/.test(newPwd)) s++;
    if (/\d/.test(newPwd))   s++;
    if (/[^A-Za-z0-9]/.test(newPwd)) s++;
    if (s <= 1) return { score: 1, label: "Faible",   color: "#FF3B30" };
    if (s <= 3) return { score: 3, label: "Moyen",    color: "#FF9500" };
    return         { score: 5, label: "Fort",     color: "#34C759" };
  })();

  const initials = (userProfile?.displayName || "?")
    .split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>⚙️ Paramètres</h2>
        <p style={{ fontSize:14, color:"#8E8E93" }}>Gérez votre compte et votre sécurité.</p>
      </div>

      {/* Profile (read-only) */}
      <div className="card" style={{ marginBottom:16 }}>
        <p className="sec">Mon profil</p>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:6 }}>
          <div style={{
            width:54, height:54, borderRadius:"50%",
            background: userProfile?.color || "#AF52DE",
            color:"white", display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:700, fontSize:18, flexShrink:0
          }}>
            {initials}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontWeight:700, fontSize:16 }}>{userProfile?.displayName || "—"}</div>
            <div style={{ fontSize:13, color:"#8E8E93", wordBreak:"break-all" }}>
              {firebaseUser?.email || userProfile?.email || "—"}
            </div>
            <div style={{ fontSize:12, color:"#8E8E93", marginTop:2 }}>
              {userProfile?.role === "admin" ? "Administrateur" : "Utilisateur"}
            </div>
          </div>
        </div>
      </div>

      {/* Password change */}
      <div className="card">
        <p className="sec">Changer mon mot de passe</p>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>

          <PwdField
            label="Mot de passe actuel"
            value={currentPwd}
            onChange={setCurrentPwd}
            show={showCurrent}
            setShow={setShowCurrent}
            autoComplete="current-password"
          />

          <PwdField
            label="Nouveau mot de passe"
            value={newPwd}
            onChange={(v) => { setNewPwd(v); setSuccess(false); }}
            show={showNew}
            setShow={setShowNew}
            autoComplete="new-password"
            hint="Au moins 6 caractères. Mélangez majuscules, chiffres et symboles pour plus de sécurité."
          />

          {newPwd && (
            <div>
              <div style={{ display:"flex", gap:4, marginBottom:6 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{
                    flex:1, height:4, borderRadius:2,
                    background: i <= strength.score ? strength.color : "#E5E5EA",
                    transition:"background .2s"
                  }}/>
                ))}
              </div>
              <div style={{ fontSize:12, color: strength.color, fontWeight:600 }}>
                Force : {strength.label}
              </div>
            </div>
          )}

          <PwdField
            label="Confirmer le nouveau mot de passe"
            value={confirmPwd}
            onChange={setConfirmPwd}
            show={showNew}
            setShow={setShowNew}
            autoComplete="new-password"
          />

          {confirmPwd && newPwd !== confirmPwd && (
            <div style={{ fontSize:12, color:"#FF3B30", fontWeight:600 }}>
              ⚠️ Les mots de passe ne correspondent pas.
            </div>
          )}

          {error && (
            <div style={{
              background:"#FFF5F5", border:"1px solid #FFCDD0",
              color:"#FF3B30", padding:"10px 14px", borderRadius:12,
              fontSize:13, fontWeight:600
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background:"#EDFFF3", border:"1px solid #B8E6C5",
              color:"#34C759", padding:"10px 14px", borderRadius:12,
              fontSize:13, fontWeight:600
            }}>
              ✅ Votre mot de passe a été mis à jour avec succès.
            </div>
          )}

          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ justifyContent:"center" }}
              onClick={() => { reset(); setError(""); setSuccess(false); }}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex:1, justifyContent:"center" }}
              disabled={submitting}
            >
              {submitting ? <><span className="sp"/> Mise à jour…</> : "🔒 Mettre à jour le mot de passe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
