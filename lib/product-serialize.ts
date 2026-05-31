import type { Product } from "@/lib/models";

export type ProductDTO = {
  id: number;
  productName: string;
  productDescription: string | null;
  price: string;
  quantity: number;
  subtractOnOrder: boolean;
  discountEnabled: boolean;
  discountValue: string | null;
  discountIsPercent: boolean;
  discountValidDate: string | null;
  brandName: string | null;
  colors: string[];
  images: string[];
  bargainingLowAmount: string | null;
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

export function productToDto(p: Product): ProductDTO {
  return {
    id: p.id,
    productName: p.productName,
    productDescription: p.productDescription,
    price: String(p.price),
    quantity: p.quantity,
    subtractOnOrder: p.subtractOnOrder,
    discountEnabled: p.discountEnabled,
    discountValue: p.discountValue != null ? String(p.discountValue) : null,
    discountIsPercent: p.discountIsPercent,
    discountValidDate: p.discountValidDate
      ? String(p.discountValidDate)
      : null,
    brandName: p.brandName,
    colors: parseStringArray(p.colorsJson),
    images: parseStringArray(p.imagesJson),
    bargainingLowAmount:
      p.bargainingLowAmount != null ? String(p.bargainingLowAmount) : null,
  };
}
