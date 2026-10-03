const text = value => String(value ?? "").trim();

export function normalizeConcreteClass(value) {
  const raw = text(value).toUpperCase();

  if (raw.startsWith("C20/25")) return "C20/25";
  if (raw.startsWith("C30/35")) return "C30/35";
  if (raw.startsWith("C16")) return "C16";

  return raw;
}

export function findApplicableTariff(items = [], query = {}) {
  const date = text(query.date);

  const matches = items
    .filter(item => {
      if (!item.active) return false;

      if (text(item.projectCode) !== text(query.projectCode))
        return false;

      if (
        text(item.supplierCode).toUpperCase() !==
        text(query.supplierCode).toUpperCase()
      )
        return false;

      if (
        normalizeConcreteClass(item.concreteClass) !==
        normalizeConcreteClass(query.concreteClass)
      )
        return false;

      if (date < item.validFrom) return false;
      if (item.validTo && date > item.validTo) return false;

      return true;
    })
    .sort((a, b) =>
      String(b.validFrom).localeCompare(String(a.validFrom))
    );

  if (!matches.length) return null;

  const newest = matches[0].validFrom;
  const sameDate = matches.filter(x => x.validFrom === newest);

  if (sameDate.length > 1)
    throw new Error("AMBIGUOUS_ACTIVE_TARIFF");

  return matches[0];
}
