/** Handler for /api/admin/businesses/[id]/subscription */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-request";
import { grantAdminSubscription } from "@/lib/admin-service";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const gate = requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const businessId = Number.parseInt(id, 10);
  if (!Number.isFinite(businessId) || businessId <= 0) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  let body: {
    plan?: string;
    days?: number;
    resetUsage?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plan = (body.plan ?? "starter").trim().toLowerCase();
  if (
    plan !== "starter" &&
    plan !== "pro" &&
    plan !== "enterprise" &&
    plan !== "trial"
  ) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const result = await grantAdminSubscription({
    businessId,
    plan: plan as "starter" | "pro" | "enterprise" | "trial",
    days: body.days,
    resetUsage: body.resetUsage !== false,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
