// src/dashboard/modals/DeletePurchaseModal.jsx
import { Modal } from "../../components/Modal";

export function DeletePurchaseModal({ deletePurchaseModal, onClose, onDelete }) {
  return (
    <Modal open={!!deletePurchaseModal} onClose={onClose} title="Supprimer cette demande ?" maxWidth={420}>
      {deletePurchaseModal && (
        <>
          <p style={{ fontSize:14, marginBottom:10 }}><strong>{deletePurchaseModal.description}</strong></p>
          <p style={{ fontSize:13, color:"#8E8E93", marginBottom:16 }}>{deletePurchaseModal.empName} — {deletePurchaseModal.amount?.toFixed(2)} $</p>
          <p style={{ fontSize:12, color:"#FF3B30", marginBottom:16 }}>⚠️ Action irréversible. La pièce jointe sera aussi supprimée.</p>
          <div style={{ display:"flex", gap:10 }}>
            <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onClose}>Annuler</button>
            <button className="btn btn-soft-red" style={{ flex:1, justifyContent:"center" }} onClick={() => onDelete(deletePurchaseModal)}>Supprimer</button>
          </div>
        </>
      )}
    </Modal>
  );
}
