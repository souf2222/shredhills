// src/components/PunchSection.jsx
import { useState } from "react";
import {
  fmtHours,
  fmtTime,
  fmtTimeInput,
  dayStart,
  groupByDay,
  DAY,
  getDateRange,
} from "../utils/helpers";
import { PageHeader } from "./PageHeader";
import { FilterBar } from "./FilterBar";

function PunchEditModal({ punch, onSave, onClose }) {
  const [pIn, setPIn] = useState(fmtTimeInput(punch.punchIn));
  const [pOut, setPOut] = useState(punch.punchOut ? fmtTimeInput(punch.punchOut) : "");
  const [note, setNote] = useState(punch.note || "");
  const changed = pIn !== fmtTimeInput(punch.punchIn) || (pOut !== (punch.punchOut ? fmtTimeInput(punch.punchOut) : ""));
  const ok = !changed || note.trim().length > 0;

  const save = () => {
    const ni = new Date(pIn).getTime(),
      no = pOut ? new Date(pOut).getTime() : null;
    if (isNaN(ni) || (no && no <= ni)) return;
    onSave({ ...punch, punchIn: ni, punchOut: no, note });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.4)",
        backdropFilter: "blur(8px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: 28,
          width: 420,
          maxWidth: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,.15)",
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>✏️ Modifier la session</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="lbl">Punch in</label>
            <input type="datetime-local" className="inp" value={pIn} onChange={(e) => setPIn(e.target.value)} />
          </div>
          <div>
            <label className="lbl">Punch out</label>
            <input type="datetime-local" className="inp" value={pOut} onChange={(e) => setPOut(e.target.value)} />
          </div>
          <div>
            <label className="lbl">
              Note {changed && <span style={{ color: "#FF9500" }}>(obligatoire)</span>}
            </label>
            <input className="inp" placeholder="Ex: Oublié de puncher à 8h30…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {changed && !note.trim() && (
            <p style={{ fontSize: 12, color: "#FF9500" }}>⚠️ Note requise pour toute modification.</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-primary" style={{ flex: 2, justifyContent: "center", opacity: ok ? 1 : 0.5 }} onClick={() => ok && save()}>
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}

