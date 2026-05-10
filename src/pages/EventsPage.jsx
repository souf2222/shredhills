// src/pages/EventsPage.jsx
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { FilterBar } from "../components/FilterBar";
import { useListFilter } from "../hooks/useListFilter";
import { isEventPast } from "../utils/helpers";
import { EventListView } from "../dashboard/sections/EventListView";
import { EventDetailsModal } from "../dashboard/modals/EventDetailsModal";
import { EventModal } from "../dashboard/modals/EventModal";

export function EventsPage({ events, users, addEvent, updateEvent, deleteEvent, showToast }) {
  const { can, userProfile } = useAuth();
  const canManage = can("canManageEvents");
  const canView   = canManage || can("canViewEvents");
  const canOpen   = canManage || canView;

  const [modal, setModal] = useState(null);
  const [eventStatus, setEventStatus] = useState("all");

  const filter = useListFilter(events, ["title", "location"]);

  const filteredEvents = filter.items.filter(e => {
    if (eventStatus === "all") return true;
    if (eventStatus === "upcoming") return !isEventPast(e);
    if (eventStatus === "past") return isEventPast(e);
    return true;
  });

  const upcomingCount = events.filter(e => !isEventPast(e)).length;
  const pastCount     = events.filter(e => isEventPast(e)).length;

  const handleSave = async (form) => {
    try {
      if (form.id) {
        await updateEvent(form.id, form);
        showToast("Événement mis à jour !");
      } else {
        await addEvent({ ...form, createdBy: userProfile.id });
        showToast("Événement créé !");
      }
      setModal(null);
    } catch (e) {
      showToast("Erreur: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet événement ?")) return;
    try {
      await deleteEvent(id);
      showToast("Événement supprimé.");
      setModal(null);
    } catch (e) {
      showToast("Erreur: " + e.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Événements"
        total={events.length}
        filteredCount={filteredEvents.length}
        search={{ value: filter.text, onChange: filter.setText, placeholder: "Rechercher…" }}
        button={canManage ? { text: "+ Événement", onClick: () => setModal("new") } : null}
        filters={[
          <FilterBar
            key="fb-ev"
            hasFilters={eventStatus !== "all" || filter.isActive}
            onReset={() => { setEventStatus("all"); filter.reset(); }}
            filters={[
              {
                key: "status",
                type: "toggle-group",
                value: eventStatus,
                onChange: setEventStatus,
                options: [
                  { value: "all", label: `Tous (${events.length})`, color: "#6D6D72" },
                  { value: "upcoming", label: `À venir (${upcomingCount})`, color: "#007AFF" },
                  { value: "past", label: `Passés (${pastCount})`, color: "#8E8E93" },
                ],
              },
            ]}
          />,
        ]}
      />

      <EventListView events={filteredEvents} onEdit={setModal} canManage={canOpen}/>

      {modal && (
        canManage ? (
          <EventModal
            event={modal === "new" ? null : modal}
            users={users}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setModal(null)}
            currentUserId={userProfile?.id}
          />
        ) : (
          <EventDetailsModal
            event={modal}
            users={users}
            onClose={() => setModal(null)}
          />
        )
      )}
    </div>
  );
}
