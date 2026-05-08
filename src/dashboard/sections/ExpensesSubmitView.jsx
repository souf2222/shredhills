// src/dashboard/sections/ExpensesSubmitView.jsx
import { useState } from "react";
import { fmtDate } from "../../utils/helpers";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";

export function ExpensesSubmitView({ purchases, categories, onNewExpense, onPhotoClick }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

  const norm = searchText.trim().toLowerCase();
  const filtered = purchases.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (!norm) return true;
    return [p.description, p.categoryLabel].join(" ").toLowerCase().includes(norm);
  });

  const pendingCount  = purchases.filter(p => p.status === "pending").length;
  const approvedCount = purchases.filter(p => p.status === "approved").length;
  const refusedCount  = purchases.filter(p => p.status === "refused").length;

  return (
    <div>
      <PageHeader
        title="🧾 Mes dépenses"
        total={purchases.length}
        filteredCount={filtered.length}
        search={{ value: searchText, onChange: setSearchText, placeholder: "Rechercher…" }}
        button={{ text: "+ Nouvelle demande", onClick: onNewExpense, disabled: categories.length === 0, title: categories.length === 0 ? "Aucune catégorie disponible" : "" }}
        filters={[
          <FilterBar
            key="fb-es"
            hasFilters={statusFilter !== "all" || searchText.trim()}
            onReset={() => { setStatusFilter("all"); setSearchText(""); }}
            filters={[
              {
                key: "status",
                type: "toggle-group",
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: "all", label: `Toutes (${purchases.length})`, color: "#6D6D72" },
                  { value: "pending", label: `⏳ En attente (${pendingCount})`, color: "#FF9500" },
                  { value: "approved", label: `✅ Approuvées (${approvedCount})`, color: "#34C759" },
                  { value: "refused", label: `❌ Refusées (${refusedCount})`, color: "#FF3B30" },
                ],
              },
            ]}
          />,
        ]}
      />

      {categories.length === 0 && (
        <div className="card" style={{ textAlign:"center", padding:24, marginBottom:12, background:"#FFF8E1", borderLeft:"4px solid #FF9500" }}>
          <p style={{ fontWeight:600, fontSize:14, color:"#B36200" }}>⚠️ Aucune catégorie configurée.</p>
          <p style={{ fontSize:12, color:"#8E8E93", marginTop:4 }}>Demande à un administrateur d'en créer avant de soumettre une demande.</p>
        </div>
      )}

      {filtered.length === 0 && categories.length > 0 && (
        <div className="card" style={{ textAlign:"center", padding:40 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🧾</div>
          <p style={{ fontWeight:600 }}>Aucune demande</p>
          <p style={{ fontSize:12, color:"#8E8E93", marginTop:4 }}>Clique sur « + Nouvelle demande » pour soumettre une demande de remboursement.</p>
        </div>
      )}

      {filtered.map(p => (
        <div key={p.id} className="oc card" style={{ marginBottom:12, borderLeft:`4px solid ${p.status==="approved"?"#34C759":p.status==="refused"?"#FF3B30":"#FF9500"}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center", flexWrap:"wrap" }}>
                <span className={`badge ${p.status==="approved"?"ba":p.status==="refused"?"br":"bw"}`}>
                  {p.status==="approved"?"✅ Approuvé":p.status==="refused"?"❌ Refusé":"⏳ En attente"}
                </span>
                {p.categoryLabel && (
                  <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, background:`${p.categoryColor||"#8E8E93"}18`, color:p.categoryColor||"#8E8E93", border:`1px solid ${p.categoryColor||"#8E8E93"}30` }}>
                    {p.categoryEmoji} {p.categoryLabel}
                  </span>
                )}
                {p.purchaseDate && <span style={{ fontSize:11, color:"#8E8E93" }}>📅 {fmtDate(p.purchaseDate)}</span>}
              </div>
              <p style={{ fontWeight:700, fontSize:15, wordBreak:"break-word" }}>{p.description}</p>
              <p style={{ fontSize:22, fontWeight:800, margin:"4px 0" }}>{(Number(p.amount) || 0).toFixed(2)} $</p>
              {p.status === "refused" && p.refusedReason && <p style={{ fontSize:12, color:"#FF3B30", marginTop:4 }}>Motif : {p.refusedReason}</p>}
            </div>
            {p.photoUrl && (
              <button type="button" onClick={() => onPhotoClick?.(p.photoUrl)}
                style={{ flex:"0 0 auto", border:"none", padding:0, cursor:"pointer", borderRadius:10, overflow:"hidden", background:"#F2F2F7" }} title="Voir la facture">
                <img src={p.photoUrl} alt="Facture" style={{ width:72, height:72, objectFit:"cover", display:"block"}}/>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
