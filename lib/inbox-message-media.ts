import { normalizeProductImageDataUrl } from "@/lib/product-image";

export type CatalogImageEntry = {
  productName: string;
  imageUrl: string;
};

function parseImagesJson(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function buildCatalogImageIndex(
  products: { productName: string; imagesJson: string | null }[]
): CatalogImageEntry[] {
  const out: CatalogImageEntry[] = [];
  for (const p of products) {
    const imgs = parseImagesJson(p.imagesJson);
    const dataUrl = imgs
      .map((u) => normalizeProductImageDataUrl(u))
      .find((u): u is string => Boolean(u));
    if (dataUrl) {
      out.push({ productName: p.productName.trim(), imageUrl: dataUrl });
    }
  }
  return out;
}

/** Label after `[Image]` e.g. "Shirt" or "Black Shirt #2". */
export function imageMessageLabel(text: string): string | null {
  const t = text.trim();
  if (!/^\[Image\]/i.test(t)) return null;
  const label = t
    .replace(/^\[Image\]\s*/i, "")
    .replace(/\s+#\d+\s*$/i, "")
    .trim();
  if (!label || /^image$/i.test(label)) return null;
  return label;
}

export function isImageLikeMessage(text: string, messageType: string): boolean {
  return messageType === "image" || /^\[Image\]/i.test(text.trim());
}

export function resolveInboxImagePreview(
  text: string,
  messageType: string,
  catalog: CatalogImageEntry[]
): string | null {
  if (!isImageLikeMessage(text, messageType) || catalog.length === 0) {
    return null;
  }

  const label = imageMessageLabel(text);
  if (!label) return null;

  const lower = label.toLowerCase();
  const exact = catalog.find((c) => c.productName.toLowerCase() === lower);
  if (exact) return exact.imageUrl;

  const contains = catalog.find(
    (c) =>
      c.productName.toLowerCase().includes(lower) ||
      lower.includes(c.productName.toLowerCase())
  );
  if (contains) return contains.imageUrl;

  const labelWords = lower.split(/\s+/).filter((w) => w.length >= 3);
  if (labelWords.length) {
    const byToken = catalog.find((c) => {
      const name = c.productName.toLowerCase();
      return labelWords.some((w) => name.includes(w));
    });
    if (byToken) return byToken.imageUrl;
  }

  return null;
}
