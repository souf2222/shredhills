// src/dashboard/sections/PointageSection.jsx
import { PunchSection as PunchSectionBase } from "../../components/PunchSection";

export function PointageSection({ userId, punches, addPunchSession, closePunchSession, updatePunchSession, showToast }) {
  return (
    <PunchSectionBase
      userId={userId}
      punches={punches}
      addPunchSession={addPunchSession}
      closePunchSession={closePunchSession}
      updatePunchSession={updatePunchSession}
      showToast={showToast}
    />
  );
}
