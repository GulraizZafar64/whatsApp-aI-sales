/** Handler for /api/billing/overview */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/dashboard-business";
import {
  dailyUsageSeries,
  getPlanUsageSnapshot,
  usagePeriodStart,
} from "@/lib/plan-usage";
import { getCheckoutUrl, getEnterpriseWhatsAppUrl } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireDashboardUser(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (!gate.business) {
    return NextResponse.json({ error: "No business." }, { status: 403 });
  }

  const business = gate.business;
  const usage = await getPlanUsageSnapshot(business);
  const since = usagePeriodStart(business);
  const daily = await dailyUsageSeries(business.id, since, 30);

  return NextResponse.json({
    usage,
    daily,
    checkout: {
      starter: getCheckoutUrl("starter"),
      pro: getCheckoutUrl("pro"),
      enterpriseWhatsapp: getEnterpriseWhatsAppUrl(),
    },
  });
}
