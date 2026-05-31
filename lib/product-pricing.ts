import type { Product } from "@/lib/models";

export type ProductPricingFields = {
  price: string;
  discountEnabled: boolean;
  discountValue: string | null;
  discountIsPercent: boolean;
  discountValidDate: string | null;
  bargainingLowAmount: string | null;
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** List price before discount. */
export function listUnitPrice(p: ProductPricingFields): number {
  return Number.parseFloat(String(p.price)) || 0;
}

/** Price to quote customers first (after active discount). */
export function customerUnitPrice(p: ProductPricingFields): number {
  const list = listUnitPrice(p);
  if (!p.discountEnabled || p.discountValue == null) return list;
  if (p.discountValidDate) {
    if (p.discountValidDate !== todayYmd()) return list;
  }
  const dv = Number.parseFloat(String(p.discountValue)) || 0;
  if (p.discountIsPercent) {
    return Math.max(0, list * (1 - dv / 100));
  }
  return Math.max(0, list - dv);
}

/** Internal minimum — only after repeated customer discount requests. */
export function bargainFloorPrice(p: ProductPricingFields): number | null {
  if (p.bargainingLowAmount == null) return null;
  const b = Number.parseFloat(String(p.bargainingLowAmount));
  return Number.isFinite(b) && b >= 0 ? b : null;
}

export function formatMoney(n: number): string {
  return n.toFixed(2);
}

/** How many customer discount/bargain asks before the AI may agree the bargain floor. */
export const BARGAIN_FLOOR_MIN_DISCOUNT_REQUESTS = 1;

export function canOfferBargainFloor(discountRequestCount: number): boolean {
  return discountRequestCount >= BARGAIN_FLOOR_MIN_DISCOUNT_REQUESTS;
}
