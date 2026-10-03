(function () {
  "use strict";

  let provider = null;

  const requiredMethods = [
    "listSlips",
    "getSlip",
    "createSlip",
    "attachReceipt",
    "classifySlips",
    "listPours",
    "resolvePrice",
    "getDashboardSummary"
  ];

  function register(nextProvider) {
    if (!nextProvider) {
      throw new Error("Beton persistence provider gerekli.");
    }

    for (const method of requiredMethods) {
      if (typeof nextProvider[method] !== "function") {
        throw new Error(
          "Persistence method eksik: " + method
        );
      }
    }

    provider = nextProvider;
  }

  function requireProvider() {
    if (!provider) {
      throw new Error(
        "Beton persistence provider baglanmadi."
      );
    }

    return provider;
  }

  window.ORYVEX_BETON_PERSISTENCE = {
    register,
    requireProvider,
    requiredMethods: requiredMethods.slice()
  };
})();
