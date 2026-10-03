import {
  createCariTransferRequest,
  evaluateCariReadiness
} from "./cari-model.js";

export function getCariState(input) {
  return evaluateCariReadiness(input);
}

export async function transferToCari({
  adapter,
  slip,
  classification,
  pourId,
  supplierCode,
  cost,
  projectId,
  companyId,
  approvedByUser
} = {}) {
  if (!adapter) {
    throw new Error("CARI_ADAPTER_REQUIRED");
  }

  const request =
    createCariTransferRequest({
      slip,
      classification,
      pourId,
      supplierCode,
      cost,
      projectId,
      companyId,
      approvedByUser
    });

  return adapter.transfer(request);
}
