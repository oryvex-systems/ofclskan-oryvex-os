(function () {
  "use strict";

  const state = {
    config: null
  };

  async function loadConfig() {
    if (state.config) return state.config;

    const response = await fetch("../config/runtime.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Runtime config okunamadi.");
    }

    state.config = await response.json();
    return state.config;
  }

  window.ORYVEX_CONFIG = {
    load: loadConfig,
    get cached() {
      return state.config;
    }
  };
})();
