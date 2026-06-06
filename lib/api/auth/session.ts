/** Handler for /api/auth/me */
import { NextResponse } from "next/server";
import { signAuthToken, verifyAuthToken } from "@/lib/auth/jwt";
import {
  getCheckoutUrl,
  getEnterpriseWhatsAppUrl,
  resolveBusinessAccess,
} from "@/lib/billing";
import { readBusinessBilling } from "@/lib/business-billing";
import {
  bearerToken,
  requireDashboardUser,
} from "@/lib/dashboard-business";
import { isBusinessProfileComplete } from "@/lib/business-type";
import { User } from "@/lib/models";
import { getWhatsAppAuthPath } from "@/lib/whatsapp-web/config";
import {
  getWhatsAppRestoreState,
  kickoffWhatsAppRestoreIfNeeded,
} from "@/lib/whatsapp-web/manager";
import { resolveWhatsAppStatusForApi } from "@/lib/whatsapp-web/resolve-status";
import { hasPersistedWhatsAppSession } from "@/lib/whatsapp-web/session-lock";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireDashboardUser(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  kickoffWhatsAppRestoreIfNeeded();
  const restore = getWhatsAppRestoreState();

  const user = await User.findByPk(gate.userId, {
    attributes: ["id", "email", "name"],
  });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const b = gate.business;

  let hasSavedSession = false;
  let waStatus = b?.waStatus ?? "disconnected";
  let needsQrModal = false;
  let waQrDataUrl: string | null = null;

  if (b) {
    const authPath = getWhatsAppAuthPath();
    hasSavedSession = await hasPersistedWhatsAppSession(authPath, b.id);

    const resolved = resolveWhatsAppStatusForApi({
      businessId: b.id,
      dbWaStatus: b.waStatus,
      dbQrDataUrl: b.waQrDataUrl,
      dbWhatsappNumber: b.whatsappNumber,
      hasSavedSession,
    });

    waStatus = resolved.status;
    waQrDataUrl = resolved.qrDataUrl;

    needsQrModal =
      waStatus === "qr" ||
      waStatus === "auth_failure" ||
      (!hasSavedSession && waStatus !== "ready" && waStatus !== "connecting");
  }

  const payload = verifyAuthToken(bearerToken(request));
  const tokenBusinessId = payload?.businessId ?? null;
  const needsTokenRefresh = Boolean(b?.id) && tokenBusinessId !== b!.id;

  const billing = b ? readBusinessBilling(b) : null;
  const access = b ? resolveBusinessAccess(b) : null;

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    businessId: b?.id ?? null,
    profileComplete: b ? isBusinessProfileComplete(b) : false,
    businessName: b?.businessName ?? null,
    businessType: b?.businessType ?? null,
    country: b?.country ?? null,
    currency: b?.currency ?? null,
    whatsappNumber: b?.whatsappNumber ?? null,
    waStatus,
    hasSavedSession,
    needsQrModal,
    waQrDataUrl,
    whatsappRestoreInProgress: restore.inProgress,
    billing: billing
      ? {
          plan: billing.plan,
          billingStatus: billing.billingStatus,
          periodEndsAt: billing.periodEndsAt?.toISOString() ?? null,
          accessAllowed: access?.allowed ?? true,
          blockReason: access?.allowed === false ? access.reason : null,
          starterCheckoutUrl: getCheckoutUrl("starter"),
          proCheckoutUrl: getCheckoutUrl("pro"),
          enterpriseWhatsappUrl: getEnterpriseWhatsAppUrl(),
        }
      : null,
    ...(needsTokenRefresh && b
      ? { token: signAuthToken({ userId: gate.userId, businessId: b.id }) }
      : {}),
  });
}
