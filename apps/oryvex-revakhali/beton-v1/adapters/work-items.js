export async function loadWorkItems(
  url = "../config/dictionaries/work-items.json"
) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`WORK_ITEMS_HTTP_${response.status}`);
  }

  const payload = await response.json();

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.workItems)) return payload.workItems;

  throw new Error("WORK_ITEMS_SCHEMA_UNSUPPORTED");
}

export function findWorkItem(items, id) {
  return items.find((item) =>
    String(item.id ?? item.code ?? item.name) === String(id)
  ) ?? null;
}

export function resolveWorkItemMetadata(item) {
  if (!item) {
    return {
      workItem: null,
      workGroup: null,
      costCenter: null
    };
  }

  return {
    workItem: item.id ?? item.code ?? item.name ?? null,
    workGroup: item.workGroup ?? item.group ?? null,
    costCenter: item.costCenter ?? item.costCenterId ?? null
  };
}
