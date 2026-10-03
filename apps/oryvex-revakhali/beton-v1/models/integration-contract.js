export const INTEGRATION_CONTRACT =
  "oryvex.construction.material.v1";

export const INTEGRATION_SCHEMA_VERSION =
  "1.0";

export const SOURCE_MODULE =
  "beton";

export const EVENT_TYPES = Object.freeze([
  "concrete.slip.created",
  "concrete.slip.classified",
  "concrete.slip.ready_for_cari",
  "concrete.slip.transferred_to_cari",
  "concrete.pour.created",
  "concrete.price.resolved"
]);

const text = value =>
  value === null ||
  value === undefined
    ? null
    : String(value).trim();

const finiteOrNull = value => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : null;
};

function requireText(value, code) {
  const normalized =
    text(value);

  if (!normalized) {
    throw new Error(code);
  }

  return normalized;
}

export function validateIntegrationEvent(event = {}) {
  if (
    event.schemaVersion !==
    INTEGRATION_SCHEMA_VERSION
  ) {
    throw new Error(
      "INTEGRATION_SCHEMA_VERSION_INVALID"
    );
  }

  if (
    event.contract !==
    INTEGRATION_CONTRACT
  ) {
    throw new Error(
      "INTEGRATION_CONTRACT_INVALID"
    );
  }

  requireText(
    event.eventId,
    "EVENT_ID_REQUIRED"
  );

  requireText(
    event.idempotencyKey,
    "IDEMPOTENCY_KEY_REQUIRED"
  );

  if (
    !EVENT_TYPES.includes(
      event.eventType
    )
  ) {
    throw new Error(
      "EVENT_TYPE_INVALID"
    );
  }

  requireText(
    event.occurredAt,
    "OCCURRED_AT_REQUIRED"
  );

  if (
    event.source?.module !==
    SOURCE_MODULE
  ) {
    throw new Error(
      "SOURCE_MODULE_INVALID"
    );
  }

  requireText(
    event.source?.system,
    "SOURCE_SYSTEM_REQUIRED"
  );

  requireText(
    event.project?.projectId,
    "PROJECT_ID_REQUIRED"
  );

  requireText(
    event.record?.id,
    "RECORD_ID_REQUIRED"
  );

  requireText(
    event.record?.date,
    "RECORD_DATE_REQUIRED"
  );

  if (
    !Number.isFinite(
      Number(event.quantity?.value)
    ) ||
    Number(event.quantity?.value) <= 0
  ) {
    throw new Error(
      "QUANTITY_INVALID"
    );
  }

  if (
    event.quantity?.unit !== "m3"
  ) {
    throw new Error(
      "QUANTITY_UNIT_INVALID"
    );
  }

  if (
    event.quantity?.source !==
    "CONCRETE_SLIP"
  ) {
    throw new Error(
      "QUANTITY_SOURCE_INVALID"
    );
  }

  if (
    ![
      "PROJECT",
      "NON_PROJECT",
      "UNCLASSIFIED"
    ].includes(
      event.classification?.scope
    )
  ) {
    throw new Error(
      "CLASSIFICATION_INVALID"
    );
  }

  if (
    event.financial
      ?.automaticCariTransfer !== false
  ) {
    throw new Error(
      "AUTOMATIC_CARI_FORBIDDEN"
    );
  }

  if (
    event.financial
      ?.requiresManualApproval !== true
  ) {
    throw new Error(
      "MANUAL_FINANCIAL_APPROVAL_REQUIRED"
    );
  }

  return true;
}

export function createIntegrationEvent({
  eventId,
  idempotencyKey,
  eventType,
  occurredAt,
  system = "ORYVEX_BETON_TAKIP",
  companyId = null,
  projectId,
  projectCode = null,
  recordId,
  recordDate,
  pourId = null,
  supplierId = null,
  supplierCode = null,
  supplierName = null,
  documentNumber = null,
  documentReference = null,
  documentPhoto = null,
  quantityM3,
  classification = "UNCLASSIFIED",
  workGroup = null,
  workItem = null,
  costCenter = null,
  currency = "TRY",
  unitPrice = null,
  totalAmount = null,
  cariStatus = "SINIFLANDIRMA_BEKLIYOR",
  scheduleLink = null,
  progressPaymentLink = null,
  approvalStatus = "NOT_APPROVED",
  approvedBy = null,
  approvedAt = null,
  correlationId = null,
  causationId = null
} = {}) {
  const event = {
    schemaVersion:
      INTEGRATION_SCHEMA_VERSION,

    contract:
      INTEGRATION_CONTRACT,

    eventId:
      requireText(
        eventId,
        "EVENT_ID_REQUIRED"
      ),

    idempotencyKey:
      requireText(
        idempotencyKey,
        "IDEMPOTENCY_KEY_REQUIRED"
      ),

    eventType,

    occurredAt:
      requireText(
        occurredAt,
        "OCCURRED_AT_REQUIRED"
      ),

    source: {
      module:
        SOURCE_MODULE,
      system:
        requireText(
          system,
          "SOURCE_SYSTEM_REQUIRED"
        )
    },

    project: {
      companyId:
        text(companyId),
      projectId:
        requireText(
          projectId,
          "PROJECT_ID_REQUIRED"
        ),
      projectCode:
        text(projectCode)
    },

    record: {
      id:
        requireText(
          recordId,
          "RECORD_ID_REQUIRED"
        ),
      date:
        requireText(
          recordDate,
          "RECORD_DATE_REQUIRED"
        ),
      pourId:
        text(pourId)
    },

    supplier: {
      id:
        text(supplierId),
      code:
        text(supplierCode),
      name:
        text(supplierName)
    },

    document: {
      number:
        text(documentNumber),
      reference:
        text(documentReference),
      photo:
        text(documentPhoto)
    },

    quantity: {
      value:
        Number(quantityM3),
      unit:
        "m3",
      source:
        "CONCRETE_SLIP"
    },

    classification: {
      scope:
        classification ||
        "UNCLASSIFIED",
      workGroup:
        text(workGroup),
      workItem:
        text(workItem),
      costCenter:
        text(costCenter)
    },

    financial: {
      currency:
        currency || "TRY",
      unitPrice:
        finiteOrNull(unitPrice),
      totalAmount:
        finiteOrNull(totalAmount),

      cariStatus:
        cariStatus ||
        "SINIFLANDIRMA_BEKLIYOR",

      automaticCariTransfer:
        false,

      requiresManualApproval:
        true
    },

    links: {
      scheduleLink:
        text(scheduleLink),
      progressPaymentLink:
        text(progressPaymentLink)
    },

    approval: {
      status:
        approvalStatus ||
        "NOT_APPROVED",
      approvedBy:
        text(approvedBy),
      approvedAt:
        text(approvedAt)
    },

    audit: {
      correlationId:
        text(correlationId),
      causationId:
        text(causationId)
    }
  };

  validateIntegrationEvent(event);

  return event;
}
