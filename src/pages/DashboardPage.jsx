// src/pages/DashboardPage.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useFirestore } from "../hooks/useFirestore";
import { Sidebar } from "../components/Sidebar";
import { Toast } from "../components/Toast";
import { PhotoLightbox } from "../components/PhotoLightbox";
import { CategoriesManager } from "../components/CategoriesManager";
import { Modal } from "../components/Modal";

import { EventsPage } from "./EventsPage";
import { SettingsPage } from "./SettingsPage";
import { GestionRoutesSection } from "./GestionRoutesSection";
import { MesRoutesSection } from "./MesRoutesSection";

import { useRoute } from "../hooks/useRoute";

import { DashboardStatStrip } from "../dashboard/sections/DashboardStatStrip";
import { CommandesSection } from "../dashboard/sections/CommandesSection";
import { ContactsSection } from "../dashboard/sections/ContactsSection";
import { MaTachesSection } from "../dashboard/sections/MaTachesSection";
import { EquipeSection } from "../dashboard/sections/EquipeSection";
import { ExpensesSubmitView } from "../dashboard/sections/ExpensesSubmitView";
import { ExpensesAdminView } from "../dashboard/sections/ExpensesAdminView";
import { FeuillesTempsSection } from "../dashboard/sections/FeuillesTempsSection";
import { PunchSection } from "../components/PunchSection";
import { MesAcquisitionsSection } from "../dashboard/sections/MesAcquisitionsSection";
import { AcquisitionsAdminSection } from "../dashboard/sections/AcquisitionsAdminSection";

import { UserModal } from "../dashboard/modals/UserModal";
import { OrderModal } from "../dashboard/modals/OrderModal";
import { ContactModal } from "../dashboard/modals/ContactModal";
import { NewStopModal } from "../dashboard/modals/NewStopModal";
import { EditStopModal } from "../dashboard/modals/EditStopModal";
import { NewExpenseModal } from "../dashboard/modals/NewExpenseModal";
import { RefuseExpenseModal } from "../dashboard/modals/RefuseExpenseModal";
import { DeleteExpenseModal } from "../dashboard/modals/DeleteExpenseModal";
import { AcquisitionModal } from "../dashboard/modals/AcquisitionModal";
import { RefuseAcquisitionModal } from "../dashboard/modals/RefuseAcquisitionModal";

import { todayStr, toDateKey, DAY } from "../utils/helpers";

