// src/dashboard/modals/DeleteExpenseModal.jsx
import { Modal } from "../../components/Modal";

export function DeleteExpenseModal({ deleteExpenseModal, onClose, onDelete }) {
  return (
    <Modal open={!!deleteExpenseModal} onClose={onClose} title="Supprimer cette demande ?" maxWidth={420}>
      {deleteExpenseModal && (
        <>
          <p style={{ fontSize:14, marginBottom:10 }}><strong>{deleteExpenseModal.description}</strong></p>
          <p style={{ fontSize:13, color:"#8E8E93", marginBottom:16 }}>{deleteExpenseModal.empName} — {deleteExpenseModal.amount?.toFixed(2)} $</p>
          <p style={{ fontSize:12, color:"#FF3B30", marginBottom:16 }}>⚠️ Action irréversible. La pièce jointe sera aussi supprimée.</p>
          <div style={{ display:"flex", gap:10 }}>
            <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onClose}>Annuler</button>
            <button className="btn btn-soft-red" style={{ flex:1, justifyContent:"center" }} onClick={() => onDelete(deleteExpenseModal)}>Supprimer</button>
          </div>
        </>
      )}
    </Modal>
  );
}
