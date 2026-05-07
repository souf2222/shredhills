// src/dashboard/sections/PurchasesSubmitView.jsx
import { fmtDate } from "../../utils/helpers";

export function PurchasesSubmitView({ purchases, categories, onNewPurchase, onPhotoClick }) {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, gap:10, flexWrap:"wrap" }}>
        <p style={{ fontSize:14, color:"#8E8E93" }}>Tes demandes de remboursement et leur statut.</p>
        <button className="btn btn-primary" style={{ padding:"9px 16px", fontSize:13 }} onClick={onNewPurchase} disabled={categories.length === 0} title={categories.length === 0 ? "Aucune catégorie disponible" : ""}>
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
                <img src={p.photoUrl} alt="Facture" style={{ width:72, height:72, objectFit:"cover", display:"block" }}/>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
