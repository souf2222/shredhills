// src/portal/PortalOrderDetail.jsx
import { useState } from "react";
import { updateSupplierOrder, resolveStorageUrl } from "../firebase";
import { SUPPLIER_ORDER_STATUSES, SUPPLIER_STATUS_PORTAL_LABEL, SUPPLIER_ALLOWED_NEXT } from "../dashboard/constants";

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

// Turns a raw history entry into a short, human-readable English line. Storage
// paths and raw status codes are translated so the timeline stays scannable.
function formatHistory(h) {
  const from = h.from, to = h.to;
  switch (h.action) {
    case "status_change":
      return `Status: ${SUPPLIER_STATUS_PORTAL_LABEL(from)} → ${SUPPLIER_STATUS_PORTAL_LABEL(to)}`;
    case "set_estimated":
      return `Estimated date: ${to ? new Date(to).toLocaleDateString("en-CA") : "—"}`;
    case "add_note":
      return `Note: "${String(to).slice(0, 60)}${String(to).length > 60 ? "…" : ""}"`;
    case "upload_label":
      return "Shipping label uploaded";
    case "update_attachments":
      return `Attachments updated (${to})`;
    case "update_customer":
      return `Customer updated: ${to || "—"}`;
    case "update_field":
      return `${h.field || "field"} updated`;
    default:
      return h.action;
  }
}

