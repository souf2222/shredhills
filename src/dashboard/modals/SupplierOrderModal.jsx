// src/dashboard/modals/SupplierOrderModal.jsx
import { useState } from "react";
import { resolveStorageUrl, uploadSupplierOrderFile, updateSupplierOrder } from "../../firebase";
import { SUPPLIER_ORDER_STATUSES, SUPPLIER_STATUS_LABEL } from "../constants";

export function SupplierOrderModal({ order, suppliers, onSave, onUploadLabel, onClose }) {
  const isNew = !order?.id;
  const [form, setForm] = useState(() =>
    order
      ? {
          orderNumber: order.orderNumber || "",
          supplierId: order.supplierId || "",
          productRef: order.productRef || "",
          customer: order.customer || { name: "", phone: "", address: "" },
          status: order.status || "pending",
          estimatedCompletionDate: order.estimatedCompletionDate || null,
        }
      : {
          orderNumber: "",
          supplierId: "",
          productRef: "",
          customer: { name: "", phone: "", address: "" },
          status: "pending",
          estimatedCompletionDate: null,
        }
  );
  const [labelFile, setLabelFile] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState(order?.shippingLabel?.trackingNumber || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCustomer = (k, v) => setForm((f) => ({ ...f, customer: { ...f.customer, [k]: v } }));
  const canSubmit = form.orderNumber?.trim() && form.supplierId && form.customer.name?.trim();

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const payload = { ...form, customer: { ...form.customer } };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  // Upload a shipping label and register it via the callable so history is
  // attributed to the admin actor.
  const uploadLabel = async () => {
    if (!order?.id || !labelFile || !form.supplierId) return;
    setUploading(true);
    try {
      const path = await onUploadLabel(labelFile, form.supplierId, order.id);
      await updateSupplierOrder({
        orderId: order.id,
        patch: { shippingLabel: { path, trackingNumber: trackingNumber || null } },
      });
      setLabelFile(null);
    } finally {
      setUploading(false);
    }
  };

  const downloadLabel = async () => {
    if (!order?.shippingLabel?.path) return;
    const url = await resolveStorageUrl(order.shippingLabel.path);
    window.open(url, "_blank");
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxWidth: 600, position: "relative" }}>
        <button onClick={onClose} aria-label="Fermer" style={{ position: "absolute", top: 10, right: 12, background: "transparent", border: "none", fontSize: 22, lineHeight: 1, color: "#8E8E93", cursor: "pointer", fontFamily: "inherit", padding: "2px 6px", borderRadius: 6, zIndex: 2 }}>✕</button>
        <div className="handle" />
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
          {isNew ? "🏭 Nouvelle commande fournisseur" : "✏️ Commande fournisseur"}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="lbl">N° de commande *</label>
              <input className="inp" placeholder="SHO-1042" value={form.orderNumber || ""} onChange={(e) => set("orderNumber", e.target.value)} />
            </div>
            <div>
              <label className="lbl">Fournisseur *</label>
              <select className="inp" value={form.supplierId || ""} onChange={(e) => set("supplierId", e.target.value)}>
                <option value="">— Sélectionner —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.companyName || s.id}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="lbl">Produit / Référence</label>
            <input className="inp" placeholder="Siège moto modèle X" value={form.productRef || ""} onChange={(e) => set("productRef", e.target.value)} />
          </div>

          <div>
            <label className="lbl">Client — Nom *</label>
            <input className="inp" placeholder="Nom du client" value={form.customer.name || ""} onChange={(e) => setCustomer("name", e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
            <div>
              <label className="lbl">Téléphone</label>
              <input className="inp" type="tel" placeholder="514-555-0101" value={form.customer.phone || ""} onChange={(e) => setCustomer("phone", e.target.value)} />
            </div>
            <div>
              <label className="lbl">Adresse de livraison</label>
              <input className="inp" placeholder="123 rue, Ville, Province, Code postal" value={form.customer.address || ""} onChange={(e) => setCustomer("address", e.target.value)} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="lbl">Statut</label>
              <select className="inp" value={form.status} onChange={(e) => set("status", e.target.value)} disabled={!isNew}>
                {SUPPLIER_ORDER_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              {!isNew && (
                <p style={{ fontSize: 11, color: "#8E8E93", marginTop: 4 }}>
                  Le statut se modifie via le portail ou les actions rapides.
                </p>
              )}
            </div>
            <div>
              <label className="lbl">Date estimée (optionnelle)</label>
              <input className="inp" type="date" value={form.estimatedCompletionDate ? new Date(form.estimatedCompletionDate).toISOString().slice(0, 10) : ""} onChange={(e) => set("estimatedCompletionDate", e.target.value ? new Date(e.target.value).getTime() : null)} />
            </div>
          </div>

          {!isNew && (
            <div style={{ borderTop: "1px solid #E5E5EA", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <label className="lbl">Étiquette d'expédition</label>
              {order.shippingLabel?.path ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={downloadLabel}>📄 Télécharger l'étiquette</button>
                  <span style={{ fontSize: 12, color: "#8E8E93" }}>Suivi : {order.shippingLabel.trackingNumber || "—"}</span>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#8E8E93" }}>Aucune étiquette téléversée.</p>
              )}
              <input className="inp" type="file" accept="application/pdf,image/*" onChange={(e) => setLabelFile(e.target.files?.[0] || null)} />
              <div style={{ display: "flex", gap: 8 }}>
                <input className="inp" placeholder="Numéro de suivi" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                <button className="btn btn-primary" style={{ justifyContent: "center", opacity: labelFile ? 1 : 0.5 }} onClick={uploadLabel} disabled={!labelFile || uploading}>
                  {uploading ? <><span className="sp"/> Téléversement…</> : "Téléverser"}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button className="btn btn-primary" style={{ flex: 2, justifyContent: "center", opacity: canSubmit ? 1 : 0.5 }} onClick={submit} disabled={!canSubmit || saving}>
              {saving ? <><span className="sp"/> {isNew ? "Création…" : "Sauvegarde…"}</> : isNew ? "Créer" : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
