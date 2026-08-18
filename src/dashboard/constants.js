// src/dashboard/constants.js
// Shared constants, labels and options used across the unified dashboard.

export const PERMISSION_LABELS = {
  canManageUsers:        "Gérer les utilisateurs",
  canManageOrders:       "Gérer les commandes",
  canManageContacts:     "Gérer les contacts",
  canManageEvents:       "Gérer les événements",
  canManageDeliveries:   "Gérer les livraisons",
  canManageExpenses:     "Gérer les dépenses",
  canManageAcquisitions: "Gérer les demandes d'achat",
  canManageReports:      "Gérer les feuilles de temps",
  canManageSupplierOrders: "Gérer les commandes fournisseurs",
  canViewEvents:         "Voir les événements",
  canViewDeliveries:     "Voir mes tournées",
  canViewTasks:          "Voir les tâches",
  canClockIn:            "Ma feuille de temps",
  canSubmitExpenses:     "Soumettre des dépenses",
  canSubmitAcquisitions: "Soumettre des demandes d'achat",
};

// ── Supplier portal ──────────────────────────────────────────────────────
// Status keys are shared between admin and portal UIs and must match the
// transition graph in functions/index.js exactly.
export const SUPPLIER_ORDER_STATUSES = [
  { key: "pending",         label: "En attente",          portal: "Pending" },
  { key: "paid",            label: "Payé",                portal: "Paid" },
  { key: "in_production",   label: "En production",       portal: "In production" },
  { key: "ready_to_ship",   label: "Prêt à expédier",      portal: "Ready to ship" },
  { key: "shipped",         label: "Expédié",             portal: "Shipped" },
  { key: "completed",       label: "Terminé",             portal: "Completed" },
  { key: "waiting_for_info", label: "En attente d'info",  portal: "Waiting for info" },
  { key: "cancelled",       label: "Annulée",             portal: "Cancelled" },
];

export const SUPPLIER_STATUS_LABEL = (key) =>
  (SUPPLIER_ORDER_STATUSES.find(s => s.key === key) || { label: key }).label;

export const SUPPLIER_STATUS_PORTAL_LABEL = (key) =>
  (SUPPLIER_ORDER_STATUSES.find(s => s.key === key) || { portal: key }).portal;

// Valid status transitions. MUST stay in sync with functions/supplierOrders.js.
// Admin may use any transition listed here; suppliers may only use the subset
// in SUPPLIER_ALLOWED_NEXT.
export const SUPPLIER_TRANSITIONS = {
  pending: ["paid", "waiting_for_info", "cancelled"],
  paid: ["in_production", "waiting_for_info", "cancelled"],
  in_production: ["ready_to_ship", "waiting_for_info", "cancelled"],
  ready_to_ship: ["shipped", "waiting_for_info", "cancelled"],
  shipped: ["completed"],
  completed: [],
  waiting_for_info: ["paid", "in_production", "cancelled"],
  cancelled: [],
};

export const SUPPLIER_ALLOWED_NEXT = {
  paid: ["in_production"],
  in_production: ["ready_to_ship"],
  ready_to_ship: ["shipped"],
};

export const COLORS = [
  "#FF6B35","#007AFF","#34C759","#FF9500",
  "#AF52DE","#FF3B30","#00C7BE","#5856D6","#111",
];
