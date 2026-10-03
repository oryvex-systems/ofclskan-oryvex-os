export const CLASSIFICATION = Object.freeze({
  PROJECT: "PROJECT",
  NON_PROJECT: "NON_PROJECT",
  UNCLASSIFIED: "UNCLASSIFIED"
});

export function normalizeClassification(value) {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (normalized === CLASSIFICATION.PROJECT) return CLASSIFICATION.PROJECT;
  if (normalized === CLASSIFICATION.NON_PROJECT) return CLASSIFICATION.NON_PROJECT;

  return CLASSIFICATION.UNCLASSIFIED;
}

export function classifyReceipt({
  classification,
  workItem = null,
  workGroup = null,
  costCenter = null
} = {}) {
  const normalized = normalizeClassification(classification);

  if (normalized !== CLASSIFICATION.UNCLASSIFIED && !workItem) {
    throw new Error("WORK_ITEM_REQUIRED");
  }

  return {
    classification: normalized,
    workItem,
    workGroup,
    costCenter,
    reviewed: normalized !== CLASSIFICATION.UNCLASSIFIED
  };
}
