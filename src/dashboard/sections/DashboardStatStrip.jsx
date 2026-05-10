// src/dashboard/sections/DashboardStatStrip.jsx
import { useState, useEffect } from "react";
import { fmtMs, fmtHours, fmtTime, dayStart } from "../../utils/helpers";

export function DashboardStatStrip({ events, orders, stops, users, punches, userProfile, addPunchSession, closePunchSession, showToast }) {
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const sessions      = punches[userProfile.id] || [];
  const todayStart_   = dayStart(Date.now());
  const todaySess     = sessions.filter(s => dayStart(s.punchIn) === todayStart_);
  const activeSess    = todaySess.find(s => !s.punchOut) || null;
  const isClockedIn   = !!activeSess;

  const todayDoneMs   = todaySess.filter(s => s.punchOut).reduce((a, s) => a + (s.punchOut - s.punchIn), 0);
  const todayLiveMs   = activeSess ? Date.now() - activeSess.punchIn : 0;

  const punchIn = async () => {
    const session = { id: `P-${Date.now().toString(36).toUpperCase()}`, punchIn: Date.now(), punchOut: null, note: "" };
    await addPunchSession(userProfile.id, session);
    showToast("Punch in !");
  };

  const punchOut_ = async () => {
    if (activeSess) {
      await closePunchSession(userProfile.id, activeSess.id);
      showToast("Pause !");
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0
          }}>
            {isClockedIn ? (
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#34C759", display: "inline-block", animation: "blink 1.2s ease infinite" }} />
            ) : (
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#C7C7CC", display: "inline-block" }} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1C1C1E", whiteSpace: "nowrap" }}>
              {isClockedIn ? "Tu es en service" : "Hors service"}
            </div>
            <div style={{ fontSize: 13, color: "#8E8E93", marginTop: 1 }}>

            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          {isClockedIn && (
            <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, color: "#FF9500", letterSpacing: "-1px" }}>
              {fmtMs(todayLiveMs)}
            </div>
          )}
          <button
            className={isClockedIn ? "btn-clock-out" : "btn-clock-in"}
            onClick={isClockedIn ? punchOut_ : punchIn}
            style={{ padding: "10px 22px", fontSize: 14, borderRadius: 12, boxShadow: "none" }}
          >
            {isClockedIn ? "⏹" : "▶"}
          </button>
        </div>
      </div>
    </div>
  );
}
