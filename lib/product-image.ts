/** Allowed product image formats (stored as data URLs in MySQL). */
export const ALLOWED_PRODUCT_IMAGE_MIME = ["image/jpeg", "image/png"] as const;

const DATA_URL_MIME_RE = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/i;

/**
 * Normalize a product image data URL to `image/jpeg` or `image/png` only.
 * Returns null if the format is not allowed.
 */
export function normalizeProductImageDataUrl(raw: string): string | null {
  const s = raw.trim();
  const m = DATA_URL_MIME_RE.exec(s);
  if (!m) return null;

  let mime = m[1].toLowerCase();
  if (mime === "image/jpg") mime = "image/jpeg";
  if (!(ALLOWED_PRODUCT_IMAGE_MIME as readonly string[]).includes(mime)) {
    return null;
  }

  const payload = s.slice(m[0].length);
  if (!payload || !/^[\sA-Za-z0-9+/=]+$/.test(payload.replace(/\s/g, ""))) {
    return null;
  }

  return `data:${mime};base64,${payload.replace(/\s/g, "")}`;
}

export function isAllowedProductImageFile(
  file: Pick<File, "type" | "name">
): boolean {
  const t = file.type.toLowerCase();
  if (t === "image/jpeg" || t === "image/png") return true;
  return /\.(jpe?g|png)$/i.test(file.name.trim());
}
