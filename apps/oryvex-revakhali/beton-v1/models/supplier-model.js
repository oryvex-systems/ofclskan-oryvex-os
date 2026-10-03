export function normalizeSupplierCode(value) {
  return String(value ?? "").trim().toUpperCase();
}

export function createSupplier(input = {}) {
  const code = normalizeSupplierCode(input.code);
  const name = String(input.name ?? "").trim();

  if (!code) throw new Error("SUPPLIER_CODE_REQUIRED");
  if (!name) throw new Error("SUPPLIER_NAME_REQUIRED");

  return {
    code,
    name,
    active: input.active !== false,
    persistedId: input.persistedId ?? null
  };
}

export function findSupplier(items = [], code) {
  const normalized = normalizeSupplierCode(code);

  return items.find(
    item => normalizeSupplierCode(item.code) === normalized
  ) ?? null;
}
