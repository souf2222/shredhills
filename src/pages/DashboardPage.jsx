// src/pages/DashboardPage.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Sidebar } from "../components/Sidebar";
import { Toast } from "../components/Toast";
import { PhotoLightbox } from "../components/PhotoLightbox";
import { CategoriesManager } from "../components/CategoriesManager";

import { EventsPage } from "./EventsPage";
import { SettingsPage } from "./SettingsPage";
import { GestionRoutesSection } from "./GestionRoutesSection";
import { MesRoutesSection } from "./MesRoutesSection";

import { useRoute } from "../hooks/useRoute";

import { DashboardStatStrip } from "../dashboard/sections/DashboardStatStrip";
import { CommandesSection } from "../dashboard/sections/CommandesSection";
import { MaTachesSection } from "../dashboard/sections/MaTachesSection";
import { EquipeSection } from "../dashboard/sections/EquipeSection";
import { ExpensesSubmitView } from "../dashboard/sections/ExpensesSubmitView";
import { ExpensesAdminView } from "../dashboard/sections/ExpensesAdminView";
import { FeuillesTempsSection } from "../dashboard/sections/FeuillesTempsSection";
import { PunchSection } from "../components/PunchSection";

import { UserModal } from "../dashboard/modals/UserModal";
import { OrderModal } from "../dashboard/modals/OrderModal";
import { NewStopModal } from "../dashboard/modals/NewStopModal";
import { EditStopModal } from "../dashboard/modals/EditStopModal";
import { NewExpenseModal } from "../dashboard/modals/NewExpenseModal";
import { RefuseExpenseModal } from "../dashboard/modals/RefuseExpenseModal";
import { DeleteExpenseModal } from "../dashboard/modals/DeleteExpenseModal";

import { useDashboardTabs } from "../hooks/useDashboardTabs";
import { useDashboardTabs } from "../hooks/useDashboardTabs";
import { todayStr, toDateKey, DAY } from "../utils/helpers";

