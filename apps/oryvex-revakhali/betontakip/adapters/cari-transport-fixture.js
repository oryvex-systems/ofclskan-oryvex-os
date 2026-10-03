export function createFixtureCariTransport() {
  const transferred = new Map();

  return {
    name: "FIXTURE_CARI_TRANSPORT",

    async transfer(request) {
      if (request.slipNo === "0014121") {
        throw new Error("PROTECTED_SLIP_FORBIDDEN");
      }

      if (transferred.has(request.slipNo)) {
        const error =
          new Error("DUPLICATE_CARI_TRANSFER");

        error.code =
          "DUPLICATE_CARI_TRANSFER";

        throw error;
      }

      const externalReference =
        `FIXTURE-CARI-${request.slipNo}`;

      transferred.set(
        request.slipNo,
        externalReference
      );

      return {
        ok: true,
        externalReference
      };
    }
  };
}