export function PortalOrderDetail({ order, onClose, onToast }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [estDate, setEstDate] = useState(
    order?.estimatedCompletionDate ? new Date(order.estimatedCompletionDate).toISOString().slice(0, 10) : ""
  );

  if (!order) return null;

  const color = STATUS_COLORS[order.status] || "#8E8E93";
  const allowedNext = SUPPLIER_ALLOWED_NEXT[order.status] || [];
  const canSetEstimate = ["in_production", "ready_to_ship"].includes(order.status);
  const history = Array.isArray(order.history) ? [...order.history].reverse() : [];
  const notes = Array.isArray(order.notes) ? order.notes : [];

  const changeStatus = async (to) => {
    if (!to || to === order.status || busy) return;
    setBusy(true);
    try {
      await updateSupplierOrder({ orderId: order.id, patch: { status: to } });
      onToast(`Status updated to ${SUPPLIER_STATUS_PORTAL_LABEL(to)}`);
    } catch (err) {
      onToast(err?.message || "Could not update status.");
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
      onToast("Note added.");
    } catch (err) {
      onToast(err?.message || "Could not add note.");
    } finally {
      setBusy(false);
    }
  };

  const saveEstimate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ts = estDate ? new Date(estDate).getTime() : null;
      await updateSupplierOrder({ orderId: order.id, patch: { estimatedCompletionDate: ts } });
      onToast("Estimated date saved.");
    } catch (err) {
      onToast(err?.message || "Could not save date.");
    } finally {
      setBusy(false);
    }
  };

  const downloadLabel = async () => {
    if (!order.shippingLabel?.path) return;
    try {
      const url = await resolveStorageUrl(order.shippingLabel.path);
      window.open(url, "_blank");
    } catch (err) {
      onToast("Could not open the label. You may lack access.");
    }
  };

  // Resolve any stored file path (e.g. from history) into a short-lived URL.
  const downloadFile = async (path) => {
    if (!path) return;
    try {
      const url = await resolveStorageUrl(path);
      window.open(url, "_blank");
    } catch (err) {
      onToast("Could not open the file. You may lack access.");
    }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" style={{ maxWidth: 640, maxHeight: "92vh", overflowY: "auto", position: "relative" }}>
        <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 10, right: 12, background: "transparent", border: "none", fontSize: 22, lineHeight: 1, color: "#8E8E93", cursor: "pointer", fontFamily: "inherit", padding: "2px 6px", borderRadius: 6, zIndex: 2 }}>✕</button>
        <div className="handle" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>{order.orderNumber}</h3>
            <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 2 }}>{order.productRef}</p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "white", background: color, padding: "4px 12px", borderRadius: 10, whiteSpace: "nowrap" }}>
            {SUPPLIER_STATUS_PORTAL_LABEL(order.status)}
          </span>
        </div>

        {allowedNext.length > 0 && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="lbl" style={{ fontSize: 11 }}>Status</label>
              <select
                className="inp"
                style={{ minWidth: 200, fontWeight: 600, color }}
                value={order.status}
                disabled={busy}
                onChange={(e) => changeStatus(e.target.value)}
              >
                {SUPPLIER_ORDER_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>{s.portal}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        {order.status === "ready_to_ship" && !order.shippingLabel?.path && (
          <p style={{ fontSize: 12, color: "#FF3B30", marginBottom: 16 }}>
            The shipping label is not available yet. You will be able to mark this as shipped once the label is uploaded.
          </p>
        )}

        {canSetEstimate && (
          <Detail title="Estimated completion date">
            <div style={{ display: "flex", gap: 8 }}>
              <input className="inp" type="date" value={estDate} onChange={(e) => setEstDate(e.target.value)} />
              <button className="btn btn-outline" style={{ justifyContent: "center" }} onClick={saveEstimate} disabled={busy}>
                Save
              </button>
            </div>
          </Detail>
        )}

        <Detail title="Shipping details">
          <p style={{ fontSize: 13, color: "#1C1C1E", lineHeight: 1.6 }}>
            <strong>{order.customer?.name}</strong><br />
            {order.customer?.phone && <>{order.customer.phone}<br /></>}
            {order.customer?.address || "—"}
          </p>
          {order.shippingLabel?.path ? (
            <button className="btn btn-outline" style={{ marginTop: 12, justifyContent: "flex-start" }} onClick={downloadLabel}>
              📄 Download shipping label
            </button>
          ) : (
            <p style={{ fontSize: 12, color: "#8E8E93", marginTop: 8 }}>No shipping label uploaded yet.</p>
          )}
          {order.shippingLabel?.trackingNumber && (
            <p style={{ fontSize: 12, color: "#34C759", marginTop: 8 }}>Tracking: {order.shippingLabel.trackingNumber}</p>
          )}
        </Detail>

        <Detail title={`Notes (${notes.length})`}>
          {notes.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8E8E93" }}>No notes yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notes.map((n, i) => (
                <div key={i} style={{ background: "#F9F9F9", borderRadius: 10, padding: "10px 12px" }}>
                  <p style={{ fontSize: 13, color: "#1C1C1E", lineHeight: 1.5 }}>{n.text}</p>
                  <p style={{ fontSize: 11, color: "#8E8E93", marginTop: 4 }}>
                    {n.authorName || "Unknown"} · {new Date(n.createdAt).toLocaleString("en-CA")}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input className="inp" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addNote(); }} />
            <button className="btn btn-primary" style={{ justifyContent: "center", opacity: note.trim() ? 1 : 0.5 }} onClick={addNote} disabled={!note.trim() || busy}>
              Add
            </button>
          </div>
        </Detail>

        <Detail title={`History (${history.length})`}>
          {history.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8E8E93" }}>No changes recorded.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {history.map((h, i) => {
                const isLabelUpload = h.action === "upload_label" && typeof h.to === "string";
                const fileName = isLabelUpload ? (h.to.split("/").pop() || "label") : null;
                return (
                  <div key={i} style={{ fontSize: 12, color: "#3A3A3C", padding: "6px 0", borderBottom: i < history.length - 1 ? "1px solid #F2F2F7" : "none" }}>
                    <strong>{h.actorName || "System"}</strong> <span style={{ color: "#8E8E93" }}>({h.actorRole})</span> —{" "}
                    {isLabelUpload ? (
                      <>Shipping label uploaded:{" "}
                        <a href="#" onClick={(e) => { e.preventDefault(); downloadFile(h.to); }} style={{ color: "#007AFF", textDecoration: "underline" }}>
                          {fileName}
                        </a>
                      </>
                    ) : formatHistory(h)}
                    <div style={{ color: "#8E8E93", marginTop: 2 }}>{new Date(h.at).toLocaleString("en-CA")}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Detail>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>Close</button>
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
