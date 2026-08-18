import { auditSnapshot, buildAuditEntry, changedFields } from "./audit";

describe("audit helpers", () => {
  it("keeps only changed fields with their previous and new values", () => {
    expect(changedFields(
      { id: "order-1", status: "pending", clientName: "Aster", updatedAt: 1 },
      { id: "order-1", status: "done", clientName: "Aster", updatedAt: 2 }
    )).toEqual({ status: { before: "pending", after: "done" } });
  });

  it("does not store sensitive profile data in snapshots", () => {
    expect(auditSnapshot({ displayName: "Mia", pin: "1234", createdAt: 1 })).toEqual({ displayName: "Mia" });
  });

  it("builds a readable update entry", () => {
    expect(buildAuditEntry({
      action: "update", collectionName: "events", entityId: "event-1",
      actor: { id: "user-1", displayName: "Mia" },
      before: { title: "Spring Jam", location: "Montreal" },
      after: { title: "Spring Jam", location: "Quebec" },
    })).toMatchObject({
      action: "update", entityLabel: "Evenement: Spring Jam", actorName: "Mia",
      changes: { location: { before: "Montreal", after: "Quebec" } },
    });
  });
});
