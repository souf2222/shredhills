// src/utils/punchLogic.test.js
// Unit tests for the shared punch-session logic used by useFirestore.
// Pure functions — no Firebase emulator required.
import { describe, it, expect } from "vitest";
import { dayStart } from "./helpers";
import {
  ONE_MIN,
  ONE_YEAR,
  MAX_NOTE_LEN,
  toMs,
  isValidPunchTs,
  sanitizeSession,
  normalizeSessions,
  autoCloseOrphans,
  findOpenSession,
  findOverlap,
  validateSession,
  newPunchId,
} from "./punchLogic";

const DAY = 24 * 60 * 60 * 1000;

describe("toMs", () => {
  it("passes numbers through", () => {
    expect(toMs(123456)).toBe(123456);
  });

  it("converts Firestore-like Timestamp objects", () => {
    expect(toMs({ toMillis: () => 789 })).toBe(789);
    expect(toMs({ seconds: 10, nanoseconds: 0 })).toBe(10000);
  });

  it("converts Dates", () => {
    const d = new Date("2026-01-02T03:04:05Z");
    expect(toMs(d)).toBe(d.getTime());
  });

  it("passes unknown values through untouched", () => {
    expect(toMs("nope")).toBe("nope");
    expect(toMs(undefined)).toBe(undefined);
  });
});

describe("isValidPunchTs", () => {
  it("accepts now and slightly-future timestamps (clock skew)", () => {
    const now = Date.now();
    expect(isValidPunchTs(now, now)).toBe(true);
    expect(isValidPunchTs(now + 30_000, now)).toBe(true);
  });

  it("rejects timestamps beyond the 1-minute future tolerance", () => {
    const now = Date.now();
    expect(isValidPunchTs(now + ONE_MIN + 1, now)).toBe(false);
  });

  it("accepts timestamps up to 1 year old and rejects older", () => {
    const now = Date.now();
    expect(isValidPunchTs(now - ONE_YEAR + ONE_MIN, now)).toBe(true);
    expect(isValidPunchTs(now - ONE_YEAR - 1, now)).toBe(false);
  });

  it("rejects non-numbers", () => {
    expect(isValidPunchTs(NaN)).toBe(false);
    expect(isValidPunchTs(Infinity)).toBe(false);
    expect(isValidPunchTs("123")).toBe(false);
    expect(isValidPunchTs(null)).toBe(false);
  });
});

describe("sanitizeSession", () => {
  it("clamps sessions to the persisted schema", () => {
    const out = sanitizeSession({
      id: "P-1", punchIn: 1000, punchOut: 2000, note: "ok",
      injected: "should be dropped",
    });
    expect(out).toEqual({ id: "P-1", punchIn: 1000, punchOut: 2000, note: "ok" });
  });

  it("keeps punchOut null for open sessions", () => {
    expect(sanitizeSession({ id: "P-1", punchIn: 1000, punchOut: null, note: "" }).punchOut).toBeNull();
  });

  it("truncates long notes and coerces non-string notes", () => {
    expect(sanitizeSession({ id: "P-1", punchIn: 1, punchOut: 2, note: "x".repeat(999) }).note).toHaveLength(MAX_NOTE_LEN);
    expect(sanitizeSession({ id: "P-1", punchIn: 1, punchOut: 2, note: 42 }).note).toBe("");
    expect(sanitizeSession({ id: "P-1", punchIn: 1, punchOut: 2 }).note).toBe("");
  });

  it("normalizes Timestamp objects to ms numbers", () => {
    const out = sanitizeSession({ id: "P-1", punchIn: { seconds: 5 }, punchOut: { toMillis: () => 9000 } });
    expect(out.punchIn).toBe(5000);
    expect(out.punchOut).toBe(9000);
  });
});

