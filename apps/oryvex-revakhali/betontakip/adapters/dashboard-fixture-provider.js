(function (root) {
  "use strict";

  async function listSlips() {
    const response = await fetch(
      "data/dashboard-fixture.json",
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "Dashboard fixture okunamadi."
      );
    }

    const payload = await response.json();

    return Array.isArray(payload.slips)
      ? payload.slips
      : [];
  }

  root.ORYVEX_DASHBOARD_FIXTURE_PROVIDER = {
    listSlips
  };

})(globalThis);
