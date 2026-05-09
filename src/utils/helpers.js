// src/utils/helpers.js

export const DAY = 86400000;

/** Normalize a Firestore Timestamp or JS date value to a locale date string key. */
export const toDateKey = (dateLike) => {
  const d = dateLike?.toDate ? dateLike.toDate() : new Date(dateLike);
  return d.toDateString();
};

/** Group stops by scheduled date. Returns { stopsByDate: Record<string, Stop[]>, noDateStops: Stop[] }. */
export const groupStopsByDate = (stops) => {
  const stopsByDate = {};
  const noDateStops = [];
  stops.forEach((stop) => {
    if (!stop.scheduledDate) {
      noDateStops.push(stop);
    } else {
      const key = toDateKey(stop.scheduledDate);
      if (!stopsByDate[key]) stopsByDate[key] = [];
      stopsByDate[key].push(stop);
    }
  });
  return { stopsByDate, noDateStops };
};

/** Today's date as YYYY-MM-DD for <input type="date"> defaults. */
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const fmtMs = (ms) => {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2,"0")}m` : `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
};

export const fmtHours = (ms) => {
  if (!ms || ms <= 0) return "0h 00m";
  const h = ms / 3600000;
  return `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2,"0")}m`;
};

export const fmtDate = (ts) =>
  new Date(ts).toLocaleDateString("fr-CA", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });

export const fmtShort = (ts) =>
  new Date(ts).toLocaleDateString("fr-CA", { weekday:"short", month:"short", day:"numeric" });

export const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString("fr-CA", { hour:"2-digit", minute:"2-digit" });

export const fmtTimeInput = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

export const fmtEventDate = (ts) =>
  new Date(ts).toLocaleDateString("fr-CA", { weekday:"short", day:"numeric", month:"short", year:"numeric" });

export const fmtEventTime = (ts) =>
  new Date(ts).toLocaleTimeString("fr-CA", { hour:"2-digit", minute:"2-digit" });

export const daysUntil = (ts) => Math.ceil((ts - Date.now()) / DAY);

export const isEventPast = (e) => {
  if (!e || !e.endDate) return false;
  return e.allDay ? e.endDate + DAY - 1 < Date.now() : e.endDate < Date.now();
};

export const getDL = (deadline) => {
  const diff = deadline - Date.now();
  if (diff <= 0) return { label:"En retard", color:"#FF3B30", urgent:true, overdue:true, days:0, hours:0 };
  const h = diff / 3600000, days = Math.floor(h / 24), hours = Math.floor(h % 24);
  return { label: days > 0 ? `${days}j ${hours}h` : `${hours}h`, color: h < 24 ? "#FF3B30" : h < 48 ? "#FF9500" : "#34C759", urgent: h < 24, overdue: false, days, hours };
};

export const dayStart = (ts) => {
  const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime();
};

export const groupByDay = (sessions) => {
  const map = {};
  sessions.forEach(s => {
    const k = dayStart(s.punchIn);
    if (!map[k]) map[k] = [];
    map[k].push(s);
  });
  return Object.entries(map)
    .sort(([a],[b]) => Number(b) - Number(a))
    .map(([dayTs, sess]) => ({
      dayTs: Number(dayTs),
      sessions: sess.sort((a,b) => a.punchIn - b.punchIn),
      totalMs: sess.reduce((acc,s) => acc + (s.punchOut ? s.punchOut - s.punchIn : 0), 0),
      hasActive: sess.some(s => !s.punchOut),
    }));
};

export const getDateRange = (range, customStart, customEnd) => {
  const now = Date.now(), today = dayStart(now);
  const dayOfWeek = new Date().getDay() || 7;
  if (range === "week") return { start: today - (dayOfWeek - 1) * DAY, end: now };
  if (range === "lastWeek") {
    const s = today - (dayOfWeek - 1 + 7) * DAY;
    return { start: s, end: s + 7 * DAY - 1 };
  }
  if (range === "month") {
    const d = new Date(now); d.setDate(1); d.setHours(0,0,0,0);
    return { start: d.getTime(), end: now };
  }
  if (range === "year") {
    const d = new Date(now); d.setMonth(0, 1); d.setHours(0,0,0,0);
    return { start: d.getTime(), end: now };
  }
  if (range === "year") {
    const d = new Date(now); d.setMonth(0, 1); d.setHours(0,0,0,0);
    return { start: d.getTime(), end: now };
  }
  if (range === "custom" && customStart) {
    const s = new Date(customStart).getTime();
    const e = customEnd ? new Date(customEnd).getTime() + DAY - 1 : s + DAY - 1;
    return { start: s, end: e };
  }
  return { start: today - (dayOfWeek - 1) * DAY, end: now };
};

/** Format a structured address into a single line. */
export const formatAddress = ({ street, city, province, postalCode, country }) => {
  const parts = [street, city, province, postalCode, country].filter(Boolean);
  return parts.join(", ");
};

/** Format a structured address into a short preview (street + city). */
export const formatAddressShort = ({ street, city }) => {
  const parts = [street, city].filter(Boolean);
  return parts.join(", ") || "";
};
