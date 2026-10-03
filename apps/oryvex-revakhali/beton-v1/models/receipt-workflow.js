import { validateReceipt } from "./receipt-model.js";
import { classifyReceipt } from "./classification-model.js";
import { createPourDraft } from "./pour-model.js";

export const QUANTITY_SOURCE = "CONCRETE_SLIPS";

export function buildReceiptWorkflow({
  receipt,
  classification,
  workItem,
  workGroup,
  costCenter,
  projectId,
  companyId
}) {
  const validation = validateReceipt(receipt);

  if (!validation.valid) {
    return {
      ready: false,
      validation,
      quantitySource: QUANTITY_SOURCE
    };
  }

  const classificationResult = classifyReceipt({
    classification,
    workItem,
    workGroup,
    costCenter
  });

  const pour = createPourDraft({
    projectId,
    companyId,
    ...classificationResult,
    slips: [receipt]
  });

  return {
    ready: true,
    validation,
    receipt,
    classification: classificationResult,
    pour,
    quantitySource: QUANTITY_SOURCE,
    persistenceStatus: "READY_FOR_MANUAL_SAVE",
    automaticCariTransfer: false,
    manualFinancialApprovalRequired: true
  };
}
