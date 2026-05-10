// src/dashboard/sections/ContactsSection.jsx
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { formatAddress } from "../../utils/helpers";

const TYPE_STYLES = {
  client:    { color: "#007AFF", label: "Client",     icon: "👤" },
  supplier:  { color: "#FF6B35", label: "Fournisseur",icon: "📦" },
  partner:   { color: "#34C759", label: "Partenaire", icon: "🤝" },
  other:     { color: "#8E8E93", label: "Autre",      icon: "📁" },
};

export function ContactsSection({ contacts, search, setSearch, typeFilter, setTypeFilter, onContactClick, onNewContact }) {
  const baseFiltered = contacts.filter((c) =>
    [c.name, c.email, c.phone, c.company, c.street, c.city, c.province, c.postalCode].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  );

  const filtered = typeFilter === "all" ? baseFiltered : baseFiltered.filter((c) => c.type === typeFilter);
  const countByType = (t) => contacts.filter((c) => c.type === t).length;

  return (
    <div>
      <PageHeader
        title="Annuaire"
        total={contacts.length}
        filteredCount={filtered.length}
        search={{ value: search, onChange: setSearch, placeholder: "Rechercher un contact…" }}
        button={{ text: "+ Contact", onClick: onNewContact }}
        filters={[
          <FilterBar
            key="fb-contacts"
            hasFilters={typeFilter !== "all" || search.trim()}
            onReset={() => { setTypeFilter("all"); setSearch(""); }}
            filters={[{
              key: "type", type: "toggle-group", value: typeFilter, onChange: setTypeFilter,
              options: [
                { value: "all",      label: `Tous (${contacts.length})`,                color: "#6D6D72" },
                { value: "client",   label: `Clients (${countByType("client")})`,       color: "#007AFF" },
                { value: "supplier", label: `Fournisseurs (${countByType("supplier")})`, color: "#FF6B35" },
                { value: "partner",  label: `Partenaires (${countByType("partner")})`,  color: "#34C759" },
                { value: "other",    label: `Autres (${countByType("other")})`,         color: "#8E8E93" },
              ],
            }]}
          />,
        ]}
      />

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "#8E8E93" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📇</div>
          <p style={{ fontWeight: 600 }}>Aucun contact</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Ajoute un contact pour l'utiliser dans les commandes et les livraisons.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((c) => {
          const style = TYPE_STYLES[c.type] || TYPE_STYLES.other;
          const addr = formatAddress(c);
          return (
            <div key={c.id} className="card" onClick={() => onContactClick(c)}
              style={{ cursor: "pointer", transition: "box-shadow .15s", borderLeft: `4px solid ${style.color}`, padding: "14px 18px" }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ background: style.color + "18", color: style.color, border: `1px solid ${style.color}30`, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 0.3 }}>
                      {style.icon} {style.label}
                    </span>
                    {c.company && <span style={{ fontSize: 12, color: "#6D6D72", fontWeight: 600 }}>🏢 {c.company}</span>}
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 16, color: "#1C1C1E", margin: 0 }}>{c.name}</p>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 13, color: "#6D6D72" }}>
                    {c.email && <span>✉️ {c.email}</span>}
                    {c.phone && <span>📞 {c.phone}</span>}
                    {addr && <span>📍 {addr}</span>}
                  </div>
                  {c.notes && <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 8, fontStyle: "italic" }}>{c.notes}</p>}
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
