import {
  createIntegrationEvent
} from "./integration-contract.js";

export function mapConcreteSlipToIntegrationEvent({
  eventId,
  idempotencyKey,
  eventType,
  occurredAt,
  companyId = null,
  projectId,
  projectCode = null,
  slip,
  classification = {},
  cost = null,
  cariStatus = "SINIFLANDIRMA_BEKLIYOR",
  approval = {},
  links = {},
  audit = {}
} = {}) {
  if (!slip?.slipNo) {
    throw new Error(
      "SLIP_NO_REQUIRED"
    );
  }

  return createIntegrationEvent({
    eventId,
    idempotencyKey,
    eventType,
    occurredAt,

    companyId,
    projectId,
    projectCode,

    recordId:
      slip.slipNo,

    recordDate:
      slip.date,

    pourId:
      classification.pourId ??
      slip.pourId ??
      null,

    supplierId:
      slip.supplierId ??
      null,

    supplierCode:
      slip.supplierCode ??
      null,

    supplierName:
      slip.supplierName ??
      slip.supplier ??
      null,

    documentNumber:
      slip.slipNo,

    documentReference:
      slip.documentReference ??
      null,

    documentPhoto:
      slip.photoRef ??
      slip.photo?.path ??
      null,

    quantityM3:
      slip.quantityM3,

    classification:
      classification.scope ??
      slip.classification ??
      "UNCLASSIFIED",

    workGroup:
      classification.workGroup ??
      slip.workGroup ??
      null,

    workItem:
      classification.workItem ??
      slip.workItem ??
      null,

    costCenter:
      classification.costCenter ??
      slip.costCenter ??
      null,

    currency:
      cost?.currency ??
      "TRY",

    unitPrice:
      cost?.unitPrice ??
      null,

    totalAmount:
      cost?.amount ??
      null,

    cariStatus,

    scheduleLink:
      links.scheduleLink ??
      null,

    progressPaymentLink:
      links.progressPaymentLink ??
      null,

    approvalStatus:
      approval.status ??
      "NOT_APPROVED",

    approvedBy:
      approval.approvedBy ??
      null,

    approvedAt:
      approval.approvedAt ??
      null,

    correlationId:
      audit.correlationId ??
      null,

    causationId:
      audit.causationId ??
      null
  });
}