export function DashboardPage({ db: fsData }) {
  const { userProfile, can } = useAuth();
  const {
    users, orders, stops, punches, purchases, events, categories,
    updateUser, deleteUser,
    addOrder, updateOrder, deleteOrder,
    addStop, updateStop, deleteStop,
    addExpense, updateExpense, approveExpense: fsApproveExpense, refuseExpense: fsRefuseExpense, deleteExpense,
    addCategory, updateCategory, deleteCategory,
    addEvent, updateEvent, deleteEvent,
    addPunchSession, closePunchSession, updatePunchSession,
  } = fsData;

  const { section, navigate, replace } = useRoute();
  const [toast, setToast] = useState(null);

  // --- Modals & Forms ---
  const [userModal, setUserModal] = useState(null);
  const [orderModal, setOrderModal] = useState(null);
  const [newStopModal, setNewStopModal] = useState(false);
  const [editStopModal, setEditStopModal] = useState(null);
  const [newStop, setNewStop] = useState({ type:"delivery", clientName:"", clientPhone:"", address:"", instructions:"", assignedTo:"", scheduledDate:null, order:0 });
  const [tourneeDate, setTourneeDate] = useState(() => { const d = new Date(); d.setHours(12,0,0,0); return d; });

  // Filters & search
  const [commandesStatus, setCommandesStatus] = useState("all");
  const [commandesSearch, setCommandesSearch] = useState("");
  const [equipeSearch, setEquipeSearch] = useState("");
  const [equipeRole, setEquipeRole] = useState("all");
  const [dateRange, setDateRange] = useState("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Expense modals
  const [refuseModal, setRefuseModal] = useState(null);
  const [refuseReason, setRefuseReason] = useState("");
  const [refusing, setRefusing] = useState(false);
  const [deleteExpenseModal, setDeleteExpenseModal] = useState(null);
  const [newExpenseModal, setNewExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", categoryId: "", photoFile: null, purchaseDate: todayStr() });
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [categoriesModal, setCategoriesModal] = useState(false);

  const showToast = (m) => setToast(m);

  // Derived
  const employees = users.filter(u => u.jobs?.includes("employee"));
  const drivers   = users.filter(u => u.jobs?.includes("driver"));
  const myOrders  = orders.filter(o => o.assignedTo === userProfile.id);
  const adminActive = orders.filter(o => o.status !== "done");
  const pendingExpenses = purchases.filter(p => p.status === "pending").length;

  // --- Tab builder based on permissions ---
  const tabs = [];
  const pushTab = (id, label) => tabs.push([id, label]);

  if (can("canManageEvents") || can("canViewEvents")) {
    const count = events.filter(e => e.endDate >= Date.now()).length;
    pushTab("evenements", `📅 Événements${count > 0 ? ` (${count})` : ""}`);
  }
  if (can("canManageOrders")) {
    pushTab("commandes", `📦 Commandes${adminActive.length > 0 ? ` (${adminActive.length})` : ""}`);
  }
  if (can("canManageDeliveries")) {
    pushTab("tournees", "🚐 Tournées");
  } else if (userProfile.jobs?.includes("driver")) {
    const myPending = stops.filter(s => s.assignedTo === userProfile.id && s.status !== "completed").length;
    pushTab("tournees", `🚐 Tournée${myPending > 0 ? ` (${myPending})` : ""}`);
  }
  if (can("canViewTasks") && !can("canManageOrders")) {
    pushTab("taches", `📋 Tâches${myOrders.filter(o => o.status !== "done").length > 0 ? ` (${myOrders.filter(o => o.status !== "done").length})` : ""}`);
  }
  if (can("canManageUsers")) {
    pushTab("equipe", "👥 Équipe");
  }
  if (can("canSubmitExpenses")) {
    pushTab("mes-depenses", "🧾 Mes dépenses");
  }
  if (can("canManageExpenses")) {
    pushTab("depenses", `📋 Gestion des dépenses${pendingExpenses > 0 ? ` (${pendingExpenses})` : ""}`);
  }
  if (can("canViewReports")) {
    pushTab("feuilles-de-temps", "⏱️ Feuilles de temps");
  }
  if (can("canClockIn")) {
    pushTab("pointage", "🕐 Pointage");
  }
  pushTab("parametres", "⚙️ Paramètres");

  const tabIds = tabs.map(([id]) => id);
  const tab = tabIds.includes(section) ? section : (tabIds[0] || "");
  useEffect(() => {
    if (tabIds.length > 0 && !tabIds.includes(section)) replace(tabIds[0]);
  }, [section, tabIds.join("|")]); // eslint-disable-line
  const setTab = (id) => navigate(id);

  // --- Event handlers ---
  const handleSaveUser = async (updated) => {
    await updateUser(updated);
    showToast("Utilisateur mis à jour");
  };
  const handleDeleteUser = async (id) => {
    if (!window.confirm("Supprimer ce compte? (Le compte Firebase Auth reste actif mais son profil est effacé)")) return;
    try { await deleteUser(id); showToast("Utilisateur supprimé"); setUserModal(null); }
    catch(e) { showToast("Erreur: "+e.message); }
  };

  const handleSaveOrder = async (form) => {
    try {
      if (form.id) {
        const { id, ...data } = form;
        await updateOrder(id, data);
        showToast("Commande mise à jour !");
      } else {
        await addOrder({
          clientName: form.clientName, clientEmail: form.clientEmail || "",
          description: form.description || "", assignedTo: form.assignedTo,
          status: "pending", startTime: null, endTime: null, elapsed: 0,
          deadline: form.deadline || (Date.now() + 5 * DAY),
          createdBy: userProfile?.id || null,
        });
        showToast("Commande créée !");
      }
      setOrderModal(null);
    } catch (e) { showToast("Erreur: " + e.message); }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm("Supprimer cette commande ?")) return;
    try { await deleteOrder(id); showToast("Commande supprimée"); setOrderModal(null); }
    catch(e) { showToast("Erreur: "+e.message); }
  };

  const reassignOrder = async (oid, newEmp) => {
    await updateOrder(oid, { assignedTo: newEmp });
    showToast("Assigné !");
  };

  const handleAddStop = async () => {
    if (!newStop.clientName || !newStop.address || !newStop.assignedTo) return;
    const driverStops = stops.filter(s => s.assignedTo === newStop.assignedTo && s.status !== "completed");
    const maxOrder = driverStops.length > 0 ? Math.max(...driverStops.map(s => s.order || 0)) : 0;
    await addStop({
      ...newStop, status:"pending", completedAt:null, photoUrl:null, signatureUrl:null,
      note:"", orderId:null, scheduledDate: tourneeDate, order: maxOrder + 1
    });
    setNewStop({ type:"delivery", clientName:"", clientPhone:"", address:"", instructions:"", assignedTo:"", scheduledDate:null, order:0 });
    setNewStopModal(false);
    showToast("Arrêt ajouté !");
  };

  const handleEditStop = async () => {
    if (!editStopModal.clientName || !editStopModal.address) return;
    await updateStop(editStopModal.id, {
      clientName: editStopModal.clientName, clientPhone: editStopModal.clientPhone,
      address: editStopModal.address, instructions: editStopModal.instructions,
      type: editStopModal.type, assignedTo: editStopModal.assignedTo, scheduledDate: editStopModal.scheduledDate
    });
    setEditStopModal(null);
    showToast("Arrêt modifié !");
  };

  const handleDeleteStop = async (id) => {
    if (!window.confirm("Supprimer cet arrêt ?")) return;
    try { await deleteStop(id); showToast("Arrêt supprimé"); }
    catch(e) { showToast("Erreur: "+e.message); }
  };

  const handleMoveStop = async (stopId, direction) => {
    const stop = stops.find(s => s.id === stopId);
    if (!stop || !stop.scheduledDate) return;
    const dateStr = toDateKey(stop.scheduledDate);
    const driverStops = stops.filter(s => s.assignedTo === stop.assignedTo && s.scheduledDate && toDateKey(s.scheduledDate) === dateStr);
    const sorted = [...driverStops].sort((a,b) => (a.order||0) - (b.order||0));
    const idx = sorted.findIndex(s => s.id === stopId);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const swapped = sorted[newIdx];
    const orderA = sorted[idx].order ?? (idx + 1);
    const orderB = swapped.order ?? (newIdx + 1);
    await updateStop(stopId, { order: orderB });
    await updateStop(swapped.id, { order: orderA });
  };

  // Expenses
  const approveExpense = async (id) => {
    try { await fsApproveExpense(id, userProfile?.id || null, userProfile?.displayName || null); showToast("Approuvé"); }
    catch (e) { showToast("Erreur : " + e.message); }
  };
  const refuseExpense = async () => {
    if (!refuseReason.trim() || refusing) return;
    setRefusing(true);
    try {
      await fsRefuseExpense(refuseModal.id, refuseReason.trim(), userProfile?.id || null, userProfile?.displayName || null);
      setRefuseModal(null); setRefuseReason(""); showToast("Refusé");
    } catch (e) { showToast("Erreur : " + e.message); }
    finally { setRefusing(false); }
  };
  const handleDeleteExpense = async (p) => {
    try { await deleteExpense(p.id, p.photoPath); setDeleteExpenseModal(null); showToast("Demande supprimée"); }
    catch (e) { showToast("Erreur : " + e.message); }
  };
  const submitExpense = async () => {
    if (!newExpense.description.trim() || !newExpense.amount) { showToast("Description et montant requis"); return; }
    if (!newExpense.categoryId) { showToast("Choisis une catégorie"); return; }
    if (!newExpense.purchaseDate) { showToast("Choisis une date"); return; }
    const cat = categories.find(c => c.id === newExpense.categoryId);
    const [yy, mm, dd] = newExpense.purchaseDate.split("-").map(Number);
    const purchaseDateMs = new Date(yy, (mm || 1) - 1, dd || 1, 12, 0, 0, 0).getTime();
    setSubmittingExpense(true);
    try {
      await addExpense({
        empId: userProfile.id, empName: userProfile.displayName,
        description: newExpense.description.trim(), amount: parseFloat(newExpense.amount) || 0,
        categoryId: newExpense.categoryId, categoryLabel: cat?.label || "", categoryEmoji: cat?.emoji || "", categoryColor: cat?.color || "#8E8E93",
        status: "pending", photoUrl: null, photoPath: null, approvedAt: null, refusedAt: null,
        refusedReason: "", decidedBy: null, decidedByName: null, purchaseDate: purchaseDateMs,
      }, newExpense.photoFile);
      setNewExpense({ description: "", amount: "", categoryId: "", photoFile: null, purchaseDate: todayStr() });
      setNewExpenseModal(false); showToast("Demande envoyée !");
    } catch (err) { console.error(err); showToast("Erreur d'envoi. Réessaie."); }
    finally { setSubmittingExpense(false); }
  };

  // Task actions for MaTachesSection
  const startOrder = async (id) => {
    await updateOrder(id, { status:"inprogress", startTime:Date.now(), elapsed:0 });
    showToast("⏱ Chrono démarré !");
  };
  const finishOrder = async (id) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const elapsed = order.startTime ? Date.now() - order.startTime + (order.elapsed || 0) : (order.elapsed || 0);
    await updateOrder(id, { status:"done", endTime:Date.now(), elapsed });
    showToast("✅ Commande terminée !");
  };

  return (
    <div className="app-shell">
      <Sidebar
        tabs={tabs}
        active={tab}
        onNavigate={setTab}
        subtitle=""
        badge={pendingExpenses > 0 && can("canManageExpenses") && (
          <div style={{ background:"#FF3B30", color:"white", borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:700 }}>
            {pendingExpenses} demande{pendingExpenses>1?"s":""} en attente
          </div>
        )}
      />

      <div className="app-shell-content">
        {/* Stat strip */}
        <DashboardStatStrip events={events} orders={orders} stops={stops} users={users} punches={punches} userProfile={userProfile} />

        {/* ── CONTENT ── */}
        {tab === "evenements" && (
          <EventsPage events={events} users={users} addEvent={addEvent} updateEvent={updateEvent} deleteEvent={deleteEvent} showToast={showToast}/>
        )}

        {tab === "commandes" && can("canManageOrders") && (
          <CommandesSection
            orders={orders} employees={employees}
            commandesSearch={commandesSearch} setCommandesSearch={setCommandesSearch}
            commandesStatus={commandesStatus} setCommandesStatus={setCommandesStatus}
            onOrderClick={(o) => setOrderModal(o)}
            onReassign={reassignOrder}
            onNewOrder={() => setOrderModal("new")}
          />
        )}

        {tab === "tournees" && can("canManageDeliveries") && (
          <GestionRoutesSection stops={stops} drivers={drivers} addStop={addStop} updateStop={updateStop} deleteStop={deleteStop} showToast={showToast} />
        )}
        {tab === "tournees" && !can("canManageDeliveries") && userProfile.jobs?.includes("driver") && (
          <MesRoutesSection stops={stops} updateStop={updateStop} userProfile={userProfile} showToast={showToast} />
        )}

        {tab === "taches" && can("canViewTasks") && !can("canManageOrders") && (
          <MaTachesSection orders={myOrders} onStart={startOrder} onFinish={finishOrder} />
        )}

        {tab === "equipe" && can("canManageUsers") && (
          <EquipeSection
            users={users} userProfile={userProfile}
            equipeSearch={equipeSearch} setEquipeSearch={setEquipeSearch}
            equipeRole={equipeRole} setEquipeRole={setEquipeRole}
            onUserClick={(u) => setUserModal(u)}
            onNewUser={() => setUserModal("new")}
          />
        )}

        {tab === "mes-depenses" && can("canSubmitExpenses") && (
          <ExpensesSubmitView
            purchases={purchases.filter(p => p.empId === userProfile.id)}
            categories={categories}
            onNewExpense={() => { setNewExpense({ description: "", amount: "", categoryId: "", photoFile: null, purchaseDate: todayStr() }); setNewExpenseModal(true); }}
            onPhotoClick={(url) => setLightboxUrl(url)}
          />
        )}

        {tab === "depenses" && can("canManageExpenses") && (
          <ExpensesAdminView
            purchases={purchases} users={users} categories={categories}
            onApprove={approveExpense}
            onRefuseStart={(p) => { setRefuseModal(p); setRefuseReason(""); }}
            onDelete={(p) => setDeleteExpenseModal(p)}
            onPhotoClick={(url) => setLightboxUrl(url)}
            onManageCategories={() => setCategoriesModal(true)}
          />
        )}

        {tab === "feuilles-de-temps" && can("canViewReports") && (
          <FeuillesTempsSection
            users={users} punches={punches}
            dateRange={dateRange} setDateRange={setDateRange}
            customStart={customStart} setCustomStart={setCustomStart}
            customEnd={customEnd} setCustomEnd={setCustomEnd}
          />
        )}

        {tab === "pointage" && can("canClockIn") && (
          <PunchSection
            userId={userProfile.id}
            punches={punches}
            addPunchSession={addPunchSession}
            closePunchSession={closePunchSession}
            updatePunchSession={updatePunchSession}
            showToast={showToast}
          />
        )}

        {tab === "parametres" && <SettingsPage showToast={showToast}/>}
      </div>

      {/* ── MODALS ── */}
      {userModal && (
        <UserModal user={userModal === "new" ? null : userModal} onSave={handleSaveUser} onDelete={handleDeleteUser}
          onClose={() => setUserModal(null)} currentUserId={userProfile.id} showToast={showToast} />
      )}

      {orderModal && (
        <OrderModal order={orderModal === "new" ? null : orderModal} employees={employees} users={users}
          onSave={handleSaveOrder} onDelete={handleDeleteOrder} onClose={() => setOrderModal(null)} />
      )}

      {newStopModal && (
        <NewStopModal newStop={newStop} setNewStop={setNewStop} drivers={drivers}
          tourneeDate={tourneeDate} setTourneeDate={setTourneeDate}
          onAdd={handleAddStop} onClose={() => setNewStopModal(false)} />
      )}

      {editStopModal && (
        <EditStopModal editStopModal={editStopModal} setEditStopModal={setEditStopModal} drivers={drivers}
          onSave={handleEditStop} onClose={() => setEditStopModal(null)} />
      )}

      <RefuseExpenseModal refuseModal={refuseModal} refuseReason={refuseReason} setRefuseReason={setRefuseReason}
        refusing={refusing} onRefuse={refuseExpense} onClose={() => { setRefuseModal(null); setRefuseReason(""); }} />

      <DeleteExpenseModal deleteExpenseModal={deleteExpenseModal}
        onClose={() => setDeleteExpenseModal(null)} onDelete={handleDeleteExpense} />

      <NewExpenseModal open={newExpenseModal} onClose={() => !submittingExpense && setNewExpenseModal(false)}
        newExpense={newExpense} setNewExpense={setNewExpense} categories={categories}
        onSubmit={submitExpense} submitting={submittingExpense} />

      <CategoriesManager open={categoriesModal} onClose={() => setCategoriesModal(false)} categories={categories}
        addCategory={addCategory} updateCategory={updateCategory} deleteCategory={deleteCategory} showToast={showToast} />

      <PhotoLightbox url={lightboxUrl} alt="Facture" onClose={() => setLightboxUrl(null)} />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
