// src/components/MetaTags.jsx
// Small read-only "audit footer" shown inside detail modals.
// Renders three pill-style tags:
//   👤 Créé par <name>
//   🕐 Créé le <date>
//   ✏️ Modifié le <date>   (only if updatedAt differs meaningfully from createdAt)
//
// Robust to:
//   - Firestore Timestamp objects (have .toMillis())
//   - serverTimestamp() placeholders that briefly render as null
//   - missing createdBy / unknown user id

import { fmtDate } from "../utils/helpers";

// Normalize anything that might come back from Firestore into a millisecond
// number. Returns null if the value isn't usable yet.
const toMs = (v) => {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v?.seconds === "number")    return v.seconds * 1000;
  return null;
};

function Tag({ icon, label, value, title }) {
  return (
    <span
      title={title}
      style={{
        display:"inline-flex", alignItems:"center", gap:6,
        background:"#F2F2F7", color:"#3A3A3C",
        borderRadius:20, padding:"4px 10px",
        fontSize:11, fontWeight:500,
        whiteSpace:"nowrap", maxWidth:"100%",
      }}
    >
      <span aria-hidden style={{ fontSize:12 }}>{icon}</span>
      <span style={{ color:"#8E8E93", fontWeight:600 }}>{label}</span>
      <span style={{
        fontWeight:700, color:"#1C1C1E",
        overflow:"hidden", textOverflow:"ellipsis",
      }}>
        {value}
      </span>
    </span>
  );
}

export function MetaTags({ createdBy, createdAt, updatedAt, users = [] }) {
  const createdMs = toMs(createdAt);
  const updatedMs = toMs(updatedAt);

  const author = users.find(u => u.id === createdBy);
  const authorName = author?.displayName || (createdBy ? "Utilisateur inconnu" : null);

  // Only show "Modifié le" if it's meaningfully later than "Créé le"
  // (server timestamps written in the same request can drift by a few ms).
  const showUpdated =
    updatedMs && createdMs && (updatedMs - createdMs) > 60_000;

  // Hide the whole block when there's nothing to show.
  if (!authorName && !createdMs && !showUpdated) return null;

  return (
    <div style={{
      display:"flex", flexWrap:"wrap", gap:6,
      paddingTop:14, marginTop:6,
      borderTop:"1px solid #F2F2F7",
    }}>
      {authorName && (
        <Tag
          icon="👤"
          label="Créé par"
          value={authorName}
          title={authorName}
        />
      )}
      {createdMs && (
        <Tag
          icon="🕐"
          label="Créé le"
          value={fmtDate(createdMs)}
          title={new Date(createdMs).toLocaleString("fr-CA")}
        />
      )}
      {showUpdated && (
        <Tag
          icon="✏️"
          label="Modifié le"
          value={fmtDate(updatedMs)}
          title={new Date(updatedMs).toLocaleString("fr-CA")}
        />
      )}
    </div>
  );
}
