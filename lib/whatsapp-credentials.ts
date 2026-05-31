import { findBusinessByPhoneNumberId } from "@/lib/business-lookup";
import type { Business } from "@/lib/models";

/** WhatsApp Cloud API token for this business (saved at Meta login). */
export function resolveWhatsAppAccessToken(
  business: Business | null | undefined
): string {
  return business?.whatsappToken?.trim() ?? "";
}

/** Load business row and its Meta token by webhook/dashboard `phone_number_id`. */
export async function loadBusinessWhatsAppToken(
  phoneNumberId: string
): Promise<{ business: Business; token: string } | null> {
  const business = await findBusinessByPhoneNumberId(phoneNumberId);
  if (!business) return null;
  const token = resolveWhatsAppAccessToken(business);
  if (!token) return null;
  return { business, token };
}

export function requireWhatsAppAccessTokenForBusiness(
  business: Business
): string | null {
  const token = resolveWhatsAppAccessToken(business);
  return token || null;
}

export function businessHasWhatsAppToken(business: Business | null | undefined): boolean {
  return Boolean(resolveWhatsAppAccessToken(business));
}

export function resolveAnthropicApiKey(business?: Business | null): string {
  const perBusiness = business?.anthropicApiKey?.trim();
  if (perBusiness) return perBusiness;
  return (
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.CLAUDE_API_KEY?.trim() ||
    ""
  );
}
