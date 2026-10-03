export function validateReceiptPhoto(file) {
  if (!file) {
    return { valid: false, error: "PHOTO_REQUIRED" };
  }

  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowed.includes(file.type)) {
    return { valid: false, error: "PHOTO_TYPE_NOT_ALLOWED" };
  }

  const maxBytes = 10 * 1024 * 1024;

  if (Number(file.size) > maxBytes) {
    return { valid: false, error: "PHOTO_TOO_LARGE" };
  }

  return { valid: true, error: null };
}

export function createLocalPhotoReference(file) {
  const validation = validateReceiptPhoto(file);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return {
    storageMode: "LOCAL_PREVIEW_ONLY",
    name: file.name,
    type: file.type,
    size: file.size,
    productionUploadPerformed: false
  };
}
