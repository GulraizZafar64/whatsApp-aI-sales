/** Handler for /api/admin/users */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-request";
import { listAdminUsers } from "@/lib/admin-service";

export async function GET(request: Request) {
  const gate = requireAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const users = await listAdminUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[admin/users]", error);
    return NextResponse.json(
      { error: "Failed to load users." },
      { status: 500 }
    );
  }
}
