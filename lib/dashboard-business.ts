import { INCOMPLETE_BUSINESS_SETUP_ERROR } from "@/lib/dashboard/api-errors";
import { findBusinessForUser } from "@/lib/business-lookup";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { Business } from "@/lib/models";
import { ensureDb } from "@/lib/sequelize";
import { businessWhatsAppReady } from "@/lib/whatsapp-credentials";
import { enforceBusinessAccess } from "@/lib/billing";

/** JWT may lack businessId after setup; always fall back to the owner's business row. */
async function resolveBusinessForUser(
  userId: number,
  tokenBusinessId: number | null
): Promise<Business | null> {
  await ensureDb();
  if (tokenBusinessId) {
    const fromToken = await Business.findByPk(tokenBusinessId);
    if (fromToken && fromToken.ownerUserId === userId) {
      return fromToken;
    }
  }
  return findBusinessForUser(userId);
}

export function bearerToken(request: Request): string {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return "";
  return auth.slice(7).trim();
}

/** Logged in + business row (WhatsApp may still be disconnected). */
export async function requireDashboardAuth(
  request: Request
): Promise<
  | { ok: true; business: Business; userId: number }
  | { ok: false; status: number; error: string }
> {
  const token = bearerToken(request);
  if (!token) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return { ok: false, status: 401, error: "Invalid or expired session." };
  }

  const business = await resolveBusinessForUser(
    payload.userId,
    payload.businessId
  );
  if (!business) {
    return {
      ok: false,
      status: 403,
      error: INCOMPLETE_BUSINESS_SETUP_ERROR,
    };
  }

  await enforceBusinessAccess(business, payload.userId);

  return { ok: true, business, userId: payload.userId };
}

/** Same as auth + WhatsApp must be connected (send messages, etc.). */
export async function requireDashboardBusiness(
  request: Request
): Promise<
  | { ok: true; business: Business; accessToken: string }
  | { ok: false; status: number; error: string }
> {
  const gate = await requireDashboardAuth(request);
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error };
  }

  if (!businessWhatsAppReady(gate.business)) {
    return {
      ok: false,
      status: 403,
      error: "WhatsApp is not connected. Scan the QR code in the dashboard.",
    };
  }

  return { ok: true, business: gate.business, accessToken: "" };
}

/** Auth without requiring a business (profile setup, QR status). */
export async function requireDashboardUser(
  request: Request
): Promise<
  | { ok: true; userId: number; business: Business | null; businessId: number | null }
  | { ok: false; status: number; error: string }
> {
  const token = bearerToken(request);
  if (!token) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return { ok: false, status: 401, error: "Invalid or expired session." };
  }

  const business = await resolveBusinessForUser(
    payload.userId,
    payload.businessId
  );

  if (business) {
    await enforceBusinessAccess(business, payload.userId);
  }

  return {
    ok: true,
    userId: payload.userId,
    business,
    businessId: business?.id ?? null,
  };
}

/** Logged in; allows checkout when trial/subscription access is blocked. */
export async function requireDashboardUserForCheckout(
  request: Request
): Promise<
  | { ok: true; userId: number; business: Business | null; businessId: number | null }
  | { ok: false; status: number; error: string }
> {
  const token = bearerToken(request);
  if (!token) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return { ok: false, status: 401, error: "Invalid or expired session." };
  }

  const business = await resolveBusinessForUser(
    payload.userId,
    payload.businessId
  );

  return {
    ok: true,
    userId: payload.userId,
    business,
    businessId: business?.id ?? null,
  };
}
