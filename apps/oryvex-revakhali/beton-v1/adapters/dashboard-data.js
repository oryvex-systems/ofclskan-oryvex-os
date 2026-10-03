(function (root) {
  "use strict";

  let provider = null;

  function register(nextProvider) {
    if (
      !nextProvider ||
      typeof nextProvider.listSlips !== "function"
    ) {
      throw new Error(
        "Dashboard provider listSlips() icermeli."
      );
    }

    provider = nextProvider;
  }

  function requireProvider() {
    if (!provider) {
      throw new Error(
        "Dashboard data provider baglanmadi."
      );
    }

    return provider;
  }

  async function load(options) {
    const opts = options || {};
    const p = requireProvider();

    const slips = await p.listSlips({
      dateFrom: opts.dateFrom || null,
      dateTo: opts.dateTo || null,
      readOnly: true
    });

    return root.ORYVEX_BETON_DASHBOARD.build({
      slips,
      plannedProjectConcreteM3:
        opts.plannedProjectConcreteM3,
      dateFrom:
        opts.dateFrom,
      dateTo:
        opts.dateTo
    });
  }

  root.ORYVEX_BETON_DASHBOARD_DATA = {
    register,
    load
  };

})(globalThis);
