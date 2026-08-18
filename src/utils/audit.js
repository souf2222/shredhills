const EXCLUDED_FIELDS = new Set(["id", "createdAt", "updatedAt", "pin"]);

const ENTITY_NAMES = {
  users: "Utilisateur",
  contacts: "Contact",
  orders: "Commande",
  stops: "Arret",
  punches: "Feuille de temps",
  purchases: "Depense",
  purchaseCategories: "Categorie de depense",
  events: "Evenement",
  acquisitions: "Demande d'achat",
};

function cleanValue(value) {
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value && typeof value === "object" && typeof value.toDate !== "function") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, entry]) => !EXCLUDED_FIELDS.has(key) && entry !== undefined)
        .map(([key, entry]) => [key, cleanValue(entry)])
    );
  }
  return value;
}

function comparable(value) {
  if (value === undefined) return "__undefined__";
  if (value && typeof value.toMillis === "function") return `timestamp:${value.toMillis()}`;
  if (value instanceof Date) return `date:${value.getTime()}`;
  if (Array.isArray(value)) return `[${value.map(comparable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${key}:${comparable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function auditSnapshot(data = {}) {
  return cleanValue(data);
}

export function changedFields(before = {}, after = {}) {
  const previous = auditSnapshot(before);
  const next = auditSnapshot(after);
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const changes = {};

  keys.forEach((key) => {
    if (comparable(previous[key]) !== comparable(next[key])) {
      changes[key] = { before: previous[key] ?? null, after: next[key] ?? null };
    }
  });

  return changes;
}

export function entityLabel(collectionName, data = {}, id) {
  const name = ENTITY_NAMES[collectionName] || collectionName;
  const value = data.displayName || data.name || data.clientName || data.title || data.itemName || data.label || data.description;
  return value ? `${name}: ${value}` : `${name} #${id}`;
}

export function buildAuditEntry({ action, collectionName, entityId, actor, before, after }) {
  const source = after || before || {};
  const entry = {
    action,
    collection: collectionName,
    entityId,
    entityLabel: entityLabel(collectionName, source, entityId),
    actorId: actor?.id || actor?.uid || null,
    actorName: actor?.displayName || actor?.email || "Utilisateur inconnu",
  };

  if (action === "update") entry.changes = changedFields(before, after);
  else entry.snapshot = auditSnapshot(source);

  return entry;
}
