export const DEFAULT_CONFIDENCE_THRESHOLD = 0.80;

export function evaluateVisionResult(
  result,
  threshold = DEFAULT_CONFIDENCE_THRESHOLD
) {
  const fields = result?.fields ?? {};
  const confidence = Number(result?.confidence ?? 0);

  const required = [
    "slipNo",
    "date",
    "concreteClass",
    "quantityM3"
  ];

  const missing = required.filter((key) => {
    const value = fields[key];
    return value === null || value === undefined || String(value).trim() === "";
  });

  return {
    fields,
    confidence,
    missing,
    reviewRequired: confidence < threshold || missing.length > 0,
    provider: result?.provider ?? "unknown"
  };
}

export async function readReceiptWithVision(file, provider) {
  if (!file) throw new Error("PHOTO_REQUIRED");

  if (!provider || typeof provider.read !== "function") {
    throw new Error("VISION_PROVIDER_REQUIRED");
  }

  const result = await provider.read(file);
  return evaluateVisionResult(result);
}
