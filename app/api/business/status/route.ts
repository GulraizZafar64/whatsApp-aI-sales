import { NextResponse } from "next/server";
import { requireDashboardBusiness } from "@/lib/dashboard-business";

export const dynamic = "force-dynamic";

/** GET /api/business/status — needs_reconnect flag for dashboard banner. */
export async function GET(request: Request) {
  const auth = await requireDashboardBusiness(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const business = auth.business;
  return NextResponse.json({
    businessId: business.id,
    phoneNumberId: business.phoneNumberId,
    whatsappNumber: business.whatsappNumber,
    needsReconnect: Boolean(business.needsReconnect),
    businessAccountId: business.businessAccountId,
  });
}
