// src/dashboard/sections/PurchasesAdminView.jsx
import { useMemo } from "react";
import { fmtDate } from "../../utils/helpers";

export function PurchasesAdminView({ purchases, users, categories, filter, setFilter, onApprove, onRefuseStart, onDelete, onPhotoClick, onManageCategories }) {
  const empOptions = useMemo(() => {
    const seen = new Map();
    for (const p of purchases) {
      if (p.empId && !seen.has(p.empId)) {
        seen.set(p.empId, p.empName || users.find(u => u.id === p.empId)?.displayName || "—");
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [purchases, users]);

  const filtered = purchases.filter(p => {
    if (filter.status !== "all" && p.status !== filter.status) return false;
    if (filter.categoryId !== "all" && p.categoryId !== filter.categoryId) return false;
    if (filter.empId !== "all" && p.empId !== filter.empId) return false;
    return true;
  });

  const pendingCount  = purchases.filter(p => p.status === "pending").length;
  const approvedTotal = filtered.filter(p => p.status === "approved").reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const refusedCount  = filtered.filter(p => p.status === "refused").length;

  const STATUS_FILTERS = [
    { v:"pending",  label:`⏳ En attente${pendingCount?` (${pendingCount})`:""}`, color:"#FF9500" },
    { v:"approved", label:"✅ Approuvées", color:"#34C759" },
    { v:"refused",  label:"❌ Refusées",   color:"#FF3B30" },
    { v:"all",      label:"Toutes",        color:"#6D6D72" },
  ];

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <p style={{ fontSize:14, color:"#8E8E93" }}>Approuve ou refuse les demandes de remboursement de l'équipe.</p>
        <button className="btn btn-outline" style={{ padding:"8px 14px", fontSize:13 }} onClick={onManageCategories}>🏷️ Gérer les catégories</button>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
        {STATUS_FILTERS.map(s => {
          const active = filter.status === s.v;
          return (
            <button key={s.v} type="button" onClick={() => setFilter(f => ({ ...f, status: s.v }))}
              style={{ padding:"7px 14px", borderRadius:20, border:"1.5px solid", borderColor: active ? s.color : "#E5E5EA", background: active ? `${s.color}18` : "white", color: active ? s.color : "#3A3A3C", fontWeight: active ? 700 : 500, cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>
              {s.label}
            </button>
          );
        })}
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        <select value={filter.categoryId} onChange={e => setFilter(f => ({ ...f, categoryId: e.target.value }))}
          style={{ background:"white", border:"1px solid #E5E5EA", borderRadius:10, padding:"8px 12px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          <option value="all">🏷️ Toutes les catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
        <select value={filter.empId} onChange={e => setFilter(f => ({ ...f, empId: e.target.value }))}
          style={{ background:"white", border:"1px solid #E5E5EA", borderRadius:10, padding:"8px 12px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          <option value="all">👥 Tous les employés</option>
          {empOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        {(filter.status !== "all" || filter.categoryId !== "all" || filter.empId !== "all") && (
          <button className="btn btn-outline" style={{ padding:"8px 12px", fontSize:12 }} onClick={() => setFilter({ status:"all", categoryId:"all", empId:"all" })}>✕ Réinitialiser</button>
        )}
      </div>

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

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign:"center", padding:48, color:"#8E8E93" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🧾</div>
          <p style={{ fontWeight:600 }}>Aucune demande</p>
          <p style={{ fontSize:12, marginTop:4 }}>Modifie les filtres pour voir plus de résultats.</p>
        </div>
      )}

      {filtered.map(p => {
        const catColor = p.categoryColor || "#8E8E93";
        const borderColor = p.status === "approved" ? "#34C759" : p.status === "refused" ? "#FF3B30" : "#FF9500";
        const submittedMs = p.submittedAt?.toMillis ? p.submittedAt.toMillis() : p.submittedAt;
        return (
          <div key={p.id} className="oc card" style={{ marginBottom:12, borderLeft:`4px solid ${borderColor}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:14, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center", flexWrap:"wrap" }}>
                  <span className={`badge ${p.status==="approved"?"ba":p.status==="refused"?"br":"bw"}`}>
                    {p.status==="approved"?"✅ Approuvé":p.status==="refused"?"❌ Refusé":"⏳ En attente"}
                  </span>
                  {p.categoryLabel && (
                    <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, background:`${catColor}18`, color:catColor, border:`1px solid ${catColor}30` }}>
                      {p.categoryEmoji} {p.categoryLabel}
                    </span>
                  )}
                  <span style={{ fontSize:11, color:"#8E8E93" }}>👤 {p.empName || "—"}</span>
                  {p.purchaseDate && <span style={{ fontSize:11, color:"#8E8E93" }}>· 📅 {fmtDate(p.purchaseDate)}</span>}
                  {submittedMs && <span style={{ fontSize:11, color:"#C7C7CC" }}>· soumis {fmtDate(submittedMs)}</span>}
                </div>
                <p style={{ fontWeight:700, fontSize:15, wordBreak:"break-word" }}>{p.description}</p>
                <p style={{ fontSize:24, fontWeight:800, margin:"4px 0", color:"#1C1C1E" }}>{(Number(p.amount) || 0).toFixed(2)} $</p>
                {p.status === "refused" && p.refusedReason && <p style={{ fontSize:12, color:"#FF3B30", marginTop:4 }}>Motif : {p.refusedReason}</p>}
                {p.decidedByName && p.status !== "pending" && <p style={{ fontSize:11, color:"#8E8E93", marginTop:4 }}>Par {p.decidedByName}</p>}
              </div>
              {p.photoUrl ? (
                <button type="button" onClick={() => onPhotoClick?.(p.photoUrl)}
                  style={{ flex:"0 0 auto", border:"none", padding:0, cursor:"pointer", borderRadius:10, overflow:"hidden", background:"#F2F2F7" }} title="Voir la facture en grand">
                  <img src={p.photoUrl} alt="Facture" style={{ width:96, height:96, objectFit:"cover", display:"block" }}/>
                </button>
              ) : (
                <div style={{ flex:"0 0 auto", width:96, height:96, borderRadius:10, background:"#F9F9FB", border:"1px dashed #E5E5EA", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#C7C7CC", fontSize:11, gap:4 }}>
                  <span style={{ fontSize:22 }}>🧾</span><span>Pas de photo</span>
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap", justifyContent:"flex-end" }}>
              {p.status === "pending" && (
                <>
                  <button className="btn btn-green" style={{ padding:"8px 14px", fontSize:13 }} onClick={() => onApprove(p.id)}>✓ Approuver</button>
                  <button className="btn btn-red" style={{ padding:"8px 14px", fontSize:13 }} onClick={() => onRefuseStart(p)}>✕ Refuser</button>
                </>
              )}
              <button className="btn btn-soft-red" style={{ padding:"8px 12px", fontSize:12 }} onClick={() => onDelete(p)}>🗑️ Supprimer</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
