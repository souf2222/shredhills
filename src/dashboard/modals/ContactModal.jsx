// src/dashboard/modals/ContactModal.jsx
import { useState } from "react";
import { MetaTags } from "../../components/MetaTags";
import { CountryDropdown } from "../../components/CountryDropdown";

const TYPE_OPTIONS = [
  { value: "client",   label: "Client",      icon: "👤" },
  { value: "supplier", label: "Fournisseur", icon: "📦" },
  { value: "partner",  label: "Partenaire",  icon: "🤝" },
  { value: "other",    label: "Autre",       icon: "📁" },
];

export function ContactModal({ contact, users, onSave, onDelete, onClose }) {
  const isNew = !contact?.id;
  const [form, setForm] = useState(() =>
    contact
      ? { ...contact }
      : {
          name: "",
          email: "",
          phone: "",
          company: "",
          street: "",
          city: "",
          province: "",
          postalCode: "",
          country: "CA",
          notes: "",
          type: "client",
        }
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name?.trim();

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!contact?.id || deleting) return;
    setDeleting(true);
    try {
      await onDelete(contact.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxWidth: 560 }}>
        <div className="handle" />
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
          {isNew ? "📇 Nouveau contact" : "✏️ Modifier le contact"}
        </h3>
        {!isNew && (
          <p style={{ fontSize: 12, color: "#C7C7CC", fontFamily: "monospace", marginBottom: 16 }}>
            {contact.id}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Nom */}
          <div>
            <label className="lbl">Nom / Raison sociale *</label>
            <input className="inp" placeholder="Sophie Tremblay" value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>

          {/* Type */}
          <div>
            <label className="lbl">Type</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TYPE_OPTIONS.map((opt) => {
                const active = form.type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("type", opt.value)}
                    style={{
                      flex: 1, minWidth: 100, padding: "9px 12px", borderRadius: 10,
                      border: "1.5px solid", borderColor: active ? "#111" : "#E5E5EA",
                      background: active ? "#111" : "white", color: active ? "white" : "#3A3A3C",
                      fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                      fontSize: 13, transition: "all .15s",
                    }}
                  >
                    {opt.icon} {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email / Téléphone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="lbl">Courriel</label>
              <input className="inp" type="email" placeholder="contact@exemple.com" value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label className="lbl">Téléphone</label>
              <input className="inp" type="tel" placeholder="514-555-0101" value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>

          {/* Entreprise */}
          <div>
            <label className="lbl">Entreprise</label>
            <input className="inp" placeholder="ACME Inc." value={form.company || ""} onChange={(e) => set("company", e.target.value)} />
          </div>

          {/* Adresse structurée */}
          <div>
            <label className="lbl">Adresse</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input className="inp" placeholder="Numéro et rue" value={form.street || ""} onChange={(e) => set("street", e.target.value)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input className="inp" placeholder="Ville" value={form.city || ""} onChange={(e) => set("city", e.target.value)} />
                <input className="inp" placeholder="Province / État" value={form.province || ""} onChange={(e) => set("province", e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input className="inp" placeholder="Code postal" value={form.postalCode || ""} onChange={(e) => set("postalCode", e.target.value)} />
                <CountryDropdown value={form.country || ""} onChange={(code) => set("country", code)} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="lbl">Notes</label>
            <textarea
              className="inp" rows={3} placeholder="Préférences, infos utiles…"
              value={form.notes || ""} onChange={(e) => set("notes", e.target.value)}
              style={{ resize: "vertical", minHeight: 72 }}
            />
          </div>

          {!isNew && (
            <MetaTags createdBy={contact.createdBy} createdAt={contact.createdAt} updatedAt={contact.updatedAt} users={users} />
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            {!isNew && (
              <button className="btn btn-red" style={{ padding: "11px 16px" }} onClick={remove} disabled={deleting || saving}>
                {deleting ? <><span className="sp"/> Suppression…</> : "Supprimer"}
              </button>
            )}
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onClose} disabled={saving || deleting}>
              Annuler
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2, justifyContent: "center", opacity: canSubmit ? 1 : 0.5 }}
              onClick={submit} disabled={!canSubmit || saving || deleting}
            >
              {saving ? <><span className="sp"/> {isNew ? "Création…" : "Sauvegarde…"}</> : isNew ? "Créer" : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
