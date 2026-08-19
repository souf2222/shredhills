// functions/supplierOrders.js
// Pure helpers for the supplier-order status model. Kept separate from
// index.js so they can be unit-tested without the Admin SDK.
// MUST stay in sync with the constants in functions/index.js.

const SUPPLIER_STATUSES = [
  "pending",
  "paid",
  "in_production",
  "ready_to_ship",
  "shipped",
  "completed",
  "waiting_for_info",
  "cancelled",
];

const SUPPLIER_TRANSITIONS = {
  pending: ["paid", "waiting_for_info", "cancelled"],
  paid: ["in_production", "waiting_for_info", "cancelled"],
  in_production: ["ready_to_ship", "waiting_for_info", "cancelled"],
  ready_to_ship: ["shipped", "waiting_for_info", "cancelled"],
  shipped: ["completed"],
  completed: [],
  waiting_for_info: ["paid", "in_production", "cancelled"],
  cancelled: [],
};

const SUPPLIER_ALLOWED_NEXT = {
  paid: ["in_production", "waiting_for_info"],
  in_production: ["ready_to_ship", "waiting_for_info"],
  ready_to_ship: ["shipped", "waiting_for_info"],
};

function isValidStatus(status) {
  return SUPPLIER_STATUSES.includes(status);
}

// Can `role` move `from` -> `to`? Throws nothing; returns a verdict object.
function canTransition(role, from, to, hasLabel) {
  if (!isValidStatus(to)) return { ok: false, reason: `Unknown status: ${to}.` };
  const allowed = SUPPLIER_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return { ok: false, reason: `Cannot move from ${from} to ${to}.` };
  }
  if (role === "supplier") {
    const supplierAllowed = SUPPLIER_ALLOWED_NEXT[from] || [];
    if (!supplierAllowed.includes(to)) {
      return { ok: false, reason: "Suppliers may not perform this status change." };
    }
  }
  if (to === "shipped" && !hasLabel) {
    return { ok: false, reason: "A shipping label must be uploaded before an order can ship." };
  }
  return { ok: true };
}

module.exports = {
  SUPPLIER_STATUSES,
  SUPPLIER_TRANSITIONS,
  SUPPLIER_ALLOWED_NEXT,
  isValidStatus,
  canTransition,
};
