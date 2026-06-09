export type PriceTierField = {
  key: string;
  label: string;
  placeholder: string;
};

const PRICING_HEADER =
  "PRICING (use these exact prices when customer chooses size/portion):";

export function formatPriceTiersBlock(
  tiers: { label: string; amount: string }[],
  currencyPrefix?: string
): string {
  const prefix = currencyPrefix?.trim();
  const lines = tiers
    .map((t) => {
      const amount = t.amount.trim();
      if (!amount) return null;
      const label = t.label.trim();
      const value =
        prefix && !amount.toUpperCase().includes(prefix.toUpperCase())
          ? `${prefix} ${amount}`
          : amount;
      return `- ${label}: ${value}`;
    })
    .filter((line): line is string => line != null);

  if (!lines.length) return "";
  return `${PRICING_HEADER}\n${lines.join("\n")}`;
}

export type ParsedPriceTier = {
  label: string;
  amount: string;
};

export function stripCurrencyPrefix(amount: string, currencyPrefix?: string): string {
  let a = amount.trim();
  const prefix = currencyPrefix?.trim();
  if (prefix) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    a = a.replace(new RegExp(`^${escaped}\\s*`, "i"), "");
  }
  return a.replace(/^Rs\.?\s*/i, "").trim();
}

export function parseDescriptionParts(desc: string | null): {
  notes: string;
  tierAmounts: Record<string, string>;
  tiers: ParsedPriceTier[];
} {
  const raw = desc?.trim() ?? "";
  if (!raw.includes(PRICING_HEADER)) {
    return { notes: raw, tierAmounts: {}, tiers: [] };
  }

  const idx = raw.indexOf(PRICING_HEADER);
  const notes = raw.slice(0, idx).trim();
  const pricingBlock = raw.slice(idx + PRICING_HEADER.length).trim();
  const tierAmounts: Record<string, string> = {};
  const tiers: ParsedPriceTier[] = [];

  for (const line of pricingBlock.split("\n")) {
    const m = line.match(/^-\s*(.+?):\s*(.+)$/);
    if (!m) continue;
    const label = m[1]!.trim();
    const amount = m[2]!.trim();
    tierAmounts[label.toLowerCase()] = amount;
    tiers.push({ label, amount });
  }

  return { notes, tierAmounts, tiers };
}

export function newPriceTierRow(
  partial?: Partial<ParsedPriceTier>
): ParsedPriceTier & { id: string } {
  return {
    id: `tier-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    label: partial?.label ?? "",
    amount: partial?.amount ?? "",
  };
}

/** Map saved description tier labels back to form field keys. */
export function tierAmountForField(
  tierAmounts: Record<string, string>,
  fieldLabel: string,
  fieldKey?: string
): string {
  const key = fieldLabel.trim().toLowerCase();
  if (tierAmounts[key]) return tierAmounts[key]!;
  if (fieldKey && tierAmounts[fieldKey]) return tierAmounts[fieldKey]!;
  for (const [label, amount] of Object.entries(tierAmounts)) {
    if (label.includes(key) || key.includes(label)) return amount;
    if (fieldKey && (label.includes(fieldKey) || fieldKey.includes(label))) {
      return amount;
    }
  }
  return "";
}

export function mergeProductDescription(params: {
  notes: string;
  tiers: { label: string; amount: string }[];
  currencyPrefix?: string;
  prepTime?: string;
  allergens?: string;
  showPrepTime?: boolean;
  showAllergens?: boolean;
}): string | null {
  const parts: string[] = [];
  if (params.notes.trim()) parts.push(params.notes.trim());

  const pricing = formatPriceTiersBlock(params.tiers, params.currencyPrefix);
  if (pricing) parts.push(pricing);

  if (params.showPrepTime && params.prepTime?.trim()) {
    parts.push(`Prep time: ${params.prepTime.trim()}`);
  }
  if (params.showAllergens && params.allergens?.trim()) {
    parts.push(`Allergens: ${params.allergens.trim()}`);
  }

  return parts.length ? parts.join("\n\n") : null;
}
