/** Handler for /api/billing/cancel */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/dashboard-business";
import { cancelWhopMembership } from "@/lib/whop-api";

export async function POST(request: Request) {
  const gate = await requireDashboardUser(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  if (!gate.business) {
    return NextResponse.json({ error: "No business." }, { status: 403 });
  }

  const membershipId = gate.business.whopMembershipId?.trim();
  if (!membershipId) {
    return NextResponse.json(
      { error: "No active Whop subscription found for this account." },
      { status: 400 }
    );
  }

  let mode: "at_period_end" | "immediate" = "at_period_end";
  try {
    const body = (await request.json()) as { mode?: string };
    if (body.mode === "immediate") mode = "immediate";
  } catch {
    /* default at_period_end */
  }

  const result = await cancelWhopMembership(membershipId, mode);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  await gate.business.update({
    cancelAtPeriodEnd: mode === "at_period_end",
    ...(mode === "immediate"
      ? { billingStatus: "expired", periodEndsAt: new Date() }
      : {}),
  });

  return NextResponse.json({
    ok: true,
    cancelAtPeriodEnd: mode === "at_period_end",
    message:
      mode === "at_period_end"
        ? "Your subscription will end at the close of this billing period. You keep access until then."
        : "Your subscription was cancelled immediately.",
  });
}
