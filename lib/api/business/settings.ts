/** Handler for /api/business/settings */
import { NextResponse } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard-business";

export async function GET(request: Request) {
  const gate = await requireDashboardAuth(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const enabled = gate.business.aiAutoReplyEnabled !== false;
  return NextResponse.json({ aiAutoReplyEnabled: enabled });
}

export async function PATCH(request: Request) {
  const gate = await requireDashboardAuth(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: { aiAutoReplyEnabled?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.aiAutoReplyEnabled !== "boolean") {
    return NextResponse.json(
      { error: "aiAutoReplyEnabled must be a boolean." },
      { status: 400 }
    );
  }

  try {
    await gate.business.update({ aiAutoReplyEnabled: body.aiAutoReplyEnabled });
    return NextResponse.json({
      ok: true,
      aiAutoReplyEnabled: body.aiAutoReplyEnabled,
    });
  } catch (error) {
    console.error("[api/business/settings PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
