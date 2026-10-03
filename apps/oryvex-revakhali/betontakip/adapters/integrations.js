(function () {
  "use strict";

  const adapters = new Map();

  function register(name, adapter) {
    if (!name) {
      throw new Error("Integration name gerekli.");
    }

    adapters.set(name, adapter);
  }

  function enabled(name) {
    return adapters.has(name);
  }

  function get(name) {
    return adapters.get(name) || null;
  }

  async function execute(name, action, payload) {
    const adapter = get(name);

    if (!adapter) {
      throw new Error(
        "Integration aktif degil: " + name
      );
    }

    if (typeof adapter[action] !== "function") {
      throw new Error(
        "Integration action bulunamadi: " +
        name +
        "." +
        action
      );
    }

    return adapter[action](payload);
  }

  window.ORYVEX_INTEGRATIONS = {
    register,
    enabled,
    get,
    execute
  };
})();
