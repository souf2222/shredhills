const test = require("node:test");
const assert = require("node:assert/strict");
const { canTransition } = require("./supplierOrders");

test("supplier can move paid -> in_production", () => {
  assert.deepEqual(canTransition("supplier", "paid", "in_production", false), { ok: true });
});

test("supplier cannot move paid straight to shipped", () => {
  const v = canTransition("supplier", "paid", "shipped", true);
  assert.equal(v.ok, false);
  assert.match(v.reason, /Cannot move/);
});

test("admin can move paid -> in_production", () => {
  assert.equal(canTransition("admin", "paid", "in_production", false).ok, true);
});

test("admin cannot move paid straight to shipped (transition graph)", () => {
  assert.equal(canTransition("admin", "paid", "shipped", true).ok, false);
});

test("shipped is blocked when no shipping label exists", () => {
  const v = canTransition("supplier", "ready_to_ship", "shipped", false);
  assert.equal(v.ok, false);
  assert.match(v.reason, /shipping label/);
});

test("shipped is allowed when a shipping label exists", () => {
  assert.equal(canTransition("supplier", "ready_to_ship", "shipped", true).ok, true);
});

test("unknown status is rejected", () => {
  assert.equal(canTransition("admin", "paid", "fantasy", false).ok, false);
});

test("supplier cannot cancel (admin-only transition)", () => {
  assert.equal(canTransition("supplier", "paid", "cancelled", false).ok, false);
});

test("admin can cancel", () => {
  assert.equal(canTransition("admin", "paid", "cancelled", false).ok, true);
});

test("cannot move out of completed", () => {
  assert.equal(canTransition("admin", "completed", "paid", false).ok, false);
});

test("supplier can move paid -> waiting_for_info", () => {
  assert.equal(canTransition("supplier", "paid", "waiting_for_info", false).ok, true);
});

test("supplier can move in_production -> waiting_for_info", () => {
  assert.equal(canTransition("supplier", "in_production", "waiting_for_info", false).ok, true);
});

test("supplier can move ready_to_ship -> waiting_for_info", () => {
  assert.equal(canTransition("supplier", "ready_to_ship", "waiting_for_info", false).ok, true);
});
