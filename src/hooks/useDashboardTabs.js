// src/hooks/useDashboardTabs.js
import { useEffect, useMemo } from "react";

export function useDashboardTabs({
  userProfile,
  can,
  events,
  orders,
  stops,
  purchases,
  section,
  replace,
}) {
  const activeOrders    = useMemo(() => orders.filter(o => o.status !== "done"), [orders]);
  const myOrders        = useMemo(() => orders.filter(o => o.assignedTo === userProfile.id), [orders, userProfile.id]);
  const pendingExpenses = useMemo(() => purchases.filter(p => p.status === "pending").length, [purchases]);

  const tabs = useMemo(() => {
    const t = [];
    const push = (id, label) => t.push([id, label]);

    if (can("canManageEvents") || can("canViewEvents")) {
      const count = events.filter(e => e.endDate >= Date.now()).length;
      push("evenements", `📅 Événements${count > 0 ? ` (${count})` : ""}`);
    }
    if (can("canManageOrders")) {
      push("commandes", `📦 Commandes${activeOrders.length > 0 ? ` (${activeOrders.length})` : ""}`);
    }
    if (can("canManageDeliveries")) {
      push("tournees", "🚐 Tournées");
    } else if (userProfile.jobs?.includes("driver")) {
      const myPending = stops.filter(s => s.assignedTo === userProfile.id && s.status !== "completed").length;
      push("tournees", `🚐 Tournée${myPending > 0 ? ` (${myPending})` : ""}`);
    }
    if (can("canViewTasks") && !can("canManageOrders")) {
      const active = myOrders.filter(o => o.status !== "done").length;
      push("taches", `📋 Tâches${active > 0 ? ` (${active})` : ""}`);
    }
    if (can("canManageUsers")) push("equipe", "👥 Équipe");
    if (can("canSubmitExpenses")) push("mes-depenses", "🧾 Mes dépenses");
    if (can("canManageExpenses")) {
      push("depenses", `📋 Gestion des dépenses${pendingExpenses > 0 ? ` (${pendingExpenses})` : ""}`);
    }
    if (can("canViewReports")) push("feuilles-de-temps", "⏱️ Feuilles de temps");
    if (can("canClockIn")) push("pointage", "🕐 Pointage");
    push("parametres", "⚙️ Paramètres");

    return t;
  }, [can, events, activeOrders, userProfile, stops, myOrders, pendingExpenses]);

  const tabIds = useMemo(() => tabs.map(([id]) => id), [tabs]);
  const tab = tabIds.includes(section) ? section : (tabIds[0] || "");

  useEffect(() => {
    if (tabIds.length > 0 && !tabIds.includes(section)) replace(tabIds[0]);
  }, [section, tabIds.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { tabs, tab, tabIds };
}