describe("normalizeSessions", () => {
  it("normalizes every session in the array", () => {
    const out = normalizeSessions([
      { id: "a", punchIn: { seconds: 1 }, punchOut: null },
      { id: "b", punchIn: 5, punchOut: { toMillis: () => 10 } },
    ]);
    expect(out).toEqual([
      { id: "a", punchIn: 1000, punchOut: null },
      { id: "b", punchIn: 5, punchOut: 10 },
    ]);
  });

  it("repairs missing or invalid sessions fields", () => {
    expect(normalizeSessions(undefined)).toEqual([]);
    expect(normalizeSessions(null)).toEqual([]);
    expect(normalizeSessions({ not: "an array" })).toEqual([]);
  });
});

describe("autoCloseOrphans", () => {
  it("closes a session left open on a previous day at that day's end", () => {
    const now = Date.now();
    const yesterday = now - DAY;
    const out = autoCloseOrphans([{ id: "a", punchIn: yesterday, punchOut: null }], now);
    expect(out[0].punchOut).toBe(dayStart(yesterday) + DAY - 1);
  });

  it("leaves today's open session alone", () => {
    const now = Date.now();
    const out = autoCloseOrphans([{ id: "a", punchIn: now - 1000, punchOut: null }], now);
    expect(out[0].punchOut).toBeNull();
  });

  it("leaves already-closed sessions untouched", () => {
    const now = Date.now();
    const out = autoCloseOrphans([{ id: "a", punchIn: now - DAY, punchOut: now - DAY + 1000 }], now);
    expect(out[0].punchOut).toBe(now - DAY + 1000);
  });

  it("closes a skewed future punch-in at now, never after now, and leaves it open when in the future", () => {
    const now = Date.now();
    // A past-day session with punchIn === now exactly at the day boundary:
    // the close time is clamped to stay strictly after punchIn.
    const boundary = dayStart(now) - 1; // last ms of yesterday
    const out = autoCloseOrphans([{ id: "a", punchIn: boundary, punchOut: null }], now);
    expect(out[0].punchOut).toBe(boundary + 1);
    // A punch-in skewed into a future day stays open (closing it at `now`
    // would invert punchOut/punchIn).
    const future = autoCloseOrphans([{ id: "b", punchIn: now + DAY, punchOut: null }], now);
    expect(future[0].punchOut).toBeNull();
  });
});

describe("findOpenSession", () => {
  const sessions = [
    { id: "a", punchIn: 1, punchOut: 2 },
    { id: "b", punchIn: 3, punchOut: null },
  ];

  it("finds the open session", () => {
    expect(findOpenSession(sessions)?.id).toBe("b");
  });

  it("can exclude a session id (self-update case)", () => {
    expect(findOpenSession(sessions, "b")).toBeNull();
  });

  it("returns null when everything is closed", () => {
    expect(findOpenSession([{ id: "a", punchIn: 1, punchOut: 2 }])).toBeNull();
  });
});

