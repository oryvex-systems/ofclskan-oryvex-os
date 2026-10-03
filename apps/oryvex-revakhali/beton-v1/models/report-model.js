const text = value => String(value ?? "").trim();

const lower = value =>
  text(value).toLocaleLowerCase("tr-TR");

const num = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const REPORT_FIELDS = Object.freeze([
  "date",
  "slipNo",
  "supplierName",
  "concreteClass",
  "quantityM3",
  "classification",
  "workGroup",
  "workItem",
  "costCenter",
  "unitPrice",
  "amount",
  "cariStatus"
]);

export function normalizeReportRow(input = {}) {
  return {
    date: text(input.date),
    slipNo: text(input.slipNo),
    supplierCode: text(input.supplierCode),
    supplierName: text(input.supplierName),
    concreteClass: text(input.concreteClass),
    quantityM3: num(input.quantityM3),
    classification:
      text(input.classification) || "UNCLASSIFIED",
    workGroup: text(input.workGroup),
    workItem: text(input.workItem),
    costCenter: text(input.costCenter),
    unitPrice:
      input.unitPrice === null ||
      input.unitPrice === undefined
        ? null
        : num(input.unitPrice),
    amount:
      input.amount === null ||
      input.amount === undefined
        ? null
        : num(input.amount),
    currency: text(input.currency) || "TRY",
    cariStatus: text(input.cariStatus),
    pourId: input.pourId ?? null,
    photoRef: input.photoRef ?? null
  };
}

function contains(actual, expected) {
  if (!text(expected)) return true;
  return lower(actual).includes(lower(expected));
}

function equals(actual, expected) {
  if (!text(expected)) return true;
  return lower(actual) === lower(expected);
}

export function filterReportRows(rows = [], filters = {}) {
  return rows
    .map(normalizeReportRow)
    .filter(row => {
      if (
        filters.dateFrom &&
        row.date < filters.dateFrom
      ) return false;

      if (
        filters.dateTo &&
        row.date > filters.dateTo
      ) return false;

      if (!contains(row.slipNo, filters.slipNo))
        return false;

      if (
        !contains(
          row.supplierName || row.supplierCode,
          filters.supplier
        )
      ) return false;

      if (
        !contains(
          row.concreteClass,
          filters.concreteClass
        )
      ) return false;

      if (
        !equals(
          row.classification,
          filters.classification
        )
      ) return false;

      if (
        !contains(
          row.workGroup,
          filters.workGroup
        )
      ) return false;

      if (
        !contains(
          row.workItem,
          filters.workItem
        )
      ) return false;

      if (
        !contains(
          row.costCenter,
          filters.costCenter
        )
      ) return false;

      if (
        !equals(
          row.cariStatus,
          filters.cariStatus
        )
      ) return false;

      return true;
    });
}

export function summarizeReportRows(rows = []) {
  const normalized =
    rows.map(normalizeReportRow);

  const summary = {
    slipCount: normalized.length,
    totalQuantityM3: 0,
    projectQuantityM3: 0,
    nonProjectQuantityM3: 0,
    unclassifiedQuantityM3: 0,
    pricedAmount: 0,
    pricedSlipCount: 0,
    cariReadyCount: 0,
    cariTransferredCount: 0
  };

  for (const row of normalized) {
    summary.totalQuantityM3 += row.quantityM3;

    if (row.classification === "PROJECT") {
      summary.projectQuantityM3 += row.quantityM3;
    } else if (
      row.classification === "NON_PROJECT"
    ) {
      summary.nonProjectQuantityM3 +=
        row.quantityM3;
    } else {
      summary.unclassifiedQuantityM3 +=
        row.quantityM3;
    }

    if (row.amount !== null) {
      summary.pricedAmount += row.amount;
      summary.pricedSlipCount += 1;
    }

    if (row.cariStatus === "CARIYE_HAZIR") {
      summary.cariReadyCount += 1;
    }

    if (
      row.cariStatus === "CARIYE_AKTARILDI"
    ) {
      summary.cariTransferredCount += 1;
    }
  }

  for (const key of [
    "totalQuantityM3",
    "projectQuantityM3",
    "nonProjectQuantityM3",
    "unclassifiedQuantityM3",
    "pricedAmount"
  ]) {
    summary[key] =
      Math.round(
        (summary[key] + Number.EPSILON) * 100
      ) / 100;
  }

  return summary;
}

export function sortReportRows(
  rows = [],
  field = "date",
  direction = "desc"
) {
  const multiplier =
    direction === "asc" ? 1 : -1;

  return [...rows]
    .map(normalizeReportRow)
    .sort((a, b) => {
      const av = a[field] ?? "";
      const bv = b[field] ?? "";

      if (
        typeof av === "number" &&
        typeof bv === "number"
      ) {
        return (av - bv) * multiplier;
      }

      return String(av)
        .localeCompare(
          String(bv),
          "tr-TR"
        ) * multiplier;
    });
}
