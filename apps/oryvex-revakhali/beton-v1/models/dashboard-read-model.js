(function (root, factory) {
  "use strict";

  const api = factory();

  if (
    typeof module === "object" &&
    module.exports
  ) {
    module.exports = api;
  }

  root.ORYVEX_BETON_DASHBOARD = api;

})(
  typeof globalThis !== "undefined"
    ? globalThis
    : this,
  function () {
    "use strict";

    function num(value) {
      const n = Number(value);

      return Number.isFinite(n)
        ? n
        : 0;
    }

    function round(value, digits) {
      const p = 10 ** digits;

      return Math.round(
        (num(value) + Number.EPSILON) * p
      ) / p;
    }

    function dateValue(value) {
      if (!value) {
        return "";
      }

      return String(value).slice(0, 10);
    }

    function normalizedScope(slip) {
      const scope =
        slip.scopeType ||
        slip.classification ||
        slip.classificationStatus ||
        "UNCLASSIFIED";

      const value = String(scope).toUpperCase();

      if (value === "PROJECT") {
        return "PROJECT";
      }

      if (value === "NON_PROJECT") {
        return "NON_PROJECT";
      }

      return "UNCLASSIFIED";
    }

    function normalizeClass(value) {
      const raw = String(value || "")
        .trim()
        .replace(/\s+/g, " ");

      const upper = raw.toUpperCase();

      if (upper.startsWith("C16")) {
        return "C16";
      }

      if (upper.startsWith("C20/25")) {
        return "C20/25";
      }

      if (upper.startsWith("C30/35")) {
        return "C30/35";
      }

      return raw || "Belirsiz";
    }

    function normalizedCari(slip) {
      const raw = String(
        slip.cariStatus ||
        slip.cari_status ||
        ""
      )
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");

      if (
        raw.includes("AKTARIL") ||
        slip.cariTransferred === true
      ) {
        return "CARIYE_AKTARILDI";
      }

      if (
        raw.includes("HAZIR") ||
        raw === "READY"
      ) {
        return "CARIYE_HAZIR";
      }

      if (
        raw.includes("FIYAT")
      ) {
        return "FIYAT_BEKLIYOR";
      }

      return "SINIFLANDIRMA_BEKLIYOR";
    }

    function quantity(slip) {
      return num(
        slip.quantityM3 ??
        slip.quantity ??
        slip.miktar
      );
    }

    function unitPrice(slip) {
      return num(
        slip.unitPrice ??
        slip.unit_price ??
        slip.price
      );
    }

    function amount(slip) {
      const explicit =
        slip.totalAmount ??
        slip.total_amount ??
        slip.cariAmount ??
        slip.cari_amount;

      if (
        explicit !== null &&
        explicit !== undefined &&
        explicit !== ""
      ) {
        return num(explicit);
      }

      return quantity(slip) * unitPrice(slip);
    }

    function filterByDate(
      slips,
      dateFrom,
      dateTo
    ) {
      return slips.filter(function (slip) {
        const d = dateValue(
          slip.slipDate ||
          slip.slip_date ||
          slip.date
        );

        if (dateFrom && d < dateFrom) {
          return false;
        }

        if (dateTo && d > dateTo) {
          return false;
        }

        return true;
      });
    }

    function group(
      slips,
      keyFn,
      valueFn
    ) {
      const map = new Map();

      for (const slip of slips) {
        const key =
          keyFn(slip) ||
          "Belirsiz";

        const current =
          map.get(key) || {
            key,
            quantityM3: 0,
            amount: 0,
            slipCount: 0
          };

        current.quantityM3 += quantity(slip);
        current.amount += valueFn
          ? num(valueFn(slip))
          : amount(slip);
        current.slipCount += 1;

        map.set(key, current);
      }

      return Array.from(map.values())
        .map(function (item) {
          return {
            key: item.key,
            quantityM3:
              round(item.quantityM3, 3),
            amount:
              round(item.amount, 2),
            slipCount:
              item.slipCount
          };
        })
        .sort(function (a, b) {
          return b.quantityM3 - a.quantityM3;
        });
    }

    function build(options) {
      const opts = options || {};
      const source = Array.isArray(opts.slips)
        ? opts.slips
        : [];

      const planned =
        num(opts.plannedProjectConcreteM3);

      const slips = filterByDate(
        source,
        opts.dateFrom || "",
        opts.dateTo || ""
      );

      let total = 0;
      let project = 0;
      let nonProject = 0;
      let unclassified = 0;
      let totalCost = 0;
      let cariReadyCount = 0;
      let cariTransferredCount = 0;
      let cariWaitingCount = 0;
      let cariReadyAmount = 0;
      let cariTransferredAmount = 0;

      for (const slip of slips) {
        const q = quantity(slip);
        const scope = normalizedScope(slip);
        const cari = normalizedCari(slip);
        const slipAmount = amount(slip);

        total += q;
        totalCost += slipAmount;

        if (scope === "PROJECT") {
          project += q;
        } else if (scope === "NON_PROJECT") {
          nonProject += q;
        } else {
          unclassified += q;
        }

        if (cari === "CARIYE_AKTARILDI") {
          cariTransferredCount += 1;
          cariTransferredAmount += slipAmount;
        } else if (cari === "CARIYE_HAZIR") {
          cariReadyCount += 1;
          cariReadyAmount += slipAmount;
        } else {
          cariWaitingCount += 1;
        }
      }

      const remaining = Math.max(
        planned - project,
        0
      );

      const progress = planned > 0
        ? project / planned * 100
        : 0;

      return {
        generatedAt:
          new Date().toISOString(),

        filter: {
          dateFrom:
            opts.dateFrom || null,
          dateTo:
            opts.dateTo || null
        },

        plan: {
          plannedProjectConcreteM3:
            round(planned, 3),
          projectConcreteM3:
            round(project, 3),
          remainingProjectConcreteM3:
            round(remaining, 3),
          progressPercent:
            round(progress, 2)
        },

        delivery: {
          totalDeliveredM3:
            round(total, 3),
          projectM3:
            round(project, 3),
          nonProjectM3:
            round(nonProject, 3),
          unclassifiedM3:
            round(unclassified, 3),
          slipCount:
            slips.length
        },

        financial: {
          totalCalculatedCost:
            round(totalCost, 2),

          cariReady: {
            count: cariReadyCount,
            amount:
              round(cariReadyAmount, 2)
          },

          cariTransferred: {
            count: cariTransferredCount,
            amount:
              round(
                cariTransferredAmount,
                2
              )
          },

          cariWaiting: {
            count: cariWaitingCount
          }
        },

        distributions: {
          concreteClass:
            group(
              slips,
              function (slip) {
                return normalizeClass(
                  slip.concreteClassNormalized ||
                  slip.concreteClassRaw ||
                  slip.concrete_class
                );
              }
            ),

          workItem:
            group(
              slips,
              function (slip) {
                return (
                  slip.workItem ||
                  slip.work_item ||
                  "Atanmamış"
                );
              }
            ),

          supplier:
            group(
              slips,
              function (slip) {
                return (
                  slip.supplierName ||
                  slip.supplier_name ||
                  "Tedarikçi Belirsiz"
                );
              }
            ),

          classification:
            group(
              slips,
              normalizedScope
            )
        }
      };
    }

    return {
      build,
      filterByDate,
      normalizeClass,
      normalizedScope,
      normalizedCari,
      quantity,
      amount
    };
  }
);
