import { findBusinessByPhoneNumberId } from "@/lib/business-lookup";
import { resolveWhatsAppAccessToken } from "@/lib/whatsapp-credentials";
import type { Business } from "@/lib/models";

export function bearerToken(request: Request): string {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return "";
  return auth.slice(7).trim();
}

export function phoneNumberIdFromRequest(request: Request): string {
  return (
    request.headers.get("x-phone-number-id")?.trim() ||
    request.headers.get("X-Phone-Number-Id")?.trim() ||
    ""
  );
}

export async function requireDashboardBusiness(
  request: Request
): Promise<
  | { ok: true; business: Business; accessToken: string }
  | { ok: false; status: number; error: string }
> {
  const token = bearerToken(request);
  if (!token) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const phoneNumberId = phoneNumberIdFromRequest(request);
  if (!phoneNumberId) {
    return {
      ok: false,
      status: 400,
      error: "Missing X-Phone-Number-Id header",
    };
  }

  const business = await findBusinessByPhoneNumberId(phoneNumberId);
  if (!business) {
    return {
      ok: false,
      status: 404,
      error:
        "No business record for this phone number. Finish setup on Get Started first.",
    };
  }

  const stored = resolveWhatsAppAccessToken(business);
  if (!stored) {
    return {
      ok: false,
      status: 403,
      error:
        "WhatsApp is not connected for this account. Sign in with WhatsApp again.",
    };
  }

  if (stored !== token) {
    return {
      ok: false,
      status: 401,
      error: "Session expired. Sign in with WhatsApp again.",
    };
  }

  return { ok: true, business, accessToken: stored };
}
