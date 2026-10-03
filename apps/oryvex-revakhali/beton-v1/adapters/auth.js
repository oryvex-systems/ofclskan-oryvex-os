(function () {
  "use strict";

  let provider = null;

  function register(nextProvider) {
    provider = nextProvider || null;
  }

  async function session() {
    if (!provider || typeof provider.session !== "function") {
      return null;
    }

    return provider.session();
  }

  async function requireWriteSession() {
    const current = await session();

    if (!current || !current.user) {
      throw new Error(
        "Yazma islemi icin yetkili oturum gerekli."
      );
    }

    return current;
  }

  window.ORYVEX_AUTH = {
    register,
    session,
    requireWriteSession
  };
})();
