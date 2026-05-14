// src/dashboard/modals/NewExpenseModal.jsx
import { PhotoUpload } from "../../components/PhotoUpload";

export function NewExpenseModal({
  open,
  onClose,
  newExpense,
  setNewExpense,
  categories,
  onSubmit,
  submitting,
}) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && !submitting && onClose()}>
      <div className="sheet" style={{ maxWidth:520 }}>
        <div className="handle" />
        <h3 style={{ fontSize:20, fontWeight:700, marginBottom:20 }}>🧾 Nouvelle demande</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label className="lbl">Description *</label>
            <input className="inp" placeholder="Encre sérigraphie noire 5L"
              value={newExpense.description}
              onChange={e => setNewExpense(n => ({ ...n, description: e.target.value }))}
              disabled={submitting}
            />
          </div>
          <div>
            <label className="lbl">Montant ($) *</label>
            <input className="inp" type="number" step="0.01" min="0" inputMode="decimal" placeholder="0.00"
              value={newExpense.amount}
              onChange={e => setNewExpense(n => ({ ...n, amount: e.target.value }))}
              disabled={submitting}
            />
          </div>
          <div>
            <label className="lbl">Catégorie *</label>
            {categories.length === 0 ? (
              <p style={{ fontSize:12, color:"#FF9500" }}>Aucune catégorie disponible.</p>
            ) : (
              <select className="sel" value={newExpense.categoryId}
                onChange={e => setNewExpense(n => ({ ...n, categoryId: e.target.value }))}
                disabled={submitting}
              >
                <option value="">— Choisir —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="lbl">Date de la dépense *</label>
            <input className="inp" type="date" value={newExpense.purchaseDate}
              onChange={e => setNewExpense(n => ({ ...n, purchaseDate: e.target.value }))}
              disabled={submitting}
            />
          </div>
          <div>
            <label className="lbl">Preuve de dépense (facture)</label>
            <PhotoUpload value={newExpense.photoFile}
              onChange={(file) => setNewExpense(n => ({ ...n, photoFile: file }))}
              label="📸 Photographier ou joindre la facture"
            />
            <p style={{ fontSize:11, color:"#8E8E93", marginTop:-4 }}>Optionnel mais recommandé pour accélérer l'approbation.</p>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={onClose} disabled={submitting}>Annuler</button>
            <button className="btn btn-primary" style={{ flex:2, justifyContent:"center" }} onClick={onSubmit} disabled={submitting}>
              {submitting ? <><span className="sp"/> Envoi…</> : "Envoyer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
