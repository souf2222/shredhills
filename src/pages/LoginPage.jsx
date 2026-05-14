// src/pages/LoginPage.jsx
import { useState } from "react";
import { Logo } from "../components/Logo";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Veuillez remplir tous les champs."); return; }
    setError(""); setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const msgs = {
        "auth/invalid-credential":      "Courriel ou mot de passe incorrect.",
        "auth/user-not-found":          "Aucun compte avec ce courriel.",
        "auth/wrong-password":          "Mot de passe incorrect.",
        "auth/invalid-email":           "Format de courriel invalide.",
        "auth/too-many-requests":       "Trop de tentatives. Réessaie plus tard.",
        "auth/network-request-failed":  "Problème de connexion réseau.",
      };
      setError(msgs[err.code] || "Erreur de connexion. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#F2F2F7,#E5E5EA)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        {/* Logo + titre */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"inline-block", marginBottom:16 }}>
            <Logo size={70}/>
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, color:"#1C1C1E", letterSpacing:"-0.5px" }}>Shredhills</h1>
          <p style={{ fontSize:14, color:"#8E8E93", marginTop:6 }}>Connecte-toi à ton espace</p>
        </div>

        {/* Formulaire */}
        <div className="card" style={{ padding:32, boxShadow:"0 8px 40px rgba(0,0,0,.10)" }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div>
                <label className="lbl">Adresse courriel</label>
                <input
                  className="inp"
                  type="email"
                  placeholder="toi@shredhills.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <div>
                <label className="lbl">Mot de passe</label>
                <input
                  className="inp"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div style={{ background:"#FFF5F5", border:"1px solid #FFCDD0", borderRadius:12, padding:"10px 14px" }}>
                  <p style={{ fontSize:13, color:"#FF3B30", fontWeight:500 }}>⚠️ {error}</p>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width:"100%", justifyContent:"center", padding:"14px", fontSize:16, marginTop:4, opacity: loading ? 0.7 : 1 }}
                disabled={loading}
              >
                {loading ? <><span className="sp"/> Connexion…</> : "Se connecter"}
              </button>
            </div>
          </form>
        </div>

        <p style={{ textAlign:"center", fontSize:12, color:"#C7C7CC", marginTop:20 }}>
          © {new Date().getFullYear()} Shredhills · Système de gestion interne
        </p>
      </div>
    </div>
  );
}
