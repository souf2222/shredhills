// src/components/Nav.jsx
import { Logo } from "./Logo";
import { useAuth } from "../contexts/AuthContext";

export function Nav({ title, subtitle, badge, extra }) {
  const { logout, userProfile } = useAuth();
  return (
    <div className="nav">
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <Logo size={34}/>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>{title || "Shredhills"}</div>
          {subtitle && <div style={{ fontSize:11, color:"#8E8E93" }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        {badge}
        {extra}
        <button className="btn btn-outline" style={{ fontSize:13, padding:"7px 14px" }} onClick={logout}>
          Déconnexion
        </button>
      </div>
    </div>
  );
}
