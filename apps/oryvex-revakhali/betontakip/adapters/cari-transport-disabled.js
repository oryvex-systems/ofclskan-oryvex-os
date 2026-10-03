export const disabledCariTransport = {
  name: "DISABLED_CARI_TRANSPORT",

  async transfer() {
    throw new Error(
      "PRODUCTION_CARI_TRANSPORT_DISABLED_IN_M7"
    );
  }
};