describe("findOverlap", () => {
  it("detects overlap between two closed sessions", () => {
    const sessions = [{ id: "a", punchIn: 100, punchOut: 200 }];
    expect(findOverlap(sessions, { id: "b", punchIn: 150, punchOut: 250 })?.id).toBe("a");
  });

  it("does not flag disjoint closed sessions", () => {
    const sessions = [{ id: "a", punchIn: 100, punchOut: 200 }];
    expect(findOverlap(sessions, { id: "b", punchIn: 300, punchOut: 400 })).toBeNull();
  });

  it("treats back-to-back sessions as non-overlapping", () => {
    const sessions = [{ id: "a", punchIn: 100, punchOut: 200 }];
    expect(findOverlap(sessions, { id: "b", punchIn: 200, punchOut: 300 })).toBeNull();
  });

  it("flags a closed candidate that ends after an open session starts", () => {
    const sessions = [{ id: "a", punchIn: 100, punchOut: null }];
    expect(findOverlap(sessions, { id: "b", punchIn: 50, punchOut: 150 })?.id).toBe("a");
  });

  it("allows a closed candidate entirely before an open session", () => {
    const sessions = [{ id: "a", punchIn: 100, punchOut: null }];
    expect(findOverlap(sessions, { id: "b", punchIn: 20, punchOut: 100 })).toBeNull();
  });

  it("flags an open candidate starting before a closed session ends", () => {
    const sessions = [{ id: "a", punchIn: 100, punchOut: 200 }];
    expect(findOverlap(sessions, { id: "b", punchIn: 150, punchOut: null })?.id).toBe("a");
  });

  it("allows an open candidate starting exactly when a closed session ends", () => {
    const sessions = [{ id: "a", punchIn: 100, punchOut: 200 }];
    expect(findOverlap(sessions, { id: "b", punchIn: 200, punchOut: null })).toBeNull();
  });

  it("always flags two open sessions", () => {
    const sessions = [{ id: "a", punchIn: 100, punchOut: null }];
    expect(findOverlap(sessions, { id: "b", punchIn: 500, punchOut: null })?.id).toBe("a");
  });

  it("ignores the excluded id (self-update case) and its own id", () => {
    const sessions = [
      { id: "a", punchIn: 100, punchOut: 200 },
      { id: "b", punchIn: 300, punchOut: 400 },
    ];
    const self = { id: "b", punchIn: 300, punchOut: 400 };
    expect(findOverlap(sessions, self, "b")).toBeNull();
    expect(findOverlap(sessions, self)).toBeNull();
    // Excluding "b" (self-update) must not mask overlaps with other sessions.
    expect(findOverlap(sessions, { id: "c", punchIn: 150, punchOut: 250 }, "b")?.id).toBe("a");
  });
});

describe("validateSession", () => {
  it("accepts a valid open session", () => {
    expect(validateSession({ id: "P-1", punchIn: Date.now(), punchOut: null })).toBeNull();
  });

  it("accepts a valid closed session", () => {
    const now = Date.now();
    expect(validateSession({ id: "P-1", punchIn: now - 3600_000, punchOut: now })).toBeNull();
  });

  it("rejects sessions without a usable id", () => {
    expect(validateSession({ punchIn: Date.now() })).toBe("INVALID_SESSION");
    expect(validateSession({ id: "", punchIn: Date.now() })).toBe("INVALID_SESSION");
    expect(validateSession(null)).toBe("INVALID_SESSION");
  });

  it("rejects punchIn outside the sane window", () => {
    const now = Date.now();
    expect(validateSession({ id: "P-1", punchIn: now + 5 * ONE_MIN, punchOut: null }, now)).toBe("INVALID_TIMESTAMP");
    expect(validateSession({ id: "P-1", punchIn: now - 2 * ONE_YEAR, punchOut: null }, now)).toBe("INVALID_TIMESTAMP");
    expect(validateSession({ id: "P-1", punchIn: "nope", punchOut: null }, now)).toBe("INVALID_TIMESTAMP");
  });

  it("rejects punchOut that is not after punchIn or drifts into the future", () => {
    const now = Date.now();
    expect(validateSession({ id: "P-1", punchIn: now - 1000, punchOut: now - 1000 }, now)).toBe("INVALID_TIMESTAMP");
    expect(validateSession({ id: "P-1", punchIn: now - 1000, punchOut: now - 2000 }, now)).toBe("INVALID_TIMESTAMP");
    expect(validateSession({ id: "P-1", punchIn: now - 1000, punchOut: now + 5 * ONE_MIN }, now)).toBe("INVALID_TIMESTAMP");
  });
});

describe("newPunchId", () => {
  it("generates unique ids even within the same millisecond", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newPunchId()));
    expect(ids.size).toBe(1000);
  });

  it("keeps the P- prefix format", () => {
    expect(newPunchId()).toMatch(/^P-[0-9A-Z]+-[0-9A-Z]{6}$/);
  });
});
