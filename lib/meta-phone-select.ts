import type { DiscoveredPhoneNumber } from "@/lib/meta-waba-discovery";

/** Meta API Setup test numbers are usually +1 555 … */
export function isMetaSandboxTestNumber(
  displayPhoneNumber?: string | null
): boolean {
  const digits = (displayPhoneNumber ?? "").replace(/\D/g, "");
  return digits.startsWith("1555") && digits.length >= 10;
}

/** Prefer a real business line over Meta's +1 555 test number when both exist. */
export function pickPrimaryPhoneNumber(
  phones: DiscoveredPhoneNumber[]
): DiscoveredPhoneNumber | null {
  if (!phones.length) return null;
  const real = phones.find((p) => !isMetaSandboxTestNumber(p.display_phone_number));
  return real ?? phones[0] ?? null;
}
