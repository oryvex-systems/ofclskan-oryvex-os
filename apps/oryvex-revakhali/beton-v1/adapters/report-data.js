export async function loadReportRows() {
  const response =
    await fetch("./data/report-fixture.json", {
      method: "GET",
      cache: "no-store"
    });

  if (!response.ok) {
    throw new Error(
      `REPORT_DATA_HTTP_${response.status}`
    );
  }

  const payload =
    await response.json();

  if (payload.readOnly !== true) {
    throw new Error(
      "REPORT_PROVIDER_MUST_BE_READ_ONLY"
    );
  }

  return payload.items ?? [];
}
