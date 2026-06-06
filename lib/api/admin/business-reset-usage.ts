/** Handler for /api/admin/businesses/[id]/reset-usage */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-request";
import { adminResetBusinessUsage } from "@/lib/admin-service";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const gate = requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const businessId = Number.parseInt(id, 10);
  if (!Number.isFinite(businessId) || businessId <= 0) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  const result = await adminResetBusinessUsage(businessId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
