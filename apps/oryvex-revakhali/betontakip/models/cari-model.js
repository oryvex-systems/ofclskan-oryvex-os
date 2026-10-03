export const CARI_STATUS = Object.freeze({
  CLASSIFICATION_REQUIRED: "SINIFLANDIRMA_BEKLIYOR",
  PRICE_REQUIRED: "FIYAT_BEKLIYOR",
  READY: "CARIYE_HAZIR",
  TRANSFER_PENDING: "AKTARIM_BEKLIYOR",
  TRANSFERRED: "CARIYE_AKTARILDI",
  FAILED: "AKTARIM_HATASI"
});

export function evaluateCariReadiness({
  classification,
  pourId,
  supplierCode,
  cost
} = {}) {
  if (
    !classification ||
    classification === "UNCLASSIFIED" ||
    !pourId
  ) {
    return {
      ready: false,
      status: CARI_STATUS.CLASSIFICATION_REQUIRED,
      reason: "CLASSIFICATION_REQUIRED"
    };
  }

  if (
    !supplierCode ||
    !cost ||
    cost.status !== "PRICED" ||
    !Number.isFinite(Number(cost.amount))
  ) {
    return {
      ready: false,
      status: CARI_STATUS.PRICE_REQUIRED,
      reason: "PRICE_REQUIRED"
    };
  }

  return {
    ready: true,
    status: CARI_STATUS.READY,
    reason: null
  };
}

export function createCariTransferRequest({
  slip,
  classification,
  pourId,
  supplierCode,
  cost,
  projectId,
  companyId,
  approvedByUser
} = {}) {
  const readiness = evaluateCariReadiness({
    classification,
    pourId,
    supplierCode,
    cost
  });

  if (!readiness.ready) {
    throw new Error(readiness.reason);
  }

  if (approvedByUser !== true) {
    throw new Error("EXPLICIT_USER_APPROVAL_REQUIRED");
  }

  if (!slip?.slipNo) {
    throw new Error("SLIP_NO_REQUIRED");
  }

  return {
    schemaVersion: "1.0",
    operation: "CONCRETE_CARI_TRANSFER",
    slipNo: slip.slipNo,
    projectId,
    companyId,
    supplierCode,
    classification,
    pourId,
    quantityM3: Number(slip.quantityM3),
    concreteClass: slip.concreteClass,
    unitPrice: Number(cost.unitPrice),
    amount: Number(cost.amount),
    currency: cost.currency ?? "TRY",
    tariffId: cost.tariffId ?? null,

    approval: {
      explicitUserApproval: true,
      requestedAt: new Date().toISOString()
    },

    automaticTransfer: false
  };
}
