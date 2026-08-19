// src/utils/punchLogic.js
// Pure punch-session logic shared by the punch hook and unit tests.
// Deliberately free of Firebase imports so it can be tested without an
// emulator and reused anywhere.

import { dayStart } from "./helpers.js";

export const ONE_MIN = 60_000;
export const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;
// Hard cap on sessions per user document. Every punch mutation rewrites the
// whole sessions array, so the document must stay well under the 1 MiB
// Firestore limit. Matches the cap enforced in firestore.rules.
export const MAX_SESSIONS = 10000;
export const MAX_NOTE_LEN = 500;

// Firestore Timestamps can come back as objects (with .toMillis() or
// .seconds). Normalize to plain ms numbers so arithmetic is always safe.
export function toMs(val) {
  if (typeof val === "number") return val;
  if (val && typeof val.toMillis === "function") return val.toMillis();
  if (val && typeof val.seconds === "number") return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  return val;
}

// Sanity-check a punch timestamp: finite number, at most 1 minute in the
// future (clock-skew tolerance), at most 1 year in the past.
export function isValidPunchTs(ts, now = Date.now()) {
  return typeof ts === "number" && Number.isFinite(ts) &&
    ts <= now + ONE_MIN && ts >= now - ONE_YEAR;
}

// Clamp a session to the exact schema persisted in Firestore. Anything the
// client sends beyond these fields is dropped before it reaches the database.
export function sanitizeSession(session) {
  const rawOut = session?.punchOut;
  return {
    id: session?.id,
    punchIn: toMs(session?.punchIn),
    punchOut: rawOut == null ? null : toMs(rawOut),
    note: typeof session?.note === "string" ? session.note.slice(0, MAX_NOTE_LEN) : "",
  };
}

// Normalize raw document data into a safe sessions array. A missing or
// non-array `sessions` field becomes an empty array so the write path can
// repair corrupted documents instead of crashing.
export function normalizeSessions(raw) {
  return Array.isArray(raw)
    ? raw.map(s => ({
        ...s,
        punchIn: toMs(s?.punchIn),
        punchOut: s?.punchOut == null ? null : toMs(s.punchOut),
      }))
    : [];
}

// Close sessions left open on a previous day (user forgot to punch out) at
// the end of their start day, so the worked time stays attributed to the
// correct day. Sessions opened today are left alone, and clock-skewed
// punch-ins from the future are left for the open-session guard (closing
// them at `now` would produce punchOut < punchIn).
export function autoCloseOrphans(sessions, now = Date.now()) {
  const todayStart = dayStart(now);
  return sessions.map(s => {
    if (s.punchOut != null || s.punchIn == null) return s;
    const startDay = dayStart(s.punchIn);
    if (startDay === todayStart || s.punchIn > now) return s;
    const orphanDayEnd = startDay + 24 * 60 * 60 * 1000 - 1;
    // punchOut is always strictly after punchIn, even when the session
    // started a millisecond before the day boundary.
    return { ...s, punchOut: Math.max(Math.min(orphanDayEnd, now), s.punchIn + 1) };
  });
}

// First session still open, optionally ignoring one id (e.g. the session
// being updated).
export function findOpenSession(sessions, excludeId = null) {
  return sessions.find(s => s.punchOut == null && s.id !== excludeId) || null;
}

// Find a session overlapping the candidate (excluding one id — itself when
// updating). An open session is treated as the interval [start, ∞).
// Touching intervals (back-to-back sessions) are NOT overlaps.
export function findOverlap(sessions, candidate, excludeId = null) {
  return sessions.find(s => {
    if (s.id === excludeId || s.id === candidate.id) return false;
    if (s.punchIn == null) return false;
    if (s.punchOut == null) {
      // Existing session is open: any candidate ending after it starts.
      return candidate.punchOut == null || candidate.punchOut > s.punchIn;
    }
    if (candidate.punchOut == null) {
      // Candidate is open: overlaps if it starts before the existing end.
      return candidate.punchIn < s.punchOut;
    }
    return candidate.punchIn < s.punchOut && s.punchIn < candidate.punchOut;
  }) || null;
}

// Validate any session about to be persisted (add or update). Returns an
// error code string or null when valid.
export function validateSession(session, now = Date.now()) {
  if (!session || typeof session.id !== "string" || !session.id) {
    return "INVALID_SESSION";
  }
  if (!isValidPunchTs(session.punchIn, now)) {
    return "INVALID_TIMESTAMP";
  }
  if (session.punchOut != null &&
      (!isValidPunchTs(session.punchOut, now) || session.punchOut <= session.punchIn)) {
    return "INVALID_TIMESTAMP";
  }
  return null;
}

// Resolve the clock widget state from the listener's sessions plus an
// optional optimistic override, so the UI flips instantly on click instead
// of waiting for the Firestore round trip.
//
//   optimistic: { mode: "in", session }  — punch-in in flight: the session
//             is treated as active even though the listener hasn't seen it.
//   optimistic: { mode: "out", sessionId } — punch-out in flight: the
//             session is hidden as if already closed.
//
// The override is advisory only: the listener state wins as soon as it
// agrees (the optimistic session appears / the closed session updates),
// and the caller drops the override on error.
export function resolveClockState(sessions, optimistic = null, todayStart = dayStart(Date.now())) {
  const today = (sessions || []).filter(s => dayStart(s.punchIn) === todayStart);
  let activeSess = today.find(s => s.punchOut == null) || null;

  if (optimistic?.mode === "in" && !activeSess) {
    activeSess = optimistic.session;
  } else if (optimistic?.mode === "out" && activeSess?.id === optimistic.sessionId) {
    activeSess = null;
  }

  return {
    todaySessions: today,
    activeSess,
    isClockedIn: !!activeSess,
  };
}

// Collision-proof session id: timestamp base36 + random suffix, so two
// sessions created in the same millisecond still get distinct ids.
export function newPunchId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `P-${Date.now().toString(36).toUpperCase()}-${rand}`;
}
