const test = require("node:test");
const assert = require("node:assert/strict");
const { punchSessionAuditAction } = require("./audit");

test("classifies a removed punch session as a deletion", () => {
  const first = { note: "", punchOut: 1787024615061, punchIn: 1787024604993 };
  const second = { note: "", punchOut: 1787067790222, punchIn: 1787067786472 };

  assert.deepEqual(
    punchSessionAuditAction({ sessions: [first, second] }, { sessions: [first] }),
    { action: "delete", session: second }
  );
});

test("classifies a new punch session as a creation", () => {
  const session = { punchIn: 1787068366791, note: "", punchOut: null };

  assert.deepEqual(
    punchSessionAuditAction({ sessions: [] }, { sessions: [session] }),
    { action: "create", session }
  );
});

test("leaves edited punch sessions as updates", () => {
  const session = { id: "punch-1", punchIn: 1787068366791, note: "", punchOut: null };

  assert.equal(
    punchSessionAuditAction(
      { sessions: [session] },
      { sessions: [{ ...session, punchOut: 1787069000000 }] }
    ),
    null
  );
});