export function PunchSection({ userId, punches, updatePunchSession, showToast }) {
  const sessions = punches[userId] || [];
  const [editPunch, setEditPunch] = useState(null);
  const [dateRange, setDateRange] = useState("week");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });

  const { start: rangeStart, end: rangeEnd } =
    dateRange === "custom"
      ? {
          start: customRange.from ? new Date(customRange.from).getTime() : 0,
          end: customRange.to ? new Date(customRange.to).getTime() + DAY - 1 : Date.now(),
        }
      : getDateRange(dateRange, customRange.from, customRange.to);

  const filteredSessions = sessions.filter((s) => s.punchIn >= rangeStart && s.punchIn <= rangeEnd);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('fr-FR', { month: 'long' }).replace(/^./, c => c.toUpperCase());
  const hasFilters = dateRange !== "week" || (dateRange === "custom" && (customRange.from || customRange.to));

  const resetFilters = () => {
    setDateRange("week");
    setCustomRange({ from: "", to: "" });
  };

  // ---- Titre dynamique ----
  const pageTitle = "Ma feuille de temps";

  // ---- Résumé stats globales ----
  const todayStart_ = dayStart(Date.now());
  const todaySess   = sessions.filter((s) => dayStart(s.punchIn) === todayStart_);
  const activeSess  = todaySess.find((s) => !s.punchOut) || null;
  const isClockedIn = !!activeSess;

  const todayDoneMs   = todaySess.filter((s) => s.punchOut).reduce((a, s) => a + (s.punchOut - s.punchIn), 0);
  const todayTotalMs  = todayDoneMs + (activeSess ? Date.now() - activeSess.punchIn : 0);

  // ---- Stats basées sur la sélection filtrée ----
  const workedDays = new Set(filteredSessions.map((s) => dayStart(s.punchIn))).size;
  const filteredTotalMs = filteredSessions
    .filter((s) => s.punchOut)
    .reduce((a, s) => a + (s.punchOut - s.punchIn), 0);

  const savePunchEdit = (updated) => {
    updatePunchSession(userId, updated);
    setEditPunch(null);
    showToast && showToast("Session modifiée", "success");
  };

  return (
    <div>
      <PageHeader
        title={pageTitle}
        filteredCount={filteredSessions.length}
        filters={[
          <FilterBar
            key="fb-punch"
            hasFilters={hasFilters}
            onReset={resetFilters}
            filters={[
              {
                key: "period",
                type: "toggle-group",
                value: dateRange,
                onChange: (v) => {
                  setDateRange(v);
                  if (v !== "custom") setCustomRange({ from: "", to: "" });
                },
                options: [
                  { value: "week", label: `Cette semaine`, color: "#007AFF" },
                  { value: "lastWeek", label: `Semaine passée`, color: "#5856D6" },
                  { value: "month", label: currentMonth, color: "#FF9500" },
                  { value: "year", label: currentYear, color: "#34C759" },
                  { value: "custom", label: "Personnalisé", color: "#AF52DE" },
                ],
              },
              ...(dateRange === "custom"
                ? [
                    {
                      key: "custom-range",
                      type: "date-range",
                      value: customRange,
                      onChange: setCustomRange,
                    },
                  ]
                : []),
            ]}
          />,
        ]}
      />

      {/* ---- Résumé triple carte ---- */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Aujourd'hui", val: fmtHours(todayTotalMs), c: isClockedIn ? "#FF9500" : "#34C759" },
          { label: "Jours travaillés", val: workedDays, c: "#007AFF" },
          { label: "Total sélection", val: fmtHours(filteredTotalMs), c: "#6D6D72" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ flex: 1, textAlign: "center", padding: "14px 8px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.c, fontFamily: "monospace" }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "#8E8E93", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ---- Historique filtré ---- */}
      {filteredSessions.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "#8E8E93" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Aucune session trouvée</p>
          <p style={{ fontSize: 13 }}>Essaye un autre filtre ou ajoute un pointage depuis le dashboard.</p>
        </div>
      ) : (
        <div className="card">
          {groupByDay(filteredSessions).map(({ dayTs, sessions: sess, totalMs, hasActive }) => (
            <div key={dayTs} style={{ background: "#F9F9F9", borderRadius: 12, padding: "11px 14px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>
                  {new Date(dayTs + 12 * 60 * 60 * 1000).toLocaleDateString("fr-CA", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 800,
                    color: hasActive ? "#FF9500" : "#007AFF",
                    fontSize: 14,
                  }}
                >
                  {fmtHours(totalMs + (hasActive ? Date.now() - sess.find((s) => !s.punchOut).punchIn : 0))}
                </span>
              </div>
              {sess.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "5px 0",
                    borderBottom: "1px solid #F2F2F7",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#E5E5EA",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#6D6D72",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <span style={{ color: "#3A3A3C" }}>
                      {fmtTime(s.punchIn)}
                      {s.punchOut && <span style={{ color: "#8E8E93" }}> → {fmtTime(s.punchOut)}</span>}
                      {!s.punchOut && <span style={{ color: "#34C759", fontWeight: 600 }}> → en cours</span>}
                    </span>
                    {s.note && (
                      <div style={{ fontSize: 11, color: "#FF9500", marginTop: 1 }}>✏️ {s.note}</div>
                    )}
                  </div>
                  {s.punchOut && (
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#6D6D72",
                        flexShrink: 0,
                      }}
                    >
                      {fmtHours(s.punchOut - s.punchIn)}
                    </span>
                  )}
                  <button
                    className="btn btn-outline"
                    style={{ fontSize: 11, padding: "3px 9px", flexShrink: 0 }}
                    onClick={() => setEditPunch(s)}
                  >
                    Modif.
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {editPunch && <PunchEditModal punch={editPunch} onSave={savePunchEdit} onClose={() => setEditPunch(null)} />}
    </div>
  );
}
