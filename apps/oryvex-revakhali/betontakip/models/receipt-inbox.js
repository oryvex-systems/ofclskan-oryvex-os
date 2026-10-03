export const INBOX_STATUS = Object.freeze({
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  READY_FOR_SAVE: "READY_FOR_SAVE",
  SAVED: "SAVED",
  DUPLICATE: "DUPLICATE",
  REJECTED: "REJECTED"
});

const text = (value) =>
  String(value ?? "").trim();

const number = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) return null;

  const parsed = Number(
    String(value).replace(",", ".")
  );

  return Number.isFinite(parsed)
    ? parsed
    : null;
};

export function normalizeExternalReceipt(input = {}) {
  return {
    id:
      input.id ??
      crypto.randomUUID?.() ??
      `inbox-${Date.now()}`,

    source:
      text(input.source) ||
      "CHATGPT_EXTERNAL",

    projectId: text(input.projectId),
    companyId: text(input.companyId),

    slipNo: text(input.slipNo),
    date: text(input.date),
    concreteClass: text(input.concreteClass),
    quantityM3: number(input.quantityM3),

    supplier: text(input.supplier),
    vehiclePlate: text(input.vehiclePlate),
    driver: text(input.driver),

    customer: text(input.customer),
    printedSite: text(input.printedSite),
    actualSite: text(input.actualSite),

    classification:
      text(input.classification).toUpperCase() ||
      "UNCLASSIFIED",

    workItem: text(input.workItem),
    workGroup: text(input.workGroup),
    costCenter: text(input.costCenter),

    rawNote: text(input.rawNote),

    status: INBOX_STATUS.PENDING_REVIEW,

    automaticCariTransfer: false,
    manualFinancialApprovalRequired: true,

    receivedAt:
      input.receivedAt ??
      new Date().toISOString()
  };
}

export function validateExternalReceipt(receipt) {
  const errors = [];

  if (!text(receipt?.projectId))
    errors.push("PROJECT_REQUIRED");

  if (!text(receipt?.companyId))
    errors.push("COMPANY_REQUIRED");

  if (!text(receipt?.slipNo))
    errors.push("SLIP_NO_REQUIRED");

  if (!text(receipt?.date))
    errors.push("DATE_REQUIRED");

  if (!text(receipt?.concreteClass))
    errors.push("CONCRETE_CLASS_REQUIRED");

  const quantity =
    number(receipt?.quantityM3);

  if (quantity === null || quantity <= 0)
    errors.push("QUANTITY_REQUIRED");

  return {
    valid: errors.length === 0,
    errors
  };
}

export function duplicateKey(receipt) {
  return [
    text(receipt?.projectId),
    text(receipt?.slipNo)
  ].join("::");
}

export function approveExternalReceipt(
  receipt,
  {
    classification,
    workItem,
    workGroup = "",
    costCenter = "",
    explicitApproval = false
  } = {}
) {
  if (!explicitApproval)
    throw new Error(
      "EXPLICIT_USER_APPROVAL_REQUIRED"
    );

  if (
    receipt?.status !==
    INBOX_STATUS.PENDING_REVIEW
  ) {
    throw new Error(
      "RECEIPT_NOT_PENDING_REVIEW"
    );
  }

  const scope =
    text(classification).toUpperCase();

  if (
    scope !== "PROJECT" &&
    scope !== "NON_PROJECT"
  ) {
    throw new Error(
      "CLASSIFICATION_REQUIRED"
    );
  }

  if (!text(workItem))
    throw new Error(
      "WORK_ITEM_REQUIRED"
    );

  return {
    ...receipt,
    classification: scope,
    workItem: text(workItem),
    workGroup: text(workGroup),
    costCenter: text(costCenter),
    status: INBOX_STATUS.READY_FOR_SAVE,
    reviewedAt: new Date().toISOString(),
    explicitUserApproval: true,
    automaticCariTransfer: false
  };
}

export function markDuplicate(receipt) {
  return {
    ...receipt,
    status: INBOX_STATUS.DUPLICATE,
    automaticCariTransfer: false
  };
}
