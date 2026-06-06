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

/** Load the business catalog from MySQL on every inbound message. */
export async function fetchBusinessProductsForAi(
  businessId: number
): Promise<Product[]> {
  await ensureDb();
  return ProductModel.findAll({
    where: { businessId },
    order: [["id", "ASC"]],
  });
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
