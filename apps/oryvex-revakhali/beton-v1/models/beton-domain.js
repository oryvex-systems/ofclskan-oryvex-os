(function () {
  "use strict";

  const VALID_SCOPES = new Set([
    "PROJECT",
    "NON_PROJECT",
    "UNCLASSIFIED"
  ]);

  function number(value) {
    const result = Number(value);

    if (!Number.isFinite(result)) {
      throw new Error("Gecersiz sayisal deger.");
    }

    return result;
  }

  function normalizeConcreteClass(value) {
    const raw = String(value || "")
      .trim()
      .replace(/\s+/g, " ");

    const upper = raw.toUpperCase();

    if (upper.startsWith("C16")) {
      return "C16";
    }

    if (upper.startsWith("C20/25")) {
      return "C20/25";
    }

    if (upper.startsWith("C30/35")) {
      return "C30/35";
    }

    return raw || null;
  }

  function amount(quantityM3, unitPrice) {
    return Number(
      (
        number(quantityM3) *
        number(unitPrice)
      ).toFixed(2)
    );
  }

  function totalSlipQuantity(slips) {
    return Number(
      slips.reduce(
        (sum, slip) =>
          sum + number(slip.quantityM3),
        0
      ).toFixed(3)
    );
  }

  function projectQuantity(slips) {
    return totalSlipQuantity(
      slips.filter(
        slip => slip.scopeType === "PROJECT"
      )
    );
  }

  function nonProjectQuantity(slips) {
    return totalSlipQuantity(
      slips.filter(
        slip => slip.scopeType === "NON_PROJECT"
      )
    );
  }

  function unclassifiedQuantity(slips) {
    return totalSlipQuantity(
      slips.filter(
        slip =>
          !slip.scopeType ||
          slip.scopeType === "UNCLASSIFIED"
      )
    );
  }

  function progressPercent(
    projectM3,
    plannedM3
  ) {
    const planned = number(plannedM3);

    if (planned <= 0) {
      return 0;
    }

    return Number(
      (
        number(projectM3) /
        planned *
        100
      ).toFixed(2)
    );
  }

  function validateScope(scope) {
    if (!VALID_SCOPES.has(scope)) {
      throw new Error(
        "Gecersiz classification scope: " +
        scope
      );
    }

    return scope;
  }

  window.ORYVEX_BETON_DOMAIN = {
    normalizeConcreteClass,
    amount,
    totalSlipQuantity,
    projectQuantity,
    nonProjectQuantity,
    unclassifiedQuantity,
    progressPercent,
    validateScope
  };
})();
