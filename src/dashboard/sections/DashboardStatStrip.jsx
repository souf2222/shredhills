// src/dashboard/sections/DashboardStatStrip.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { fmtMs, dayStart } from "../../utils/helpers";
import { newPunchId, resolveClockState } from "../../utils/punchLogic";

const PUNCH_ERRORS = {
  ALREADY_ACTIVE_SESSION: "Tu es déjà en service",
  INVALID_TIMESTAMP: "Horloge invalide — vérifie la date de ton appareil",
  OVERLAPPING_SESSION: "Chevauchement avec une session existante",
  PUNCH_DOC_FULL: "Historique trop volumineux — contacte un admin",
  SESSION_NOT_FOUND: "Session introuvable",
};

export function DashboardStatStrip({ events, orders, stops, users, punches, userProfile, addPunchSession, closePunchSession, punchesLoading, showToast }) {
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Optimistic punch state: survives until the Firestore listener confirms
  // the write (state agrees) or the transaction fails (rollback). The ref
  // guards against a stale override applied to newer listener data.
  const [optimistic, setOptimistic] = useState(null);
  const [pending, setPending] = useState(null); // "in" | "out" | null
  const seqRef = useRef(0);

  const sessions = punches[userProfile.id] || [];
  const { todaySessions, activeSess, isClockedIn } = resolveClockState(sessions, optimistic);

  const todayDoneMs = todaySessions.filter(s => s.punchOut).reduce((a, s) => a + (s.punchOut - s.punchIn), 0);
  const todayLiveMs = activeSess ? Date.now() - activeSess.punchIn : 0;

  const punchIn = useCallback(async () => {
    if (pending) return;
    const seq = ++seqRef.current;
    const session = { id: newPunchId(), punchIn: Date.now(), punchOut: null, note: "" };
    setPending("in");
    setOptimistic({ mode: "in", session });
    try {
      await addPunchSession(userProfile.id, session);
    } catch (error) {
      if (seqRef.current === seq) setOptimistic(null);
      showToast(PUNCH_ERRORS[error.message] || "Erreur lors du punch in");
      console.error("Punch in error:", error);
    } finally {
      if (seqRef.current === seq) setPending(null);
    }
  }, [pending, userProfile.id, addPunchSession, showToast]);

  const punchOut_ = useCallback(async () => {
    if (pending || !activeSess) return;
    const seq = ++seqRef.current;
    const sessionId = activeSess.id;
    setPending("out");
    setOptimistic({ mode: "out", sessionId });
    try {
      await closePunchSession(userProfile.id, sessionId);
    } catch (err) {
      if (seqRef.current === seq) setOptimistic(null);
      showToast(PUNCH_ERRORS[err.message] || "Erreur lors du punch out");
      console.error("Punch out error:", err);
    } finally {
      if (seqRef.current === seq) setPending(null);
    }
  }, [pending, activeSess, userProfile.id, closePunchSession, showToast]);

  // Listener state has caught up with the override (session appeared /
  // disappeared): drop it so pure listener state rules again.
  useEffect(() => {
    if (!optimistic) return;
    const listenerActive = todaySessions.some(s => s.punchOut == null);
    if (optimistic.mode === "in" && listenerActive) setOptimistic(null);
    if (optimistic.mode === "out" && !listenerActive) setOptimistic(null);
  }, [optimistic, todaySessions]);

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
              {punchesLoading ? "Synchronisation…" : isClockedIn ? "Tu es en service" : "Hors service"}
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
            disabled={!!pending || punchesLoading}
            style={{ padding: "10px 22px", fontSize: 14, borderRadius: 12, boxShadow: "none", opacity: (pending || punchesLoading) ? 0.5 : 1 }}
          >
            {pending || punchesLoading ? "…" : isClockedIn ? "⏹" : "▶"}
          </button>
        </div>
      </div>
    </div>
  );
}
