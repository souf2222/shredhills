// src/components/ExpenseStatusBadge.jsx
export function ExpenseStatusBadge({ status }) {
  const config = {
    approved: { cls: "ba", label: "✅ Approuvé" },
    refused:  { cls: "br", label: "❌ Refusé" },
    pending:  { cls: "bw", label: "⏳ En attente" },
  };
  const { cls, label } = config[status] || config.pending;
  return <span className={`badge ${cls}`}>{label}</span>;
}
