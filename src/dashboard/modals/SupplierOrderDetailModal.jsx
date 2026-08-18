// src/dashboard/modals/SupplierOrderDetailModal.jsx
import { useState } from "react";
import { updateSupplierOrder, resolveStorageUrl, uploadSupplierOrderFile, deleteStorageFile } from "../../firebase";
import { SUPPLIER_ORDER_STATUSES, SUPPLIER_STATUS_LABEL, SUPPLIER_TRANSITIONS } from "../constants";

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

// Turns a raw history entry into a short, human-readable French line. Storage
// paths and raw status codes are translated so the timeline stays scannable.
function formatHistory(h) {
  const from = h.from, to = h.to;
  switch (h.action) {
    case "status_change":
      return `Statut : ${SUPPLIER_STATUS_LABEL(from)} → ${SUPPLIER_STATUS_LABEL(to)}`;
    case "set_estimated":
      return `Date estimée : ${to ? new Date(to).toLocaleDateString("fr-CA") : "—"}`;
    case "add_note":
      return `Note : « ${String(to).slice(0, 60)}${String(to).length > 60 ? "…" : ""} »`;
    case "upload_label":
      return "Étiquette d'expédition téléversée";
    case "update_attachments":
      return `Pièces jointes mises à jour (${to})`;
    case "update_customer":
      return `Client modifié : ${to || "—"}`;
    case "update_field":
      return `${h.field || "champ"} modifié`;
    default:
      return h.action;
  }
}

