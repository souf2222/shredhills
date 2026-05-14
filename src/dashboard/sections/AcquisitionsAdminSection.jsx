// src/dashboard/sections/AcquisitionsAdminSection.jsx
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

export function AcquisitionsAdminSection({ acquisitions, users, onAcquisitionClick, onApprove, onRefuseStart, onOrder, onReceive, onDelete }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const baseFiltered = acquisitions.filter(a =>
    [a.itemName, a.description, a.supplierName, a.requesterName].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  );

  const filtered = statusFilter === "all" ? baseFiltered : baseFiltered.filter(a => a.status === statusFilter);

  const countByStatus = (s) => acquisitions.filter(a => a.status === s).length;
  const pendingCount = countByStatus("pending");

  return (
    <div>
      <PageHeader
        title="Gestion des achats"
        total={acquisitions.length}
        filteredCount={filtered.length}
        search={{ value: search, onChange: setSearch, placeholder: "Rechercher…" }}
        button={null}
        filters={[
          <div key="fb-acq-admin" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
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

      {pendingCount > 0 && (
        <div style={{ background: "#FFF3E0", border: "1px solid #FFCC80", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⏳</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#E65100" }}>
            {pendingCount} demande{pendingCount > 1 ? "s" : ""} en attente de traitement
          </span>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "#8E8E93" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          <p style={{ fontWeight: 600 }}>Aucune demande d'achat</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(a => {
          const st = STATUS_STYLES[a.status] || STATUS_STYLES.pending;
          const ur = URGENCY_STYLES[a.urgency] || URGENCY_STYLES.low;
          const dateStr = a.submittedAt
            ? (typeof a.submittedAt.toDate === "function" ? a.submittedAt.toDate() : new Date(a.submittedAt)).toLocaleDateString("fr-CA")
            : "";
          const isPending = a.status === "pending";
          const isApproved = a.status === "approved";
          const isOrdered = a.status === "ordered";

          return (
            <div key={a.id} className="card" style={{ borderLeft: `4px solid ${st.color}`, padding: "14px 18px" }}>
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
                    {a.requesterName && <span>👤 Par: {a.requesterName}</span>}
                  </div>
                  {a.status === "refused" && a.refusedReason && (
                    <div style={{ marginTop: 8, padding: "8px 12px", background: "#FFEBEE", borderRadius: 8, fontSize: 13, color: "#C62828" }}>
                      <strong>Motif du refus:</strong> {a.refusedReason}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 120 }}>
                  {isPending && (
                    <>
                      <button className="btn btn-primary" style={{ padding: "8px 12px", fontSize: 13, justifyContent: "center" }} onClick={() => onApprove(a.id)}>
                        Approuver
                      </button>
                      <button className="btn btn-outline" style={{ padding: "8px 12px", fontSize: 13, justifyContent: "center", borderColor: "#FF3B30", color: "#FF3B30" }} onClick={() => onRefuseStart(a)}>
                        Refuser
                      </button>
                    </>
                  )}
                  {isApproved && (
                    <button className="btn btn-primary" style={{ padding: "8px 12px", fontSize: 13, justifyContent: "center" }} onClick={() => onOrder(a.id)}>
                      Marquer commandée
                    </button>
                  )}
                  {isOrdered && (
                    <button className="btn btn-primary" style={{ padding: "8px 12px", fontSize: 13, justifyContent: "center" }} onClick={() => onReceive(a.id)}>
                      Marquer reçue
                    </button>
                  )}
                  <button className="btn btn-outline" style={{ padding: "8px 12px", fontSize: 13, justifyContent: "center" }} onClick={() => onAcquisitionClick(a)}>
                    Détails
                  </button>
                  <button className="btn btn-red" style={{ padding: "8px 12px", fontSize: 13, justifyContent: "center" }} onClick={() => onDelete(a)}>
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
