import { paginate } from "./pagination";

describe("paginate", () => {
  const entries = Array.from({ length: 250 }, (_, i) => i);

  it("slices the requested page", () => {
    const p = paginate(entries, 1, 100, false);
    expect(p.pageEntries).toEqual(entries.slice(0, 100));
    expect(p.totalPages).toBe(3);
    expect(p.hasPrev).toBe(false);
    expect(p.hasNext).toBe(true);
  });

  it("navigates middle pages", () => {
    const p = paginate(entries, 2, 100, false);
    expect(p.pageEntries).toEqual(entries.slice(100, 200));
    expect(p.hasPrev).toBe(true);
    expect(p.hasNext).toBe(true);
  });

  it("shows the remainder on the last page", () => {
    const p = paginate(entries, 3, 100, false);
    expect(p.pageEntries).toEqual(entries.slice(200, 250));
    expect(p.hasPrev).toBe(true);
    expect(p.hasNext).toBe(false);
  });

  it("clamps out-of-range pages back into bounds", () => {
    expect(paginate(entries, 99, 100, false).page).toBe(3);
    expect(paginate(entries, 0, 100, false).page).toBe(1);
  });

  it("keeps next available on the last loaded page when more can be fetched", () => {
    const p = paginate(entries.slice(0, 100), 1, 100, true);
    expect(p.totalPages).toBe(1);
    expect(p.hasNext).toBe(true);
    expect(p.hasPrev).toBe(false);
  });

  it("handles an empty list", () => {
    const p = paginate([], 1, 100, false);
    expect(p.page).toBe(1);
    expect(p.totalPages).toBe(1);
    expect(p.pageEntries).toEqual([]);
    expect(p.hasPrev).toBe(false);
    expect(p.hasNext).toBe(false);
  });
});
