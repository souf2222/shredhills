// src/dashboard/constants.js
// Shared constants, labels and options used across the unified dashboard.

export const PERMISSION_LABELS = {
  canManageUsers:        "Gérer les utilisateurs",
  canManageOrders:       "Gérer les commandes",
  canManageEvents:       "Gérer les événements",
  canViewEvents:         "Voir les événements",
  canManagePurchases:    "Approuver les achats",
  canManageDeliveries:   "Gérer les livraisons",
  canViewReports:        "Voir les feuilles de temps",
  canClockIn:            "Pointage (entrée/sortie)",
  canViewTasks:          "Voir les tâches",
  canSubmitPurchases:    "Soumettre des achats",
};

export const JOB_OPTIONS = [
  { id: "employee",   label: "👷 Employé" },
  { id: "driver",     label: "🚐 Livreur" },
  { id: "accountant", label: "📊 Comptable" },
  { id: "admin",      label: "⚙️ Admin" },
];

export const COLORS = [
  "#FF6B35","#007AFF","#34C759","#FF9500",
  "#AF52DE","#FF3B30","#00C7BE","#5856D6","#111",
];

export const DAY = 86400000;
