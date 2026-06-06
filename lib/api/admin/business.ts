/** Handler for /api/admin/businesses/[id] */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-request";
import { updateAdminBusiness } from "@/lib/admin-service";

type RouteCtx = { params: Promise<{ id: string }> };

function parseBusinessId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const gate = requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const businessId = parseBusinessId(id);
  if (!businessId) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await updateAdminBusiness(businessId, {
    businessName:
      typeof body.businessName === "string" ? body.businessName : undefined,
    plan: typeof body.plan === "string" ? body.plan : undefined,
    billingStatus:
      typeof body.billingStatus === "string" ? body.billingStatus : undefined,
    periodEndsAt:
      body.periodEndsAt === null || typeof body.periodEndsAt === "string"
        ? (body.periodEndsAt as string | null)
        : undefined,
    quotaAiBonus:
      typeof body.quotaAiBonus === "number" ? body.quotaAiBonus : undefined,
    quotaContactsBonus:
      typeof body.quotaContactsBonus === "number"
        ? body.quotaContactsBonus
        : undefined,
    aiAutoReplyEnabled:
      typeof body.aiAutoReplyEnabled === "boolean"
        ? body.aiAutoReplyEnabled
        : undefined,
    whopMembershipId:
      body.whopMembershipId === null ||
      typeof body.whopMembershipId === "string"
        ? (body.whopMembershipId as string | null)
        : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
