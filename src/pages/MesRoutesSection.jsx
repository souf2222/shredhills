import { fmtTime, groupStopsByDate, DAY } from "../utils/helpers";
import { PageHeader } from "../components/PageHeader";
import { DriverStopCard } from "../components/DriverStopCard";
import { CompletedStopCard } from "../components/CompletedStopCard";

export function MesRoutesSection({ stops, updateStop, userProfile, showToast }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const myStops = stops.filter(s => s.assignedTo === userProfile.id);
  const { stopsByDate, noDateStops } = groupStopsByDate(myStops);

  const sortedDates = Object.keys(stopsByDate).sort((a, b) => new Date(a) - new Date(b));

  const totalPending = myStops.filter(s => s.status === "pending").length;
  const totalDoing = myStops.filter(s => s.status === "doing").length;
  const totalCompleted = myStops.filter(s => s.status === "completed").length;

  return (
    <div>
      <PageHeader title="🚐 Ma tournée" total={myStops.length} />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { label: "À faire", val: totalPending, c: "#AF52DE" },
          { label: "En cours", val: totalDoing, c: "#FF9500" },
          { label: "Complétés", val: totalCompleted, c: "#34C759" },
        ].map(s => (
          <div key={s.label} className="card" style={{ flex: 1, textAlign: "center", padding: "12px 8px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "#8E8E93", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {sortedDates.length === 0 && noDateStops.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚐</div>
          <p style={{ fontWeight: 700, fontSize: 17 }}>Aucun arrêt</p>
        </div>
      )}

      {sortedDates.map(dateKey => {
        const dateStops = [...stopsByDate[dateKey]].sort((a, b) => (a.order || 0) - (b.order || 0));
        const dateObj = new Date(dateKey);
        const dateOnly = new Date(dateObj); dateOnly.setHours(0, 0, 0, 0);
        let dateLabel;
        if (dateOnly.getTime() === today.getTime()) dateLabel = "Aujourd'hui";
        else if (dateOnly.getTime() === today.getTime() + DAY) dateLabel = "Demain";
        else dateLabel = dateObj.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long" });

        const pending = dateStops.filter(s => s.status === "pending");
        const doing = dateStops.filter(s => s.status === "doing");
        const completed = dateStops.filter(s => s.status === "completed");

        return (
          <div key={dateKey} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: "2px solid #E5E5EA" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#1C1C1E" }}>📅 {dateLabel}</span>
              <span style={{ fontSize: 12, color: "#8E8E93" }}>({pending.length} à faire, {doing.length} en cours, {completed.length} fait)</span>
            </div>

            {pending.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p className="sec" style={{ marginBottom: 12 }}>À faire ({pending.length})</p>
                {pending.map((stop, idx) => (
                  <DriverStopCard key={stop.id} stop={stop} index={idx} updateStop={updateStop} showToast={showToast} />
                ))}
              </div>
            )}

            {doing.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p className="sec" style={{ marginBottom: 12, color: "#FF9500" }}>En cours ({doing.length})</p>
                {doing.map(stop => (
                  <DriverStopCard key={stop.id} stop={stop} updateStop={updateStop} showToast={showToast} isDoing />
                ))}
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <p className="sec">Complétés ({completed.length})</p>
                {completed.map(stop => (
                  <CompletedStopCard key={stop.id} stop={stop} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {noDateStops.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "2px dashed #E5E5EA" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#8E8E93", marginBottom: 12 }}>🔲 Sans date ({noDateStops.length})</p>
          {noDateStops.map((stop, idx) => (
            <DriverStopCard key={stop.id} stop={stop} index={idx} updateStop={updateStop} showToast={showToast} />
          ))}
        </div>
      )}
    </div>
  );
}
