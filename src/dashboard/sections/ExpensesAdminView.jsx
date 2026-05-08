// src/dashboard/sections/ExpensesAdminView.jsx
import { useMemo, useState } from "react";
import { fmtDate } from "../../utils/helpers";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";

export function ExpensesAdminView({ purchases, users, categories, onApprove, onRefuseStart, onDelete, onPhotoClick, onManageCategories }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [empFilter, setEmpFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const empOptions = useMemo(() => {
    const seen = new Map();
    for (const p of purchases) {
      if (p.empId && !seen.has(p.empId)) {
        seen.set(p.empId, p.empName || users.find(u => u.id === p.empId)?.displayName || "—");
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [purchases, users]);

  const norm = searchText.trim().toLowerCase();
  const filtered = purchases.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (categoryFilter !== "all" && p.categoryId !== categoryFilter) return false;
    if (empFilter !== "all" && p.empId !== empFilter) return false;
    if (!norm) return true;
    return [p.description, p.empName, p.categoryLabel].join(" ").toLowerCase().includes(norm);
  });

  const pendingCount  = purchases.filter(p => p.status === "pending").length;
  const approvedTotal = filtered.filter(p => p.status === "approved").reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const refusedCount  = filtered.filter(p => p.status === "refused").length;

  return (
    <div>
      <PageHeader
        title="📋 Gestion des dépenses"
        total={purchases.length}
        filteredCount={filtered.length}
        search={{ value: searchText, onChange: setSearchText, placeholder: "Rechercher…" }}
        button={{ text: "🏷️ Gérer les catégories", onClick: onManageCategories, className: "btn btn-outline" }}
        filters={[
          <FilterBar
            key="fb-ea"
            hasFilters={statusFilter !== "all" || categoryFilter !== "all" || empFilter !== "all" || searchText.trim()}
            onReset={() => { setStatusFilter("all"); setCategoryFilter("all"); setEmpFilter("all"); setSearchText(""); }}
            filters={[
              {
                key: "status",
                type: "toggle-group",
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: "all", label: `Toutes (${purchases.length})`, color: "#6D6D72" },
                  { value: "pending", label: `⏳ En attente (${pendingCount})`, color: "#FF9500" },
                  { value: "approved", label: "✅ Approuvées", color: "#34C759" },
                  { value: "refused", label: "❌ Refusées", color: "#FF3B30" },
                ],
              },
              {
                key: "category",
                type: "select",
                value: categoryFilter,
                onChange: setCategoryFilter,
                options: [
                  { value: "all", label: "🏷️ Toutes les catégories" },
                  ...categories.map(c => ({ value: c.id, label: `${c.emoji} ${c.label}` })),
                ],
              },
              {
                key: "employee",
                type: "select",
                value: empFilter,
                onChange: setEmpFilter,
                options: [
                  { value: "all", label: "👥 Tous les employés" },
                  ...empOptions.map(e => ({ value: e.id, label: e.name })),
                ],
              },
            ]}
          />,
        ]}
      />

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
                  <img src={p.photoUrl} alt="Facture" style={{ width:96, height:96, objectFit:"cover", display:"block"}}/>
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
