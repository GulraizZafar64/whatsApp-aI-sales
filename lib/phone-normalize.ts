/** Digits-only key for WhatsApp / phone matching (aligns with inbox grouping). */
export function normalizeWaDigits(input: string): string {
  return input.replace(/\D/g, "").slice(0, 32);
}

/** Human-readable +E.164-style label for UI (client-safe). */
export function formatWaPhoneForDisplay(digits: string): string {
  const d = normalizeWaDigits(digits);
  return d ? `+${d}` : digits.trim();
}
