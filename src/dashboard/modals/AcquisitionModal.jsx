// src/dashboard/modals/AcquisitionModal.jsx
import { useState } from "react";
import { Modal } from "../../components/Modal";

export function AcquisitionModal({ open, onClose, onSubmit, contacts, initialData }) {
  const [form, setForm] = useState(() => initialData || {
    itemName: "",
    description: "",
    quantity: 1,
    estimatedCost: "",
    supplierId: "",
    urgency: "low",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const supplierOptions = contacts.filter(c => c.type === "supplier" || c.type === "all" || !c.type);
  const selectedSupplier = contacts.find(c => c.id === form.supplierId);

  const handleSubmit = async () => {
    if (!form.itemName.trim()) { return; }
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        itemName: form.itemName.trim(),
        description: form.description.trim(),
        quantity: parseInt(form.quantity, 10) || 1,
        estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : null,
        supplierName: selectedSupplier?.name || selectedSupplier?.company || null,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={initialData ? "📋 Détails de la demande" : "🛒 Nouvelle demande d'achat"}
      footer={
        <>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onClose} disabled={submitting}>
            Annuler
          </button>
          {!initialData && (
            <button className="btn btn-primary" style={{ flex: 2, justifyContent: "center", opacity: submitting ? 0.5 : 1 }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><span className="sp" /> Envoi…</> : "Soumettre la demande"}
            </button>
          )}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="lbl">Article / Équipement *</label>
          <input
            className="inp"
            value={form.itemName}
            onChange={e => set("itemName", e.target.value)}
            placeholder="Nom de l'article ou équipement"
            disabled={!!initialData}
          />
        </div>

        <div>
          <label className="lbl">Description</label>
          <textarea
            className="inp"
            rows={3}
            value={form.description}
            onChange={e => set("description", e.target.value)}
            placeholder="Description détaillée, spécifications, etc."
            disabled={!!initialData}
            style={{ resize: "vertical" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="lbl">Quantité</label>
            <input
              className="inp"
              type="number"
              min={1}
              value={form.quantity}
              onChange={e => set("quantity", e.target.value)}
              disabled={!!initialData}
            />
          </div>
          <div>
            <label className="lbl">Coût estimé ($)</label>
            <input
              className="inp"
              type="number"
              min={0}
              step="0.01"
              value={form.estimatedCost}
              onChange={e => set("estimatedCost", e.target.value)}
              placeholder="Optionnel"
              disabled={!!initialData}
            />
          </div>
        </div>

        <div>
          <label className="lbl">Fournisseur (optionnel)</label>
          <select
            className="inp"
            value={form.supplierId}
            onChange={e => set("supplierId", e.target.value)}
            disabled={!!initialData}
            style={{ cursor: "pointer" }}
          >
            <option value="">-- Choisir dans les contacts --</option>
            {supplierOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>
            ))}
          </select>
          {supplierOptions.length === 0 && (
            <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 4 }}>
              Aucun fournisseur dans les contacts. Vous pouvez quand même soumettre sans fournisseur.
            </p>
          )}
        </div>

        <div>
          <label className="lbl">Urgence</label>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { value: "low", label: "🟢 Basse" },
              { value: "medium", label: "🟠 Moyenne" },
              { value: "high", label: "🔴 Haute" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => !initialData && set("urgency", value)}
                className="btn"
                disabled={!!initialData}
                style={{ flex: 1, justifyContent: "center", background: form.urgency === value ? "#111" : "white", color: form.urgency === value ? "white" : "#3A3A3C", border: "1.5px solid", borderColor: form.urgency === value ? "#111" : "#E5E5EA" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {initialData && (
          <div style={{ background: "#F9F9FB", border: "1px solid #EEF0F3", borderRadius: 12, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, color: "#6D6D72" }}><strong>Demandé par:</strong> {initialData.requesterName}</div>
            <div style={{ fontSize: 13, color: "#6D6D72" }}><strong>Date:</strong> {initialData.submittedAt ? (typeof initialData.submittedAt.toDate === "function" ? initialData.submittedAt.toDate() : new Date(initialData.submittedAt)).toLocaleDateString("fr-CA") : "N/A"}</div>
            {initialData.decidedByName && (
              <div style={{ fontSize: 13, color: "#6D6D72" }}><strong>Traité par:</strong> {initialData.decidedByName}</div>
            )}
            {initialData.refusedReason && (
              <div style={{ fontSize: 13, color: "#C62828" }}><strong>Motif du refus:</strong> {initialData.refusedReason}</div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
