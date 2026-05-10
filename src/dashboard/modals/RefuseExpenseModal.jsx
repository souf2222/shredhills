// src/dashboard/modals/RefuseExpenseModal.jsx
import { Modal } from "../../components/Modal";

export function RefuseExpenseModal({ refuseModal, refuseReason, setRefuseReason, refusing, onRefuse, onClose }) {
  return (
    <Modal open={!!refuseModal} onClose={() => !refusing && onClose()} title="❌ Refuser la demande" maxWidth={460}>
      {refuseModal && (
        <>
          <p style={{ fontSize:13, color:"#8E8E93", marginBottom:16 }}>
            {refuseModal.empName} — <strong>{refuseModal.amount?.toFixed(2)} $</strong>
            {refuseModal.categoryLabel && <> · {refuseModal.categoryEmoji} {refuseModal.categoryLabel}</>}
          </p>
          <label className="lbl">Raison (obligatoire)</label>
          <textarea className="inp" rows={3} placeholder="Ex: Facture illisible, montant incorrect…"
            value={refuseReason} onChange={e => setRefuseReason(e.target.value)} style={{ resize:"none" }} disabled={refusing}/>
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onClose} disabled={refusing}>Annuler</button>
            <button className="btn btn-red" style={{ flex:2, justifyContent:"center", opacity: refuseReason.trim() ? 1 : .5 }}
              onClick={onRefuse} disabled={!refuseReason.trim() || refusing}>
              {refusing ? <><span className="sp"/> …</> : "Confirmer le refus"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
