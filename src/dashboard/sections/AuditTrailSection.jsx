import { useState } from "react";
import { PageHeader } from "../../components/PageHeader";

const ACTIONS = {
  create: { label: "Creation", color: "#34C759" },
  update: { label: "Modification", color: "#007AFF" },
  delete: { label: "Suppression", color: "#FF3B30" },
};

function dateLabel(value) {
  const date = value?.toDate ? value.toDate() : typeof value === "number" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" })
    : "A l'instant";
}

function valueLabel(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function AuditDetails({ entry }) {
  if (entry.action !== "update") {
    return <pre style={styles.snapshot}>{valueLabel(entry.snapshot)}</pre>;
  }

  const changes = Object.entries(entry.changes || {});
  if (!changes.length) return <p style={styles.empty}>Aucun changement de donnees detecte.</p>;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {changes.map(([field, change]) => (
        <div key={field} style={styles.change}>
          <strong style={{ fontSize: 13 }}>{field}</strong>
          <div style={styles.values}>
            <pre style={styles.before}>{valueLabel(change.before)}</pre>
            <pre style={styles.after}>{valueLabel(change.after)}</pre>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuditTrailSection({ auditLogs }) {
  const [action, setAction] = useState("all");
  const [actor, setActor] = useState("all");
  const [collection, setCollection] = useState("all");
  const [openId, setOpenId] = useState(null);

  const actors = [...new Set(auditLogs.map(entry => entry.actorName).filter(Boolean))].sort();
  const collections = [...new Set(auditLogs.map(entry => entry.collection).filter(Boolean))].sort();
  const entries = auditLogs.filter(entry =>
    (action === "all" || entry.action === action) &&
    (actor === "all" || entry.actorName === actor) &&
    (collection === "all" || entry.collection === collection)
  );

  return (
    <div>
      <PageHeader title="Historique d'activite" total={auditLogs.length} filteredCount={entries.length} />

      <div style={styles.filters}>
        <select className="inp" value={action} onChange={e => setAction(e.target.value)} style={styles.select}>
          <option value="all">Toutes les actions</option>
          {Object.entries(ACTIONS).map(([value, item]) => <option key={value} value={value}>{item.label}s</option>)}
        </select>
        <select className="inp" value={actor} onChange={e => setActor(e.target.value)} style={styles.select}>
          <option value="all">Tous les utilisateurs</option>
          {actors.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
        <select className="inp" value={collection} onChange={e => setCollection(e.target.value)} style={styles.select}>
          <option value="all">Tous les types</option>
          {collections.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      {entries.length === 0 ? (
        <div style={styles.empty}>Aucune activite ne correspond aux filtres selectionnes.</div>
      ) : (
        <div style={styles.list}>
          {entries.map(entry => {
            const actionInfo = ACTIONS[entry.action] || { label: entry.action, color: "#6D6D72" };
            const isOpen = openId === entry.id;
            return (
              <article key={entry.id} style={styles.item}>
                <button type="button" onClick={() => setOpenId(isOpen ? null : entry.id)} style={styles.summary} aria-expanded={isOpen}>
                  <div style={styles.main}>
                    <span style={{ ...styles.badge, background: actionInfo.color }}>{actionInfo.label}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.label}>{entry.entityLabel || `${entry.collection} #${entry.entityId}`}</div>
                      <div style={styles.meta}>{entry.actorName || "Utilisateur inconnu"} · {dateLabel(entry.createdAt)}</div>
                    </div>
                  </div>
                  <span style={styles.expand}>{isOpen ? "Masquer" : "Details"}</span>
                </button>
                {isOpen && <div style={styles.details}><AuditDetails entry={entry} /></div>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

const codeStyle = { margin: 0, padding: 8, borderRadius: 7, fontSize: 12, lineHeight: 1.45, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" };

const styles = {
  filters: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 },
  select: { width: "auto", minWidth: 170, flex: "1 1 170px" },
  list: { display: "grid", gap: 10 },
  item: { background: "white", border: "1px solid #E5E5EA", borderRadius: 14, overflow: "hidden" },
  summary: { width: "100%", border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", textAlign: "left" },
  main: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
  badge: { color: "white", borderRadius: 20, fontWeight: 700, fontSize: 11, padding: "5px 8px", whiteSpace: "nowrap" },
  label: { color: "#1C1C1E", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  meta: { color: "#8E8E93", fontSize: 12, marginTop: 3 },
  expand: { color: "#007AFF", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  details: { borderTop: "1px solid #E5E5EA", background: "#F9F9FB", padding: 14 },
  change: { background: "white", border: "1px solid #E5E5EA", borderRadius: 10, padding: 10 },
  values: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 8, marginTop: 7 },
  before: { ...codeStyle, background: "#FFF1F0", color: "#B42318" },
  after: { ...codeStyle, background: "#ECFDF3", color: "#027A48" },
  snapshot: { ...codeStyle, background: "white", color: "#1C1C1E" },
  empty: { background: "#F9F9FB", border: "1px solid #E5E5EA", borderRadius: 12, color: "#6D6D72", fontSize: 14, padding: 18, textAlign: "center" },
};
