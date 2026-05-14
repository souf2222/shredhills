// src/dashboard/sections/MesAcquisitionsSection.jsx
import { useState } from "react";
import { PageHeader } from "../../components/PageHeader";

const STATUS_STYLES = {
  pending:   { label: "En attente", color: "#FF9500", bg: "#FFF3E0" },
  approved:  { label: "Approuvée",  color: "#34C759", bg: "#E8F5E9" },
  refused:   { label: "Refusée",    color: "#FF3B30", bg: "#FFEBEE" },
  ordered:   { label: "Commandée",  color: "#007AFF", bg: "#E3F2FD" },
  received:  { label: "Reçue",      color: "#5856D6", bg: "#EDE7F6" },
};

const URGENCY_STYLES = {
  low:    { label: "Basse",  color: "#8E8E93" },
  medium: { label: "Moyenne", color: "#FF9500" },
  high:   { label: "Haute",  color: "#FF3B30" },
};

export function MesAcquisitionsSection({ acquisitions, onNewAcquisition, onAcquisitionClick }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const baseFiltered = acquisitions.filter(a =>
    [a.itemName, a.description, a.supplierName].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  );

  const filtered = statusFilter === "all" ? baseFiltered : baseFiltered.filter(a => a.status === statusFilter);

  const countByStatus = (s) => acquisitions.filter(a => a.status === s).length;

  return (
    <div>
      <PageHeader
        title="Mes demandes d'achats"
        total={acquisitions.length}
        filteredCount={filtered.length}
        search={{ value: search, onChange: setSearch, placeholder: "Rechercher…" }}
        button={{ text: "+ Demande d'achat", onClick: onNewAcquisition }}
        filters={[
          <div key="fb-acq" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ background: "#F2F2F7", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente ({countByStatus("pending")})</option>
              <option value="approved">Approuvées ({countByStatus("approved")})</option>
              <option value="ordered">Commandées ({countByStatus("ordered")})</option>
              <option value="received">Reçues ({countByStatus("received")})</option>
              <option value="refused">Refusées ({countByStatus("refused")})</option>
            </select>
            {(statusFilter !== "all" || search.trim()) && (
              <button className="btn btn-outline" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => { setStatusFilter("all"); setSearch(""); }}>
                Réinitialiser
              </button>
            )}
          </div>
        ]}
      />

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "#8E8E93" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          <p style={{ fontWeight: 600 }}>Aucune demande d'achat</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Soumets une demande d'achat d'équipement ou de fourniture.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(a => {
          const st = STATUS_STYLES[a.status] || STATUS_STYLES.pending;
          const ur = URGENCY_STYLES[a.urgency] || URGENCY_STYLES.low;
          const dateStr = a.submittedAt
            ? (typeof a.submittedAt.toDate === "function" ? a.submittedAt.toDate() : new Date(a.submittedAt)).toLocaleDateString("fr-CA")
            : "";
          return (
            <div key={a.id} className="card" onClick={() => onAcquisitionClick(a)}
              style={{ cursor: "pointer", transition: "box-shadow .15s", borderLeft: `4px solid ${st.color}`, padding: "14px 18px" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}30`, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 0.3 }}>
                      {st.label}
                    </span>
                    <span style={{ color: ur.color, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: ur.color + "15", border: `1px solid ${ur.color}25` }}>
                      Urgence: {ur.label}
                    </span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 16, color: "#1C1C1E", margin: 0 }}>{a.itemName}</p>
                  {a.description && (
                    <p style={{ fontSize: 13, color: "#6D6D72", marginTop: 4, lineHeight: 1.4 }}>{a.description}</p>
                  )}
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 13, color: "#6D6D72" }}>
                    {a.quantity && <span>📦 Qté: {a.quantity}</span>}
                    {a.estimatedCost && <span>💰 Estimation: {a.estimatedCost} $</span>}
                    {a.supplierName && <span>🏢 Fournisseur: {a.supplierName}</span>}
                    {dateStr && <span>📅 {dateStr}</span>}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: "#C7C7CC" }}>›</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