export function SupplierOrderDetailModal({ order, suppliers, onEdit, onDelete, onClose, showToast }) {
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [labelFile, setLabelFile] = useState(null);
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");
  if (!order) return null;

  const color = STATUS_COLORS[order.status] || "#8E8E93";
  const supplier = suppliers.find((s) => s.id === order.supplierId);
  const history = Array.isArray(order.history) ? [...order.history].reverse() : [];
  const notes = Array.isArray(order.notes) ? order.notes : [];
  const attachments = Array.isArray(order.attachments) ? order.attachments : [];
  const allowedNext = SUPPLIER_TRANSITIONS[order.status] || [];

  const changeStatus = async (to) => {
    if (!to || to === order.status || busy) return;
    setBusy(true);
    try {
      await updateSupplierOrder({ orderId: order.id, patch: { status: to } });
      showToast(`Statut → ${SUPPLIER_STATUS_LABEL(to)}`);
    } catch (err) {
      showToast(err?.message || "Échec du changement de statut.");
    } finally {
      setBusy(false);
    }
  };

  const download = async (path, name) => {
    if (!path) return;
    try {
      const url = await resolveStorageUrl(path);
      window.open(url, "_blank");
    } catch (err) {
      showToast("Impossible d'ouvrir le fichier.");
    }
  };

  // Add an attachment directly from the detail view — no need to open the edit
  // form. Uploads the file, then pushes the full (existing + new) array through
  // the callable so history is attributed to the admin actor.
  const addAttachment = async (file) => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const { path } = await uploadSupplierOrderFile(file, order.supplierId, order.id, "attachments");
      const next = [...attachments, { name: file.name, path, contentType: file.type || "application/octet-stream" }];
      await updateSupplierOrder({ orderId: order.id, patch: { attachments: next } });
      showToast("Pièce jointe ajoutée.");
    } catch (err) {
      showToast(err?.message || "Échec du téléversement.");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (idx) => {
    if (busy) return;
    setBusy(true);
    try {
      const target = attachments[idx];
      if (target?.path) { try { await deleteStorageFile(target.path); } catch { /* best-effort */ } }
      const next = attachments.filter((_, i) => i !== idx);
      await updateSupplierOrder({ orderId: order.id, patch: { attachments: next } });
      showToast("Pièce jointe supprimée.");
    } catch (err) {
      showToast(err?.message || "Échec de la suppression.");
    } finally {
      setBusy(false);
    }
  };

  // Upload a shipping label directly from the detail view — no edit form needed.
  const uploadLabel = async () => {
    if (!labelFile || uploading) return;
    setUploading(true);
    try {
      const { path } = await uploadSupplierOrderFile(labelFile, order.supplierId, order.id, "labels");
      await updateSupplierOrder({ orderId: order.id, patch: { shippingLabel: { path, trackingNumber: tracking.trim() || null } } });
      setLabelFile(null);
      setTracking("");
      showToast("Étiquette téléversée.");
    } catch (err) {
      showToast(err?.message || "Échec du téléversement.");
    } finally {
      setUploading(false);
    }
  };

  const removeLabel = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (order.shippingLabel?.path) { try { await deleteStorageFile(order.shippingLabel.path); } catch { /* best-effort */ } }
      await updateSupplierOrder({ orderId: order.id, patch: { shippingLabel: null } });
      showToast("Étiquette supprimée.");
    } catch (err) {
      showToast(err?.message || "Échec de la suppression.");
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!note.trim() || busy) return;
    setBusy(true);
    try {
      await updateSupplierOrder({ orderId: order.id, patch: { notes: { text: note.trim() } } });
      setNote("");
      showToast("Note ajoutée.");
    } catch (err) {
      showToast(err?.message || "Échec de l'ajout de la note.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxWidth: 640, maxHeight: "92vh", overflowY: "auto", position: "relative" }}>
        <button onClick={onClose} aria-label="Fermer" style={{ position: "absolute", top: 10, right: 12, background: "transparent", border: "none", fontSize: 22, lineHeight: 1, color: "#8E8E93", cursor: "pointer", fontFamily: "inherit", padding: "2px 6px", borderRadius: 6, zIndex: 2 }}>✕</button>
        <div className="handle" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>{order.orderNumber}</h3>
            <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 2 }}>
              {order.productRef}
            </p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "white", background: color, padding: "4px 12px", borderRadius: 10, whiteSpace: "nowrap" }}>
            {SUPPLIER_STATUS_LABEL(order.status)}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label className="lbl" style={{ fontSize: 11 }}>Statut</label>
            <select
              className="inp"
              style={{ minWidth: 200, fontWeight: 600, color }}
              value={order.status}
              disabled={busy}
              onChange={(e) => changeStatus(e.target.value)}
            >
              {SUPPLIER_ORDER_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-outline" style={{ padding: "8px 14px", fontSize: 13, marginTop: 20 }} onClick={() => onEdit(order)}>✏️ Modifier</button>
          <button className="btn btn-outline" style={{ padding: "8px 14px", fontSize: 13, color: "#FF3B30", marginTop: 20 }} onClick={() => onDelete(order)}>🗑️ Supprimer</button>
        </div>

        <Detail title="Client">
          <p style={{ fontSize: 13, color: "#1C1C1E", lineHeight: 1.6 }}>
            <strong>{order.customer?.name || "—"}</strong>
            {order.customer?.phone && <><br />📞 {order.customer.phone}</>}
            {order.customer?.address && <><br />📍 {order.customer.address}</>}
          </p>
        </Detail>

        <Detail title="Fournisseur">
          <p style={{ fontSize: 13, color: "#1C1C1E" }}>
            {supplier?.companyName || order.supplierId || "—"}
            {supplier?.contactName && <span style={{ color: "#8E8E93" }}> · {supplier.contactName}</span>}
            {supplier?.phone && <span style={{ color: "#8E8E93" }}> · {supplier.phone}</span>}
          </p>
        </Detail>

        {order.estimatedCompletionDate && (
          <Detail title="Date estimée">
            <p style={{ fontSize: 13, color: order.estimatedCompletionDate < Date.now() && !["shipped","completed","cancelled"].includes(order.status) ? "#FF3B30" : "#1C1C1E" }}>
              {new Date(order.estimatedCompletionDate).toLocaleDateString("fr-CA")}
            </p>
          </Detail>
        )}

        <Detail title="Étiquette d'expédition">
          {order.shippingLabel?.path ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn btn-outline" style={{ padding: "8px 14px", fontSize: 13, justifyContent: "flex-start", flex: 1 }} onClick={() => download(order.shippingLabel.path)}>
                  📄 Télécharger l'étiquette
                </button>
                <button className="btn btn-outline" style={{ padding: "8px 12px", fontSize: 13, color: "#FF3B30" }} disabled={busy} onClick={removeLabel}>🗑️</button>
              </div>
              {order.shippingLabel?.trackingNumber && (
                <p style={{ fontSize: 12, color: "#34C759" }}>Suivi : {order.shippingLabel.trackingNumber}</p>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "8px 14px", fontSize: 13, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.5 : 1 }}>
                {uploading ? <><span className="sp"/> Téléversement…</> : (labelFile ? labelFile.name : "＋ Téléverser l'étiquette")}
                <input type="file" accept="application/pdf,image/*" style={{ display: "none" }}
                  onChange={(e) => { setLabelFile(e.target.files?.[0] || null); e.target.value = ""; }} />
              </label>
              <input className="inp" placeholder="Numéro de suivi" value={tracking} onChange={(e) => setTracking(e.target.value)} />
              <button className="btn btn-primary" style={{ padding: "8px 14px", fontSize: 13, justifyContent: "center", opacity: labelFile ? 1 : 0.5 }} disabled={!labelFile || uploading} onClick={uploadLabel}>
                Enregistrer l'étiquette
              </button>
            </div>
          )}
        </Detail>

        <Detail title={`Pièces jointes (${attachments.length})`}>
          {attachments.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: attachments.length > 0 ? 10 : 0 }}>
              {attachments.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button className="btn btn-outline" style={{ padding: "8px 12px", fontSize: 13, justifyContent: "flex-start", flex: 1 }} onClick={() => download(a.path, a.name)}>
                    📎 {a.name}
                  </button>
                  <button className="btn btn-outline" style={{ padding: "8px 12px", fontSize: 13, color: "#FF3B30" }} disabled={busy} onClick={() => removeAttachment(i)}>🗑️</button>
                </div>
              ))}
            </div>
          )}
          <label className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "8px 14px", fontSize: 13, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.5 : 1 }}>
            {uploading ? <><span className="sp"/> Téléversement…</> : "＋ Ajouter une pièce jointe"}
            <input type="file" accept="application/pdf,image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) addAttachment(f); e.target.value = ""; }} />
          </label>
        </Detail>

        <Detail title={`Notes (${notes.length})`}>
          {notes.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8E8E93" }}>Aucune note.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notes.map((n, i) => (
                <div key={i} style={{ background: "#F9F9F9", borderRadius: 10, padding: "10px 12px" }}>
                  <p style={{ fontSize: 13, color: "#1C1C1E", lineHeight: 1.5 }}>{n.text}</p>
                  <p style={{ fontSize: 11, color: "#8E8E93", marginTop: 4 }}>
                    {n.authorName || "—"} · {new Date(n.createdAt).toLocaleString("fr-CA")}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input className="inp" placeholder="Ajouter une note…" value={note} onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addNote(); }} />
            <button className="btn btn-primary" style={{ justifyContent: "center", opacity: note.trim() ? 1 : 0.5 }} onClick={addNote} disabled={!note.trim() || busy}>
              Ajouter
            </button>
          </div>
        </Detail>

        <Detail title={`Historique (${history.length})`}>
          {history.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8E8E93" }}>Aucun changement enregistré.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {history.map((h, i) => {
                const isLabelUpload = h.action === "upload_label" && typeof h.to === "string";
                const fileName = isLabelUpload ? (h.to.split("/").pop() || "étiquette") : null;
                return (
                  <div key={i} style={{ fontSize: 12, color: "#3A3A3C", padding: "6px 0", borderBottom: i < history.length - 1 ? "1px solid #F2F2F7" : "none" }}>
                    <strong>{h.actorName || "Système"}</strong> <span style={{ color: "#8E8E93" }}>({h.actorRole})</span> —{" "}
                    {isLabelUpload ? (
                      <>Étiquette d'expédition téléversée :{" "}
                        <a href="#" onClick={(e) => { e.preventDefault(); download(h.to); }} style={{ color: "#007AFF", textDecoration: "underline" }}>
                          {fileName}
                        </a>
                      </>
                    ) : formatHistory(h)}
                    <div style={{ color: "#8E8E93", marginTop: 2 }}>{new Date(h.at).toLocaleString("fr-CA")}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Detail>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

function Detail({ title, children }) {
  return (
    <div style={{ background: "white", border: "1px solid #E5E5EA", borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <h4 style={{ fontSize: 13, fontWeight: 700, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{title}</h4>
      {children}
    </div>
  );
}
