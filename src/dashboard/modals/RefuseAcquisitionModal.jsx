// src/dashboard/modals/RefuseAcquisitionModal.jsx
import { useState } from "react";
import { Modal } from "../../components/Modal";

export function RefuseAcquisitionModal({ acquisition, onRefuse, onClose }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRefuse = async () => {
    if (!reason.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onRefuse(reason.trim());
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!acquisition) return null;

  return (
    <Modal
      open={!!acquisition}
      onClose={() => !submitting && onClose()}
      title="❌ Refuser la demande"
      footer={
        <>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onClose} disabled={submitting}>
            Annuler
          </button>
          <button className="btn btn-red" style={{ flex: 1, justifyContent: "center", opacity: submitting ? 0.5 : 1 }} onClick={handleRefuse} disabled={submitting || !reason.trim()}>
            {submitting ? <><span className="sp" /> Refus…</> : "Refuser"}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 14, color: "#3A3A3C", marginBottom: 12 }}>
          Demande d'achat: <strong>{acquisition.itemName}</strong> par {acquisition.requesterName}
        </p>
        <label className="lbl">Motif du refus *</label>
        <textarea
          className="inp"
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Indiquez la raison du refus..."
          disabled={submitting}
          style={{ resize: "vertical" }}
        />
      </div>
    </Modal>
  );
}
