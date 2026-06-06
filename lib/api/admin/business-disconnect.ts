/** Handler for /api/admin/businesses/[id]/disconnect-whatsapp */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-request";
import { adminDisconnectWhatsApp } from "@/lib/admin-service";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const gate = requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const businessId = Number.parseInt(id, 10);
  if (!Number.isFinite(businessId) || businessId <= 0) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  let clearSession = true;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      clearSession?: boolean;
    };
    if (body.clearSession === false) clearSession = false;
  } catch {
    /* default clear */
  }

  const result = await adminDisconnectWhatsApp(businessId, clearSession);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