export function DashboardPage() {
  const fsData = useFirestore();
  const { userProfile, can } = useAuth();
  const {
    users, orders, stops, punches, purchases, events, categories, contacts, acquisitions,
    updateUser, deleteUser,
    addOrder, updateOrder, deleteOrder,
    addStop, updateStop, deleteStop,
    addExpense, updateExpense, approveExpense: fsApproveExpense, refuseExpense: fsRefuseExpense, deleteExpense,
    addCategory, updateCategory, deleteCategory,
    addEvent, updateEvent, deleteEvent,
    addContact, updateContact, deleteContact,
    addPunchSession, closePunchSession, updatePunchSession, deletePunchSession,
    addAcquisition, updateAcquisition, deleteAcquisition: fsDeleteAcquisition,
    approveAcquisition: fsApproveAcquisition, refuseAcquisition: fsRefuseAcquisition,
    orderAcquisition: fsOrderAcquisition, receiveAcquisition: fsReceiveAcquisition,
  } = fsData;

  const { section, navigate, replace } = useRoute();
  const [toast, setToast] = useState(null);

  // --- Modals & Forms ---
  const [userModal, setUserModal] = useState(null);
  const [contactModal, setContactModal] = useState(null);
  const [orderModal, setOrderModal] = useState(null);
  const [newStopModal, setNewStopModal] = useState(false);
  const [editStopModal, setEditStopModal] = useState(null);
  const [newStop, setNewStop] = useState({ type:"delivery", contactId:null, clientName:"", clientPhone:"", address:"", instructions:"", assignedTo:"", scheduledDate:null, order:0 });
  const [tourneeDate, setTourneeDate] = useState(() => { const d = new Date(); d.setHours(12,0,0,0); return d; });

  // Filters & search
  const [commandesStatus, setCommandesStatus] = useState("all");
  const [commandesSearch, setCommandesSearch] = useState("");
  const [commandesDateRange, setCommandesDateRange] = useState("all");
  const [commandesDateStart, setCommandesDateStart] = useState("");
  const [commandesDateEnd, setCommandesDateEnd] = useState("");
  const [contactsSearch, setContactsSearch] = useState("");
  const [contactsType, setContactsType] = useState("all");
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
  const [deleteContactConfirm, setDeleteContactConfirm] = useState(null);

  // Acquisition modals
  const [acquisitionModal, setAcquisitionModal] = useState(null);
  const [refuseAcquisitionModal, setRefuseAcquisitionModal] = useState(null);
  const [deleteAcquisitionConfirm, setDeleteAcquisitionConfirm] = useState(null);

  const showToast = (m) => setToast(m);

  // Derived
  const employees = users.filter(u => u.permissions?.canViewTasks);
  const drivers   = users.filter(u => u.permissions?.canViewDeliveries || u.permissions?.canManageDeliveries);
  const myOrders  = orders.filter(o => o.assignedTo === userProfile.id);
  const adminActive = orders.filter(o => o.status !== "done");
  const pendingExpenses = purchases.filter(p => p.status === "pending").length;
  const myAcquisitions = acquisitions.filter(a => a.requesterId === userProfile.id);
  const pendingAcquisitions = acquisitions.filter(a => a.status === "pending").length;

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
  if (can("canManageContacts")) {
    pushTab("contacts", `📇 Contacts`);
  }
  if (can("canManageDeliveries")) {
    pushTab("gestion-tournees", "🚐 Gestion des tournées");
  }
  if (can("canViewDeliveries")) {
    const myPending = stops.filter(s => s.assignedTo === userProfile.id && s.status !== "completed" && s.status !== "failed").length;
    pushTab("mes-tournees", `🚐 Mes tournées${myPending > 0 ? ` (${myPending})` : ""}`);
  }
  if (can("canViewTasks") && !can("canManageOrders")) {
    pushTab("taches", `📋 Tâches${myOrders.filter(o => o.status !== "done").length > 0 ? ` (${myOrders.filter(o => o.status !== "done").length})` : ""}`);
  }
  if (can("canClockIn")) {
        pushTab("pointage", "🕐 Ma feuille de temps");
  }
  if (can("canSubmitExpenses")) {
    pushTab("mes-depenses", "🧾 Mes dépenses");
  }
  if (can("canManageExpenses")) {
    pushTab("depenses", `📋 Gestion des dépenses${pendingExpenses > 0 ? ` (${pendingExpenses})` : ""}`);
  }
  if (can("canManageReports")) {
    pushTab("feuilles-de-temps", "⏱️ Gestion des feuilles de temps");
  }
  if (can("canSubmitAcquisitions")) {
    const myPendingAcq = myAcquisitions.filter(a => a.status === "pending").length;
    pushTab("demande-achats",`📦 Demande d'achats${myPendingAcq > 0 ? ` (${myPendingAcq})` : ""}`);
  }
  if (can("canManageAcquisitions")) {
    pushTab("gestion-achats", `📦 Gestion des achats${pendingAcquisitions > 0 ? ` (${pendingAcquisitions})` : ""}`);
  }
  if (can("canManageUsers")) {
    pushTab("equipe", "👥 Équipe");
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

  const handleSaveContact = async (form) => {
    try {
      if (form.id) {
        const { id, ...data } = form;
        await updateContact(id, data);
        showToast("Contact mis à jour !");
      } else {
        await addContact({ ...form, createdBy: userProfile?.id || null });
        showToast("Contact créé !");
      }
      setContactModal(null);
    } catch (e) { showToast("Erreur: " + e.message); }
  };

  const handleDeleteContact = async (id) => {
    setDeleteContactConfirm(id);
  };

  const confirmDeleteContact = async () => {
    if (!deleteContactConfirm) return;
    try {
      await deleteContact(deleteContactConfirm);
      showToast("Contact supprimé");
      setContactModal(null);
    } catch (e) {
      showToast("Erreur: " + e.message);
    } finally {
      setDeleteContactConfirm(null);
    }
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
          contactId: form.contactId || null,
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
    setNewStop({ type:"delivery", contactId:null, clientName:"", clientPhone:"", address:"", instructions:"", assignedTo:"", scheduledDate:null, order:0 });
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

  // Acquisitions
  const submitAcquisition = async (form) => {
    if (!form.itemName.trim()) { showToast("Nom de l'article requis"); return; }
    try {
      await addAcquisition({
        requesterId: userProfile.id,
        requesterName: userProfile.displayName,
        itemName: form.itemName.trim(),
        description: form.description.trim(),
        quantity: form.quantity || 1,
        estimatedCost: form.estimatedCost || null,
        supplierId: form.supplierId || null,
        supplierName: form.supplierName || null,
        urgency: form.urgency || "low",
        status: "pending",
        decidedAt: null,
        decidedBy: null,
        decidedByName: null,
        refusedReason: "",
        orderedAt: null,
        receivedAt: null,
        notes: "",
      });
      setAcquisitionModal(null);
      showToast("Demande d'achat envoyée !");
    } catch (err) {
      console.error(err);
      showToast("Erreur d'envoi. Réessaie.");
    }
  };
  const approveAcquisition = async (id) => {
    try { await fsApproveAcquisition(id, userProfile?.id || null, userProfile?.displayName || null); showToast("Demande approuvée"); }
    catch (e) { showToast("Erreur : " + e.message); }
  };
  const refuseAcquisition = async (reason) => {
    if (!refuseAcquisitionModal) return;
    try {
      await fsRefuseAcquisition(refuseAcquisitionModal.id, reason, userProfile?.id || null, userProfile?.displayName || null);
      setRefuseAcquisitionModal(null);
      showToast("Demande refusée");
    } catch (e) { showToast("Erreur : " + e.message); }
  };
  const handleOrderAcquisition = async (id) => {
    try { await fsOrderAcquisition(id); showToast("Marqué comme commandé"); }
    catch (e) { showToast("Erreur : " + e.message); }
  };
  const handleReceiveAcquisition = async (id) => {
    try { await fsReceiveAcquisition(id); showToast("Marqué comme reçu"); }
    catch (e) { showToast("Erreur : " + e.message); }
  };
  const handleDeleteAcquisition = async (a) => {
    if (!window.confirm("Supprimer cette demande d'achat ?")) return;
    try { await fsDeleteAcquisition(a.id); setDeleteAcquisitionConfirm(null); showToast("Demande d'achat supprimée"); }
    catch (e) { showToast("Erreur : " + e.message); }
  };

  // Task actions for MaTachesSection
  const startOrder = async (id) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    // Prevent starting if another task is already in progress
    const otherInProgress = orders.find(o => o.assignedTo === userProfile.id && o.status === "inprogress" && o.id !== id);
    if (otherInProgress) {
      showToast("⚠️ Une autre tâche est déjà en cours. Mets-la en pause d'abord.");
      return;
    }
    const data = { status: "inprogress" };
    if (order.status === "pending") {
      data.startTime = Date.now();
      data.elapsed = 0;
    } else if (order.status === "paused") {
      // Resume: update startTime so elapsed stays correct
      data.startTime = Date.now();
    }
    await updateOrder(id, data);
    showToast("⏱ Chrono démarré !");
  };
  const pauseOrder = async (id) => {
    const order = orders.find(o => o.id === id);
    if (!order || !order.startTime) return;
    const elapsed = Date.now() - order.startTime + (order.elapsed || 0);
    await updateOrder(id, { status: "paused", elapsed });
    showToast("⏸ Chrono en pause");
  };
  const finishOrder = async (id) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    let elapsed = order.elapsed || 0;
    if (order.startTime && order.status === "inprogress") {
      elapsed = Date.now() - order.startTime + elapsed;
    }
    await updateOrder(id, { status: "done", endTime: Date.now(), elapsed });
    showToast("✅ Commande terminée !");
  };

  return (
    <div className="app-shell">
      <Sidebar
        tabs={tabs}
        active={tab}
        onNavigate={setTab}
        subtitle=""
        badge={(
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pendingExpenses > 0 && can("canManageExpenses") && (
              <div style={{ background:"#FF3B30", color:"white", borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:700 }}>
                {pendingExpenses} dépense{pendingExpenses>1?"s":""} en attente
              </div>
            )}
            {pendingAcquisitions > 0 && can("canManageAcquisitions") && (
              <div style={{ background:"#FF9500", color:"white", borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:700 }}>
                {pendingAcquisitions} demande{pendingAcquisitions>1?"s":""} d'achat en attente
              </div>
            )}
          </div>
        )}
      />

      <div className="app-shell-content">
        {/* Stat strip */}
        {can("canClockIn") && (
          <DashboardStatStrip
            events={events} orders={orders} stops={stops} users={users} punches={punches} userProfile={userProfile}
            addPunchSession={addPunchSession}
            closePunchSession={closePunchSession}
            showToast={showToast}
          />
        )}

        {/* ── CONTENT ── */}
        {tab === "evenements" && (
          <EventsPage events={events} users={users} addEvent={addEvent} updateEvent={updateEvent} deleteEvent={deleteEvent} showToast={showToast}/>
        )}

        {tab === "commandes" && can("canManageOrders") && (
          <CommandesSection
            orders={orders} employees={employees}
            commandesSearch={commandesSearch} setCommandesSearch={setCommandesSearch}
            commandesStatus={commandesStatus} setCommandesStatus={setCommandesStatus}
            commandesDateRange={commandesDateRange} setCommandesDateRange={setCommandesDateRange}
            commandesDateStart={commandesDateStart} setCommandesDateStart={setCommandesDateStart}
            commandesDateEnd={commandesDateEnd} setCommandesDateEnd={setCommandesDateEnd}
            onOrderClick={(o) => setOrderModal(o)}
            onReassign={reassignOrder}
            onNewOrder={() => setOrderModal("new")}
          />
        )}

        {tab === "contacts" && can("canManageContacts") && (
          <ContactsSection
            contacts={contacts}
            search={contactsSearch} setSearch={setContactsSearch}
            typeFilter={contactsType} setTypeFilter={setContactsType}
            onContactClick={(c) => setContactModal(c)}
            onNewContact={() => setContactModal("new")}
          />
        )}

        {tab === "gestion-tournees" && can("canManageDeliveries") && (
          <GestionRoutesSection stops={stops} drivers={drivers} contacts={contacts} addStop={addStop} updateStop={updateStop} deleteStop={deleteStop} showToast={showToast} />
        )}
        {tab === "mes-tournees" && can("canViewDeliveries") && (
          <MesRoutesSection stops={stops} updateStop={updateStop} userProfile={userProfile} showToast={showToast} />
        )}

        {tab === "taches" && can("canViewTasks") && !can("canManageOrders") && (
          <MaTachesSection orders={myOrders} onStart={startOrder} onPause={pauseOrder} onFinish={finishOrder} />
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

        {tab === "feuilles-de-temps" && can("canManageReports") && (
          <FeuillesTempsSection
            users={users} punches={punches}
            dateRange={dateRange} setDateRange={setDateRange}
            customStart={customStart} setCustomStart={setCustomStart}
            customEnd={customEnd} setCustomEnd={setCustomEnd}
            updatePunchSession={updatePunchSession}
            deletePunchSession={deletePunchSession}
            showToast={showToast}
          />
        )}

        {tab === "pointage" && can("canClockIn") && (
          <PunchSection
            userId={userProfile.id}
            punches={punches}
            updatePunchSession={updatePunchSession}
            deletePunchSession={deletePunchSession}
            showToast={showToast}
          />
        )}

        {tab === "demande-achats" && can("canSubmitAcquisitions") && (
          <MesAcquisitionsSection
            acquisitions={myAcquisitions}
            onNewAcquisition={() => setAcquisitionModal("new")}
            onAcquisitionClick={(a) => setAcquisitionModal(a)}
          />
        )}

        {tab === "gestion-achats" && can("canManageAcquisitions") && (
          <AcquisitionsAdminSection
            acquisitions={acquisitions}
            users={users}
            onAcquisitionClick={(a) => setAcquisitionModal(a)}
            onApprove={approveAcquisition}
            onRefuseStart={(a) => setRefuseAcquisitionModal(a)}
            onOrder={handleOrderAcquisition}
            onReceive={handleReceiveAcquisition}
            onDelete={(a) => setDeleteAcquisitionConfirm(a)}
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
        <OrderModal order={orderModal === "new" ? null : orderModal} employees={employees} users={users} contacts={contacts}
          onSave={handleSaveOrder} onDelete={handleDeleteOrder} onClose={() => setOrderModal(null)} />
      )}

      {contactModal && (
        <ContactModal contact={contactModal === "new" ? null : contactModal} users={users}
          onSave={handleSaveContact} onDelete={handleDeleteContact} onClose={() => setContactModal(null)} />
      )}

      <Modal
        open={!!deleteContactConfirm}
        onClose={() => setDeleteContactConfirm(null)}
        title="🗑️ Supprimer ce contact ?"
        footer={
          <>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setDeleteContactConfirm(null)}>
              Annuler
            </button>
            <button className="btn btn-red" style={{ flex: 1, justifyContent: "center" }} onClick={confirmDeleteContact}>
              Supprimer
            </button>
          </>
        }
      >
        <p style={{ color: "#3A3A3C", lineHeight: 1.5 }}>
          Les commandes et livraisons liées conserveront son nom, mais ne seront plus liées à un contact.
        </p>
      </Modal>

      {newStopModal && (
        <NewStopModal newStop={newStop} setNewStop={setNewStop} drivers={drivers} contacts={contacts}
          tourneeDate={tourneeDate} setTourneeDate={setTourneeDate}
          onAdd={handleAddStop} onClose={() => setNewStopModal(false)} />
      )}

      {editStopModal && (
        <EditStopModal editStopModal={editStopModal} setEditStopModal={setEditStopModal} drivers={drivers} contacts={contacts}
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

      <AcquisitionModal
        open={!!acquisitionModal}
        onClose={() => setAcquisitionModal(null)}
        onSubmit={submitAcquisition}
        contacts={contacts}
        initialData={acquisitionModal && acquisitionModal !== "new" ? acquisitionModal : null}
      />

      <RefuseAcquisitionModal
        acquisition={refuseAcquisitionModal}
        onRefuse={refuseAcquisition}
        onClose={() => setRefuseAcquisitionModal(null)}
      />

      <Modal
        open={!!deleteAcquisitionConfirm}
        onClose={() => setDeleteAcquisitionConfirm(null)}
        title="🗑️ Supprimer cette demande d'achat ?"
        footer={
          <>
            <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => setDeleteAcquisitionConfirm(null)}>
              Annuler
            </button>
            <button className="btn btn-red" style={{ flex: 1, justifyContent: "center" }} onClick={() => handleDeleteAcquisition(deleteAcquisitionConfirm)}>
              Supprimer
            </button>
          </>
        }
      >
        <p style={{ color: "#3A3A3C", lineHeight: 1.5 }}>
          La demande d'achat pour <strong>{deleteAcquisitionConfirm?.itemName}</strong> sera définitivement supprimée.
        </p>
      </Modal>

      <PhotoLightbox url={lightboxUrl} alt="Facture" onClose={() => setLightboxUrl(null)} />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
