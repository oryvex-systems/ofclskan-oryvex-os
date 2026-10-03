import {
  findApplicableTariff,
  normalizeConcreteClass
} from "./price-model.js";

import {
  calculateConcreteCost
} from "./cost-model.js";

export function priceConcreteSlip({
  slip,
  projectCode,
  supplierCode,
  tariffs
}) {
  const concreteClass =
    normalizeConcreteClass(slip.concreteClass);

  const tariff = findApplicableTariff(
    tariffs,
    {
      projectCode,
      supplierCode,
      concreteClass,
      date: slip.date
    }
  );

  const cost = calculateConcreteCost({
    quantityM3: slip.quantityM3,
    tariff
  });

  return {
    slipNo: slip.slipNo ?? null,
    projectCode,
    supplierCode,
    concreteClass,
    quantityM3: Number(slip.quantityM3),
    tariff,
    cost,
    cariStatus:
      cost.status === "PRICED"
        ? "CARIYE_HAZIRLIK_UYGUN"
        : "FIYAT_BEKLIYOR",
    automaticCariTransfer: false
  };
}
