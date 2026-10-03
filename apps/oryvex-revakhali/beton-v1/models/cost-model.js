export function calculateConcreteCost({
  quantityM3,
  tariff
} = {}) {
  const quantity = Number(quantityM3);

  if (!Number.isFinite(quantity) || quantity <= 0)
    throw new Error("QUANTITY_INVALID");

  if (!tariff) {
    return {
      status: "PRICE_REQUIRED",
      quantityM3: quantity,
      unitPrice: null,
      amount: null,
      currency: null,
      tariffId: null
    };
  }

  const unitPrice = Number(tariff.unitPrice);

  if (!Number.isFinite(unitPrice) || unitPrice < 0)
    throw new Error("UNIT_PRICE_INVALID");

  return {
    status: "PRICED",
    quantityM3: quantity,
    unitPrice,
    amount: Math.round((quantity * unitPrice + Number.EPSILON) * 100) / 100,
    currency: tariff.currency ?? "TRY",
    unit: tariff.unit ?? "m3",
    tariffId: tariff.id
  };
}
