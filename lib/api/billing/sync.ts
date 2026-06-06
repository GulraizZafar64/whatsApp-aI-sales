/** Handler for /api/billing/sync */
import { NextResponse } from "next/server";
import { requireDashboardUserForCheckout } from "@/lib/dashboard-business";
import { readBusinessBilling } from "@/lib/business-billing";
import { applyPaidSubscription } from "@/lib/whop-billing-sync";
import { fetchWhopMembershipPeriodEnd } from "@/lib/whop-api";

/** After returning from Whop, client can poll until webhook/return updates billing. */
export async function POST(request: Request) {
  const gate = await requireDashboardUserForCheckout(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (!gate.business) {
    return NextResponse.json({ error: "No business." }, { status: 403 });
  }

  const business = gate.business;
  const billing = readBusinessBilling(business);

  if (billing.billingStatus === "active") {
    return NextResponse.json({
      ok: true,
      billing: {
        plan: billing.plan,
        billingStatus: billing.billingStatus,
        periodEndsAt: billing.periodEndsAt?.toISOString() ?? null,
      },
    });
  }

  const membershipId = business.whopMembershipId?.trim();
  if (membershipId) {
    const periodEndsAt = await fetchWhopMembershipPeriodEnd(membershipId);
    await applyPaidSubscription(
      business,
      {
        metadata: { businessId: String(business.id), plan: business.plan },
        renewal_period_end: periodEndsAt?.toISOString(),
      },
      membershipId
    );
    await business.reload();
    const updated = readBusinessBilling(business);
    return NextResponse.json({
      ok: true,
      synced: true,
      billing: {
        plan: updated.plan,
        billingStatus: updated.billingStatus,
        periodEndsAt: updated.periodEndsAt?.toISOString() ?? null,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    synced: false,
    billing: {
      plan: billing.plan,
      billingStatus: billing.billingStatus,
      periodEndsAt: billing.periodEndsAt?.toISOString() ?? null,
    },
  });
}
