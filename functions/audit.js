function comparable(value) {
  if (value && typeof value.toMillis === "function") return `timestamp:${value.toMillis()}`;
  if (value instanceof Date) return `date:${value.getTime()}`;
  if (Array.isArray(value)) return `[${value.map(comparable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${key}:${comparable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function unmatchedSessions(previous, next) {
  const remaining = [...next];
  const removed = [];

  for (const session of previous) {
    const index = remaining.findIndex(candidate => comparable(candidate) === comparable(session));
    if (index === -1) removed.push(session);
    else remaining.splice(index, 1);
  }

  return { removed, added: remaining };
}

// Punch sessions live in one document. Identify writes that add or remove one
// otherwise unchanged session so the audit trail reflects the user action.
function punchSessionAuditAction(before = {}, after = {}) {
  const previous = Array.isArray(before.sessions) ? before.sessions : [];
  const next = Array.isArray(after.sessions) ? after.sessions : [];
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const field of fields) {
    if (field !== "sessions" && comparable(before[field]) !== comparable(after[field])) return null;
  }

  const { removed, added } = unmatchedSessions(previous, next);
  if (removed.length === 1 && added.length === 0) return { action: "delete", session: removed[0] };
  if (removed.length === 0 && added.length === 1) return { action: "create", session: added[0] };
  return null;
}

module.exports = { punchSessionAuditAction };
