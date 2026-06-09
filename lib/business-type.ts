import { isUnsetCountrySelection } from "@/lib/countries";

export const BUSINESS_TYPES = [
  "Product-Based E-commerce",
  "Service-Based Booking",
  "Lead Generation",
  "Digital Goods & Subscriptions",
  "Food & Delivery",
] as const;

/** @deprecated Kept so existing database rows stay valid */
export const LEGACY_BUSINESS_TYPES = [
  "Retail",
  "Services",
  "E-commerce",
  "Consulting",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const TYPE_PLACEHOLDER = "Select type...";

export const BUSINESS_TYPE_DESCRIPTIONS: Record<BusinessType, string> = {
  "Product-Based E-commerce":
    "Physical goods like clothing, electronics, groceries, or handmade items.",
  "Service-Based Booking":
    "Hair salons, clinics, or consultants where the sale is an appointment.",
  "Lead Generation":
    "Real estate, B2B, or car dealerships — the bot qualifies leads for a human.",
  "Digital Goods & Subscriptions":
    "Courses, software licenses, or membership plans.",
  "Food & Delivery":
    "Restaurants or grocery stores with quick ordering and location-based delivery.",
};

type BusinessTypeKind = "physical" | "booking" | "lead" | "digital" | "food";

export function businessTypeKind(raw: string | null | undefined): BusinessTypeKind {
  const t = (raw || "").trim();
  if (t === "Food & Delivery") return "food";
  if (t === "Product-Based E-commerce" || t === "E-commerce" || t === "Retail") {
    return "physical";
  }
  if (t === "Service-Based Booking" || t === "Services") return "booking";
  if (t === "Lead Generation" || t === "Consulting") return "lead";
  if (t === "Digital Goods & Subscriptions") return "digital";
  return "physical";
}

export function isValidBusinessType(raw: string | null | undefined): boolean {
  if (raw == null || !String(raw).trim()) return false;
  const t = String(raw).trim();
  if (t === TYPE_PLACEHOLDER) return false;
  return (
    BUSINESS_TYPES.includes(t as BusinessType) ||
    (LEGACY_BUSINESS_TYPES as readonly string[]).includes(t)
  );
}

export function isUnsetBusinessType(
  raw: string | null | undefined
): boolean {
  return !isValidBusinessType(raw);
}

export function isUnsetCountry(raw: string | null | undefined): boolean {
  return isUnsetCountrySelection(raw);
}

export function isBusinessProfileComplete(b: {
  businessName?: string | null;
  businessType?: string | null;
  country?: string | null;
}): boolean {
  return (
    Boolean(b.businessName?.trim()) &&
    !isUnsetBusinessType(b.businessType) &&
    !isUnsetCountry(b.country)
  );
}

export function parseBusinessTypeQuery(
  raw: string | null | undefined
): BusinessType | null {
  if (!raw?.trim()) return null;
  const t = decodeURIComponent(raw.trim());
  return BUSINESS_TYPES.includes(t as BusinessType) ? (t as BusinessType) : null;
}

/** AI system-prompt block: how checkout and lead capture should behave per business type. */
export function businessTypeAiHint(raw: string | null | undefined): string {
  const label = (raw || "").trim() || "Product-Based E-commerce";
  const kind = businessTypeKind(raw);
  switch (kind) {
    case "lead":
      return [
        `BUSINESS TYPE: ${label} (Lead Generation).`,
        "Physical delivery is NOT required — do NOT ask for delivery address.",
        "Qualify the lead: collect name, interest, budget, timeline, and contact details per owner instructions.",
      ].join(" ");
    case "booking":
      return [
        `BUSINESS TYPE: ${label} (Service Booking).`,
        "Do NOT ask for delivery address.",
        "Collect appointment/service details (date, time, service type, location if relevant).",
      ].join(" ");
    case "digital":
      return [
        `BUSINESS TYPE: ${label} (Digital Goods).`,
        "No physical delivery — skip delivery address unless owner checkout settings require payment proof only.",
      ].join(" ");
    case "food":
      return [
        `BUSINESS TYPE: ${label} (Food & Delivery).`,
        "Delivery address is required for confirmed orders.",
      ].join(" ");
    default:
      return [
        `BUSINESS TYPE: ${label} (Physical products).`,
        "Follow owner checkout settings for address, delivery charges, and payment.",
      ].join(" ");
  }
}

export function getBusinessTypeDescription(
  raw: string | null | undefined
): string | null {
  if (!raw?.trim() || isUnsetBusinessType(raw)) return null;
  const t = raw.trim();
  if (BUSINESS_TYPES.includes(t as BusinessType)) {
    return BUSINESS_TYPE_DESCRIPTIONS[t as BusinessType];
  }
  return null;
}

