// src/dashboard/sections/EquipeSection.jsx
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";

export function EquipeSection({ users, userProfile, equipeSearch, setEquipeSearch, equipeRole, setEquipeRole, onUserClick, onNewUser }) {
  const equipeFiltered = users.filter(u => {
    const okRole = equipeRole === "all" ? true : equipeRole === "admin" ? u.role === "admin" : (u.jobs || []).includes(equipeRole);
    return okRole && [u.displayName, u.email].join(" ").toLowerCase().includes(equipeSearch.trim().toLowerCase());
  });

  return (
    <div>
      <PageHeader
        title="👥 Équipe"
        total={users.length}
        filteredCount={equipeFiltered.length}
        search={{ value: equipeSearch, onChange: setEquipeSearch, placeholder: "Rechercher..." }}
        button={{ text: "+ Utilisateur", onClick: onNewUser }}
        filters={[
          <FilterBar key="fb-e" hasFilters={equipeRole !== "all" || equipeSearch.trim()} onReset={() => { setEquipeRole("all"); setEquipeSearch(""); }} filters={[
            { key: "role", type: "select", value: equipeRole, onChange: setEquipeRole, options: [
              { value: "all", label: "Tous les rôles" },
              { value: "admin", label: "Admin" },
              { value: "employee", label: "Employé" },
              { value: "driver", label: "Livreur" },
              { value: "accountant", label: "Comptable" }
            ]}
          ]} />
        ]}
      />

      {equipeFiltered.length === 0 && (
        <div className="card" style={{ textAlign:"center", padding:48, color:"#8E8E93" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
          <p style={{ fontWeight:600 }}>Aucun utilisateur trouvé</p>
        </div>
      )}

      {equipeFiltered.map(u => {
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
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="btn btn-outline" style={{ fontSize:13, padding:"8px 16px" }} onClick={() => onUserClick(u)}>Modifier</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
