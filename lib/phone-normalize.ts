/** Digits-only key for WhatsApp / phone matching (aligns with inbox grouping). */
export function normalizeWaDigits(input: string): string {
  return input.replace(/\D/g, "").slice(0, 32);
}
