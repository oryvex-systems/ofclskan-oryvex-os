const text = value =>
  String(value ?? "").trim();

export const AUDIT_RESULT = Object.freeze({
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  DENIED: "DENIED"
});

export function createAuditRecord({
  actor,
  action,
  result,
  entityType = null,
  entityId = null,
  metadata = {},
  occurredAt = null
} = {}) {
  if (!actor?.id) {
    throw new Error("AUDIT_ACTOR_REQUIRED");
  }

  if (!text(action)) {
    throw new Error("AUDIT_ACTION_REQUIRED");
  }

  if (
    !Object.values(AUDIT_RESULT)
      .includes(result)
  ) {
    throw new Error("AUDIT_RESULT_INVALID");
  }

  return Object.freeze({
    schemaVersion: "1.0",
    actor: Object.freeze({
      id: String(actor.id),
      email:
        actor.email
          ? String(actor.email)
          : null
    }),
    action: text(action),
    result,
    entityType:
      entityType
        ? String(entityType)
        : null,
    entityId:
      entityId
        ? String(entityId)
        : null,
    occurredAt:
      occurredAt ??
      new Date().toISOString(),
    metadata:
      Object.freeze({
        ...metadata
      })
  });
}
