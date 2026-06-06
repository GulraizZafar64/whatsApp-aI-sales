/** Handler for /api/admin/users/[id] */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-request";
import {
  deleteAdminUser,
  getAdminUserDetail,
  updateAdminUser,
} from "@/lib/admin-service";

type RouteCtx = { params: Promise<{ id: string }> };

function parseUserId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(request: Request, ctx: RouteCtx) {
  const gate = requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const userId = parseUserId(id);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const detail = await getAdminUserDetail(userId);
  if (!detail) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const gate = requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const userId = parseUserId(id);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  let body: {
    email?: string;
    name?: string | null;
    password?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await updateAdminUser(userId, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, ctx: RouteCtx) {
  const gate = requireAdmin(request);
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const userId = parseUserId(id);
  if (!userId) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const result = await deleteAdminUser(userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
