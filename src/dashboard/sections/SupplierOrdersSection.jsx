// src/dashboard/sections/SupplierOrdersSection.jsx
import { useState } from "react";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { ExpandableSection } from "../../components/ExpandableSection";
import { dayStart, DAY } from "../../utils/helpers";
import { SUPPLIER_ORDER_STATUSES, SUPPLIER_STATUS_LABEL } from "../constants";

const STATUS_COLORS = {
  pending: "#8E8E93",
  paid: "#007AFF",
  in_production: "#FF9500",
  ready_to_ship: "#AF52DE",
  shipped: "#34C759",
  completed: "#6D6D72",
  waiting_for_info: "#FF3B30",
  cancelled: "#C7C7CC",
};

const ACTIVE_STATUSES = ["pending", "paid", "in_production", "ready_to_ship", "shipped", "waiting_for_info"];
const ARCHIVED_STATUSES = ["completed", "cancelled"];

export function SupplierOrdersSection({ supplierOrders, suppliers, onNew, onSelect, showToast }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const supplierName = (id) => suppliers.find((s) => s.id === id)?.companyName || "—";

  const countBy = (key) => supplierOrders.filter((o) => o.status === key).length;
  const activeCount = supplierOrders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
  const archivedCount = supplierOrders.filter((o) => ARCHIVED_STATUSES.includes(o.status)).length;

  const baseFiltered = supplierOrders.filter((o) => {
    const q = `${o.orderNumber} ${o.productRef} ${o.customer?.name} ${supplierName(o.supplierId)}`.toLowerCase();
    return q.includes(search.trim().toLowerCase());
  });

  const dateFiltered = baseFiltered.filter((o) => {
    if (dateRange === "all" || !o.createdAt) return true;
    const created = typeof o.createdAt === "number" ? o.createdAt : 0;
    const today = dayStart(Date.now());
    if (dateRange === "today") return dayStart(created) === today;
    if (dateRange === "week") {
      const dayOfWeek = new Date().getDay() || 7;
      const weekStart = today - (dayOfWeek - 1) * DAY;
      return created >= weekStart && created < weekStart + 7 * DAY;
    }
    if (dateRange === "month") {
      const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
      const monthStart = d.getTime();
      const next = new Date(monthStart); next.setMonth(next.getMonth() + 1);
      return created >= monthStart && created < next.getTime();
    }
    if (dateRange === "custom" && dateStart && dateEnd) {
      const s = new Date(dateStart).getTime();
      const e = new Date(dateEnd).getTime() + DAY - 1;
      return created >= s && created <= e;
    }
    return true;
  });

  const statusFiltered = (() => {
    if (statusFilter === "all") return dateFiltered;
    if (statusFilter === "active") return dateFiltered.filter((o) => ACTIVE_STATUSES.includes(o.status));
    if (statusFilter === "archived") return dateFiltered.filter((o) => ARCHIVED_STATUSES.includes(o.status));
    return dateFiltered.filter((o) => o.status === statusFilter);
  })();

  const sortByCreated = (list) => [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const borderColor = (o) => STATUS_COLORS[o.status] || "#8E8E93";
  const isArchived = (o) => ARCHIVED_STATUSES.includes(o.status);

  const renderOrder = (o) => {
    const color = borderColor(o);
    const archived = isArchived(o);
    return (
      <div
        key={o.id}
        className="oc card"
        style={{
          marginBottom: 12, cursor: "pointer", transition: "box-shadow .15s, transform .15s, opacity .15s",
          opacity: archived ? 0.7 : 1, borderLeft: `4px solid ${color}`,
        }}
        onClick={() => onSelect(o)}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.1)"; if (archived) e.currentTarget.style.opacity = 1; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; if (archived) e.currentTarget.style.opacity = 0.7; }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "white", background: color, padding: "2px 8px", borderRadius: 8 }}>
                {SUPPLIER_STATUS_LABEL(o.status)}
              </span>
              {o.shippingLabel?.trackingNumber && (
                <span style={{ fontSize: 11, color: "#34C759", fontWeight: 600 }}>📦 {o.shippingLabel.trackingNumber}</span>
              )}
            </div>
            <p style={{ fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>
              {o.orderNumber}
              <span style={{ fontWeight: 400, fontSize: 13, color: "#8E8E93", marginLeft: 8 }}>
                {o.productRef}
              </span>
            </p>
            <p style={{ fontSize: 13, color: "#6D6D72", marginTop: 2 }}>
              {o.customer?.name || "Client sans nom"} · {supplierName(o.supplierId)}
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {o.estimatedCompletionDate && !["shipped","completed","cancelled"].includes(o.status) && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: o.estimatedCompletionDate < Date.now() ? "#FF3B30" : "#1C1C1E" }}>
                  {new Date(o.estimatedCompletionDate).toLocaleDateString("fr-CA")}
                </div>
                <div style={{ fontSize: 11, color: "#8E8E93" }}>
                  {o.estimatedCompletionDate < Date.now() ? "en retard" : "estimée"}
                </div>
              </>
            )}
            {o.createdAt && (
              <div style={{ fontSize: 11, color: "#8E8E93", marginTop: 2 }}>
                {new Date(o.createdAt).toLocaleDateString("fr-CA")}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const groupTitleStyle = (color) => ({
    fontSize: 16, fontWeight: 700, color, marginBottom: 12, marginTop: 24,
    display: "flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: 0.5,
  });

  return (
    <div>
      <PageHeader
        title="Commandes fournisseurs"
        total={supplierOrders.length}
        filteredCount={statusFiltered.length}
        search={{ value: search, onChange: setSearch, placeholder: "Rechercher (n°, produit, client)…" }}
        button={{ text: "+ Commande", onClick: onNew }}
        filters={[
          <FilterBar
            key="fb-so"
            hasFilters={statusFilter !== "all" || search.trim() || dateRange !== "all"}
            onReset={() => { setStatusFilter("all"); setSearch(""); setDateRange("all"); setDateStart(""); setDateEnd(""); }}
            filters={[
              { key: "status", type: "select", value: statusFilter, onChange: setStatusFilter, options: [
                { value: "all", label: `Toutes (${supplierOrders.length})`, color: "#6D6D72" },
                { value: "active", label: `Actives (${activeCount})`, color: "#007AFF" },
                { value: "pending", label: `En attente (${countBy("pending")})`, color: "#8E8E93" },
                { value: "paid", label: `Payées (${countBy("paid")})`, color: "#007AFF" },
                { value: "in_production", label: `En production (${countBy("in_production")})`, color: "#FF9500" },
                { value: "ready_to_ship", label: `Prêtes à expédier (${countBy("ready_to_ship")})`, color: "#AF52DE" },
                { value: "shipped", label: `Expédiées (${countBy("shipped")})`, color: "#34C759" },
                { value: "waiting_for_info", label: `En attente d'info (${countBy("waiting_for_info")})`, color: "#FF3B30" },
                { value: "archived", label: `Archivées (${archivedCount})`, color: "#6D6D72" },
              ]},
              { key: "date", type: "select", value: dateRange, onChange: setDateRange, options: [
                { value: "all", label: "Toutes les dates" },
                { value: "today", label: "Aujourd'hui" },
                { value: "week", label: "Cette semaine" },
                { value: "month", label: "Ce mois" },
                { value: "custom", label: "Personnalisé" },
              ]},
              ...(dateRange === "custom" ? [{
                key: "custom-date",
                type: "date-range",
                value: { from: dateStart, to: dateEnd },
                onChange: ({ from, to }) => { setDateStart(from); setDateEnd(to); },
              }] : []),
            ]}
          />,
        ]}
      />

      {statusFiltered.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "#8E8E93" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏭</div>
          <p style={{ fontWeight: 600 }}>Aucune commande fournisseur</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Créez une commande pour la suivre avec votre fournisseur.</p>
        </div>
      )}

      {statusFilter === "all" && statusFiltered.length > 0 ? (
        <div>
          {(() => {
            const archived = sortByCreated(dateFiltered.filter((o) => ARCHIVED_STATUSES.includes(o.status)));
            const waiting = sortByCreated(dateFiltered.filter((o) => o.status === "waiting_for_info"));
            const inProd = sortByCreated(dateFiltered.filter((o) => o.status === "in_production"));
            const ready = sortByCreated(dateFiltered.filter((o) => o.status === "ready_to_ship"));
            const newOnes = sortByCreated(dateFiltered.filter((o) => ["pending", "paid"].includes(o.status)));
            const shipped = sortByCreated(dateFiltered.filter((o) => o.status === "shipped"));

            return (
              <>
                {waiting.length > 0 && (
                  <ExpandableSection title="En attente d'info" count={waiting.length} defaultExpanded={true}>
                    {waiting.map(renderOrder)}
                  </ExpandableSection>
                )}
                {newOnes.length > 0 && (
                  <ExpandableSection title="Nouvelles" count={newOnes.length} defaultExpanded={true}>
                    {newOnes.map(renderOrder)}
                  </ExpandableSection>
                )}
                {inProd.length > 0 && (
                  <ExpandableSection title="En production" count={inProd.length} defaultExpanded={true}>
                    {inProd.map(renderOrder)}
                  </ExpandableSection>
                )}
                {ready.length > 0 && (
                  <ExpandableSection title="Prêtes à expédier" count={ready.length} defaultExpanded={true}>
                    {ready.map(renderOrder)}
                  </ExpandableSection>
                )}
                {shipped.length > 0 && (
                  <ExpandableSection title="Expédiées" count={shipped.length} defaultExpanded={false}>
                    {shipped.map(renderOrder)}
                  </ExpandableSection>
                )}
                {archived.length > 0 && (
                  <ExpandableSection title="Terminées / Annulées" count={archived.length} defaultExpanded={false} lazy={true}>
                    {archived.map(renderOrder)}
                  </ExpandableSection>
                )}
              </>
            );
          })()}
        </div>
      ) : (
        sortByCreated(statusFiltered).map(renderOrder)
      )}
    </div>
  );
}
