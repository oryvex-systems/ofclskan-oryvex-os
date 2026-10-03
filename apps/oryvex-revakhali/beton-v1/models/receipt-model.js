export const RECEIPT_REVIEW_STATUS = Object.freeze({
  NEW: "NEW",
  VISION_PENDING: "VISION_PENDING",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  REVIEWED: "REVIEWED",
  READY: "READY"
});

export function normalizeText(value) {
  return String(value ?? "").trim();
}

export function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const normalized = String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createReceiptDraft(input = {}) {
  return {
    id: input.id ?? crypto.randomUUID?.() ?? `receipt-${Date.now()}`,
    slipNo: normalizeText(input.slipNo),
    date: normalizeText(input.date),
    concreteClass: normalizeText(input.concreteClass),
    quantityM3: normalizeNumber(input.quantityM3),
    supplier: normalizeText(input.supplier),
    vehiclePlate: normalizeText(input.vehiclePlate),
    driver: normalizeText(input.driver),
    productionStart: normalizeText(input.productionStart),
    productionFinish: normalizeText(input.productionFinish),
    printedSite: normalizeText(input.printedSite),
    actualSite: normalizeText(input.actualSite),
    rawText: normalizeText(input.rawText),
    photo: input.photo ?? null,
    vision: input.vision ?? null,
    reviewStatus: input.reviewStatus ?? RECEIPT_REVIEW_STATUS.NEW
  };
}

export function validateReceipt(receipt) {
  const errors = [];

  if (!normalizeText(receipt?.slipNo)) errors.push("SLIP_NO_REQUIRED");
  if (!normalizeText(receipt?.date)) errors.push("DATE_REQUIRED");

  const quantity = normalizeNumber(receipt?.quantityM3);
  if (quantity === null || quantity <= 0) errors.push("QUANTITY_REQUIRED");

  if (!normalizeText(receipt?.concreteClass)) errors.push("CONCRETE_CLASS_REQUIRED");

  return {
    valid: errors.length === 0,
    errors
  };
}
