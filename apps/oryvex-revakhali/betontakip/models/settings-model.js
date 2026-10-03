export const DEFAULT_SETTINGS = Object.freeze({
  projectCode: "TASPAZAR-CAMII",
  plannedProjectConcreteM3: 4400,
  currency: "TRY",
  quantityUnit: "m3",
  automaticCariTransfer: false,
  manualFinancialApproval: true,
  reportPageSize: 50,
  defaultReportSort: "date-desc"
});

export function validateSettings(input = {}) {
  const planned =
    Number(input.plannedProjectConcreteM3);

  const pageSize =
    Number(input.reportPageSize);

  if (!input.projectCode) {
    throw new Error("PROJECT_CODE_REQUIRED");
  }

  if (
    !Number.isFinite(planned) ||
    planned <= 0
  ) {
    throw new Error(
      "PLANNED_CONCRETE_INVALID"
    );
  }

  if (
    !Number.isInteger(pageSize) ||
    pageSize < 10 ||
    pageSize > 500
  ) {
    throw new Error(
      "REPORT_PAGE_SIZE_INVALID"
    );
  }

  if (
    input.automaticCariTransfer !== false
  ) {
    throw new Error(
      "AUTOMATIC_CARI_FORBIDDEN"
    );
  }

  if (
    input.manualFinancialApproval !== true
  ) {
    throw new Error(
      "MANUAL_FINANCIAL_APPROVAL_REQUIRED"
    );
  }

  return true;
}

export function normalizeSettings(input = {}) {
  const candidate = {
    ...DEFAULT_SETTINGS,
    ...input,

    plannedProjectConcreteM3:
      Number(
        input.plannedProjectConcreteM3 ??
        DEFAULT_SETTINGS.plannedProjectConcreteM3
      ),

    reportPageSize:
      Number(
        input.reportPageSize ??
        DEFAULT_SETTINGS.reportPageSize
      )
  };

  /*
   * SECURITY:
   * Validate the requested values BEFORE enforcing
   * immutable financial safety values.
   *
   * A caller attempting:
   *   automaticCariTransfer=true
   * must be rejected, not silently corrected.
   */
  validateSettings(candidate);

  const normalized = {
    ...candidate,

    automaticCariTransfer:
      false,

    manualFinancialApproval:
      true
  };

  validateSettings(normalized);

  return normalized;
}

export function publicSettings(settings = {}) {
  const normalized =
    normalizeSettings(settings);

  return {
    projectCode:
      normalized.projectCode,

    plannedProjectConcreteM3:
      normalized.plannedProjectConcreteM3,

    currency:
      normalized.currency,

    quantityUnit:
      normalized.quantityUnit,

    automaticCariTransfer:
      false,

    manualFinancialApproval:
      true,

    reportPageSize:
      normalized.reportPageSize,

    defaultReportSort:
      normalized.defaultReportSort
  };
}
