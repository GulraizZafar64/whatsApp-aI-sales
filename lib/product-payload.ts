import { createProductFormConfig } from "@/lib/product-form-config";
import {
  ALLOWED_PRODUCT_IMAGE_MIME,
  normalizeProductImageDataUrl,
} from "@/lib/product-image";

/** Max images per product (client + server). */
export const MAX_PRODUCT_IMAGES = 100;

/** Max decoded binary size per image (3 MB). */
export const MAX_IMAGE_DECODED_BYTES = 3 * 1024 * 1024;

/** Guardrail for total base64 payload to avoid huge requests / DB rows. */
export const MAX_TOTAL_IMAGES_CHARS = 50 * 1024 * 1024;

export function normalizeColors(colors: unknown): string[] {
  if (!Array.isArray(colors)) return [];
  return colors
    .filter((x): x is string => typeof x === "string")
    .map((c) => c.trim())
    .filter(Boolean);
}

/** Variant labels (sizes, colors, portions) — rules depend on business type. */
export function validateProductVariants(
  businessType: string | null | undefined,
  variants: string[]
): string | null {
  const cfg = createProductFormConfig(businessType);
  if (cfg.sizesRequired && variants.length === 0) {
    return "Add at least one size (comma-separated).";
  }
  if (cfg.colorsRequired && variants.length === 0) {
    return "Add at least one color (comma-separated).";
  }
  return null;
}

export function normalizeImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  const out: string[] = [];
  for (const x of images) {
    if (typeof x !== "string") continue;
    const normalized = normalizeProductImageDataUrl(x);
    if (normalized) out.push(normalized);
  }
  return out;
}

/**
 * Approximate decoded byte size of a `data:*;base64,...` URL.
 */
export function approxDecodedBytesFromDataUrl(s: string): number {
  const idx = s.indexOf("base64,");
  if (idx === -1) return -1;
  const b64 = s.slice(idx + 7);
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
}

export function validateProductImages(images: string[]): string | null {
  if (images.length > MAX_PRODUCT_IMAGES) {
    return `At most ${MAX_PRODUCT_IMAGES} images per product.`;
  }
  let totalChars = 0;
  for (let i = 0; i < images.length; i++) {
    const s = images[i];
    if (typeof s !== "string" || !s.startsWith("data:") || !s.includes("base64,")) {
      return `Image ${i + 1} must be a base64 data URL (from file upload).`;
    }
    const normalized = normalizeProductImageDataUrl(s);
    if (!normalized) {
      return `Image ${i + 1} must be JPG or PNG only (${ALLOWED_PRODUCT_IMAGE_MIME.join(", ")}).`;
    }
    const bytes = approxDecodedBytesFromDataUrl(s);
    if (bytes < 0) {
      return `Image ${i + 1} is not a valid base64 data URL.`;
    }
    if (!Number.isFinite(bytes) || bytes > MAX_IMAGE_DECODED_BYTES) {
      return `Image ${i + 1} is larger than 3 MB after decoding. Compress or resize it.`;
    }
    totalChars += s.length;
    if (totalChars > MAX_TOTAL_IMAGES_CHARS) {
      return "Total image payload is too large for one save. Remove some images or shrink files (each under 3 MB).";
    }
  }
  return null;
}
