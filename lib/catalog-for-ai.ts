import { ensureDb } from "@/lib/sequelize";
import type { Product } from "@/lib/models";
import { Product as ProductModel } from "@/lib/models";
import { normalizeCurrency } from "@/lib/currency";
import {
  bargainFloorPrice,
  customerUnitPrice,
  listUnitPrice,
} from "@/lib/product-pricing";

/** One catalog row for the AI (no image bytes — keeps prompts small). */
export type AiCatalogProductJson = {
  id: number;
  name: string;
  description: string | null;
  brandName: string | null;
  colors: string[];
  listPrice: number;
  customerPrice: number;
  bargainFloorPrice: number | null;
  discountEnabled: boolean;
  tracksStock: boolean;
  quantity: number;
  inStock: boolean;
  imageCount: number;
};

export type AiCatalogPayload = {
  refreshedAt: string;
  currency: string;
  productCount: number;
  products: AiCatalogProductJson[];
};

function parseStringArray(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Load the business catalog from MySQL on every inbound message (no cache). */
export async function fetchBusinessProductsForAi(
  businessId: number
): Promise<Product[]> {
  await ensureDb();
  return ProductModel.findAll({
    where: { businessId },
    order: [["id", "ASC"]],
  });
}

/** Short inventory list + rules so the model ignores deleted products from chat history. */
export function catalogInventoryRulesBlock(products: Product[]): string {
  if (!products.length) {
    return [
      "CURRENT INVENTORY: (empty — no products in database right now).",
      "If the customer asks for any product, say nothing is available at the moment and the owner will update the catalog soon.",
      "Do NOT confirm availability for any product name from earlier chat — those may have been deleted.",
    ].join("\n");
  }

  const names = products.map(
    (p) => `• id ${p.id}: ${p.productName.trim()}`
  );
  return [
    `CURRENT INVENTORY (${products.length} item${products.length === 1 ? "" : "s"} — ONLY these exist right now; loaded fresh from database on this message):`,
    ...names,
    "If the customer asks for anything NOT in this list or CATALOG_JSON — including products you discussed earlier in chat — say it is no longer available / out of stock and offer items from CURRENT INVENTORY only.",
    "Never invent products. Never say yes to a deleted or unlisted item.",
  ].join("\n");
}

export function buildAiCatalogPayload(
  products: Product[],
  currency = "PKR"
): AiCatalogPayload {
  return {
    refreshedAt: new Date().toISOString(),
    currency: normalizeCurrency(currency),
    productCount: products.length,
    products: products.map((p) => {
      const colors = parseStringArray(p.colorsJson);
      const images = parseStringArray(p.imagesJson);
      const tracksStock = Boolean(p.subtractOnOrder);
      const qty = p.quantity;
      const inStock = !tracksStock || qty > 0;
      const list = listUnitPrice(p);
      const customer = customerUnitPrice(p);
      const floor = bargainFloorPrice(p);

      return {
        id: p.id,
        name: p.productName,
        description: p.productDescription?.trim() || null,
        brandName: p.brandName?.trim() || null,
        colors,
        listPrice: list,
        customerPrice: customer,
        bargainFloorPrice: floor,
        discountEnabled: Boolean(p.discountEnabled),
        tracksStock,
        quantity: qty,
        inStock,
        imageCount: images.length,
      };
    }),
  };
}

/** Minified JSON string for the system prompt. */
export function catalogJsonForAiPrompt(
  products: Product[],
  currency?: string | null
): string {
  return JSON.stringify(buildAiCatalogPayload(products, currency ?? undefined));
}
