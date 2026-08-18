const test = require("node:test");
const assert = require("node:assert/strict");
const { canTransition, defaultDatabases, isKnownDatabase } = require("./supplierOrders");

test("default databases are dev-db and prod", () => {
  assert.deepEqual(defaultDatabases(), ["dev-db", "prod"]);
});

test("isKnownDatabase accepts dev-db and prod", () => {
  assert.equal(isKnownDatabase("dev-db"), true);
  assert.equal(isKnownDatabase("prod"), true);
});

test("isKnownDatabase rejects unknown or non-string ids", () => {
  assert.equal(isKnownDatabase("staging"), false);
  assert.equal(isKnownDatabase(""), false);
  assert.equal(isKnownDatabase(null), false);
  assert.equal(isKnownDatabase(undefined), false);
  assert.equal(isKnownDatabase(123), false);
});

test("isKnownDatabase honors a custom known list", () => {
  assert.equal(isKnownDatabase("eu-west", ["eu-west", "us-east"]), true);
  assert.equal(isKnownDatabase("dev-db", ["eu-west", "us-east"]), false);
});

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
