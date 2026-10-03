export function createPourDraft({
  projectId,
  companyId,
  classification,
  workItem,
  workGroup = null,
  costCenter = null,
  slips = []
} = {}) {
  if (!Array.isArray(slips)) throw new Error("SLIPS_MUST_BE_ARRAY");

  const quantityM3 = slips.reduce((total, slip) => {
    const value = Number(slip?.quantityM3 ?? 0);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);

  return {
    type: "CONCRETE_POUR_DRAFT",
    projectId: projectId ?? null,
    companyId: companyId ?? null,
    classification: classification ?? "UNCLASSIFIED",
    workItem: workItem ?? null,
    workGroup,
    costCenter,
    slipNos: slips.map((slip) => slip.slipNo).filter(Boolean),
    quantitySource: "CONCRETE_SLIPS",
    quantityM3,
    status: "DRAFT"
  };
}
