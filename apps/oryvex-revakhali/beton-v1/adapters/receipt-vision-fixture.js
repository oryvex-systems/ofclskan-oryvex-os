export const receiptVisionFixtureProvider = {
  name: "SAFE_FIXTURE",

  async read() {
    return {
      provider: "SAFE_FIXTURE",
      confidence: 0,
      fields: {
        slipNo: "",
        date: "",
        concreteClass: "",
        quantityM3: "",
        supplier: "",
        vehiclePlate: "",
        driver: "",
        productionStart: "",
        productionFinish: "",
        printedSite: "",
        rawText: ""
      }
    };
  }
};
