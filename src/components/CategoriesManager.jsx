// src/components/CategoriesManager.jsx
// CRUD panel for purchase categories. Used from DashboardPage (admin / accountant).
import { useState } from "react";
import { Modal } from "./Modal";

const DEFAULT_COLORS = [
  "#FF6B35", "#007AFF", "#34C759", "#FF9500",
  "#AF52DE", "#FF3B30", "#00C7BE", "#5856D6", "#8E8E93",
];

const EMOJI_SUGGESTIONS = ["⛽","📦","🍔","🔧","🧰","🖨️","🧾","💻","🚗","📎","🧹","📞","🎨","✂️","🪑"];

export function CategoriesManager({
  categories,
  addCategory,
  updateCategory,
  deleteCategory,
  open,
  onClose,
  showToast,
}) {
  const [editing, setEditing] = useState(null); // cat object or null
  const [form, setForm] = useState({ label: "", emoji: "📎", color: "#8E8E93" });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const startCreate = () => {
    setEditing({});
    setForm({ label: "", emoji: "📎", color: "#8E8E93" });
  };

  const startEdit = (cat) => {
    setEditing(cat);
    setForm({ label: cat.label || "", emoji: cat.emoji || "📎", color: cat.color || "#8E8E93" });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ label: "", emoji: "📎", color: "#8E8E93" });
  };

  const save = async () => {
    const label = form.label.trim();
    if (!label) { showToast?.("Le nom est requis"); return; }
    setBusy(true);
    try {
      if (editing?.id) {
        await updateCategory(editing.id, { label, emoji: form.emoji, color: form.color });
        showToast?.("Catégorie modifiée");
      } else {
        const maxOrder = categories.reduce((m, c) => Math.max(m, c.order ?? 0), 0);
        await addCategory({ label, emoji: form.emoji, color: form.color, order: maxOrder + 1 });
        showToast?.("Catégorie ajoutée");
      }
      cancelEdit();
    } catch (err) {
      console.error(err);
      showToast?.("Erreur. Réessaie.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (cat) => {
    setBusy(true);
    try {
      await deleteCategory(cat.id);
      showToast?.("Catégorie supprimée");
      setConfirmDelete(null);
    } catch (err) {
      console.error(err);
      showToast?.("Erreur. Réessaie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="🏷️ Catégories de dépenses" maxWidth={560}>
        <p style={{ fontSize:13, color:"#8E8E93", marginBottom:14 }}>
          Ajoute, modifie ou supprime les catégories disponibles pour les employés lorsqu'ils soumettent une demande.
        </p>

        {!editing && (
          <>
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
              <button className="btn btn-primary" style={{ padding:"8px 14px", fontSize:13 }} onClick={startCreate}>
                + Nouvelle catégorie
              </button>
            </div>

            {categories.length === 0 && (
              <div style={{ textAlign:"center", padding:32, background:"#F9F9FB", borderRadius:14 }}>
                <div style={{ fontSize:34, marginBottom:8 }}>🏷️</div>
                <p style={{ fontWeight:600, fontSize:14 }}>Aucune catégorie</p>
                <p style={{ fontSize:12, color:"#8E8E93", marginTop:4 }}>Commence par en créer une pour que les employés puissent soumettre des demandes.</p>
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {categories.map(cat => (
                <div
                  key={cat.id}
                  style={{
                    display:"flex", alignItems:"center", gap:10,
                    padding:"10px 12px", borderRadius:12,
                    background:`${cat.color || "#8E8E93"}10`,
                    border:`1px solid ${cat.color || "#8E8E93"}25`,
                  }}
                >
                  <span style={{ fontSize:20, flex:"0 0 auto" }}>{cat.emoji || "📎"}</span>
                  <span style={{ flex:1, fontWeight:600, fontSize:14 }}>{cat.label}</span>
                  <button
                    className="btn btn-outline"
                    style={{ padding:"6px 10px", fontSize:12 }}
                    onClick={() => startEdit(cat)}
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    className="btn btn-soft-red"
                    style={{ padding:"6px 10px", fontSize:12 }}
                    onClick={() => setConfirmDelete(cat)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {editing && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label className="lbl">Nom *</label>
              <input
                className="inp"
                placeholder="Essence, Matériel, Repas…"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                autoFocus
                disabled={busy}
              />
            </div>

            <div>
              <label className="lbl">Emoji</label>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <input
                  className="inp"
                  style={{ width:80, textAlign:"center", fontSize:20 }}
                  value={form.emoji}
                  onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                  maxLength={4}
                  disabled={busy}
                />
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, flex:1 }}>
                  {EMOJI_SUGGESTIONS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, emoji: e }))}
                      style={{
                        width:32, height:32, border:"1px solid #E5E5EA", borderRadius:8,
                        background:form.emoji===e?"#E5E5EA":"white", cursor:"pointer",
                        fontSize:16, fontFamily:"inherit",
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="lbl">Couleur</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {DEFAULT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{
                      width:32, height:32, borderRadius:8, cursor:"pointer",
                      background:c,
                      border:form.color===c?"3px solid #000":"3px solid transparent",
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div style={{
              marginTop:4, padding:"10px 12px",
              borderRadius:10, background:`${form.color}14`,
              border:`1px solid ${form.color}30`,
            }}>
              <span style={{ fontSize:12, color:"#8E8E93", marginRight:6 }}>Aperçu :</span>
              <span style={{ fontWeight:700, color:form.color }}>
                {form.emoji} {form.label || "Nom de la catégorie"}
              </span>
            </div>

            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <button
                className="btn btn-outline"
                style={{ flex:1, justifyContent:"center" }}
                onClick={cancelEdit}
                disabled={busy}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                style={{ flex:2, justifyContent:"center" }}
                onClick={save}
                disabled={busy}
              >
                {busy ? <><span className="sp"/> …</> : editing?.id ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => !busy && setConfirmDelete(null)}
        title="Supprimer la catégorie ?"
        maxWidth={400}
      >
        <p style={{ fontSize:14, marginBottom:16 }}>
          Supprimer <strong>{confirmDelete?.emoji} {confirmDelete?.label}</strong> ?
        </p>
        <p style={{ fontSize:12, color:"#8E8E93", marginBottom:16 }}>
          Les demandes existantes qui l'utilisent ne seront pas affectées — elles conserveront leur étiquette de catégorie.
        </p>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-outline" style={{ flex:1, justifyContent:"center" }} onClick={() => setConfirmDelete(null)} disabled={busy}>Annuler</button>
          <button className="btn btn-soft-red" style={{ flex:1, justifyContent:"center" }} onClick={() => remove(confirmDelete)} disabled={busy}>
            {busy ? <><span className="sp"/> …</> : "Supprimer"}
          </button>
        </div>
      </Modal>
    </>
  );
}
