/** Handler for /api/billing/return */
import { NextResponse } from "next/server";
import { Business } from "@/lib/models";
import { ensureDb } from "@/lib/sequelize";
import { verifyCheckoutReturnToken } from "@/lib/checkout-return-token";
import { applyPaidSubscription } from "@/lib/whop-billing-sync";
import { fetchWhopMembershipPeriodEnd } from "@/lib/whop-api";

export const dynamic = "force-dynamic";

/**
 * Whop redirect after payment. Token ties checkout to our business row.
 * Webhook may arrive before or after this; both paths update billing.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  const membershipFromQuery =
    url.searchParams.get("membership_id")?.trim() ||
    url.searchParams.get("membershipId")?.trim() ||
    null;

  const payload = token ? verifyCheckoutReturnToken(token) : null;
  if (!payload) {
    return NextResponse.redirect(
      new URL("/dashboard?billing=error", request.url)
    );
  }

  await ensureDb();
  const business = await Business.findByPk(payload.businessId);
  if (!business || business.ownerUserId !== payload.userId) {
    return NextResponse.redirect(
      new URL("/dashboard?billing=error", request.url)
    );
  }

  const membershipId =
    membershipFromQuery?.startsWith("mem_")
      ? membershipFromQuery
      : business.whopMembershipId;

  if (membershipId) {
    const periodEndsAt = await fetchWhopMembershipPeriodEnd(membershipId);
    await applyPaidSubscription(
      business,
      {
        metadata: { businessId: String(business.id), plan: payload.plan },
        renewal_period_end: periodEndsAt?.toISOString(),
      },
      membershipId
    );
    console.log("[billing/return] synced from membership", {
      businessId: business.id,
      membershipId,
    });
  } else {
    console.log(
      "[billing/return] no membership id yet; webhook should activate",
      { businessId: business.id }
    );
  }

  return NextResponse.redirect(
    new URL("/dashboard?billing=success", request.url)
  );
}
