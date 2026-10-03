(function () {
  "use strict";

  let client = null;

  function register(nextClient) {
    client = nextClient || null;
  }

  function getClient() {
    return client;
  }

  function requireClient() {
    if (!client) {
      throw new Error(
        "Supabase adapter henuz baglanmadi."
      );
    }

    return client;
  }

  window.ORYVEX_SUPABASE = {
    register,
    getClient,
    requireClient
  };
})();
