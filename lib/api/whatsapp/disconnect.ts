/** Handler for /api/whatsapp/disconnect */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/dashboard-business";
import { ensureDb } from "@/lib/sequelize";
import { disconnectWhatsAppClient } from "@/lib/whatsapp-web/manager";

export async function POST(request: Request) {
  const gate = await requireDashboardUser(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (!gate.businessId) {
    return NextResponse.json({ error: "No business." }, { status: 400 });
  }

  try {
    await ensureDb();
    await disconnectWhatsAppClient(gate.businessId);
    return NextResponse.json({ ok: true, status: "disconnected" });
  } catch (error) {
    console.error("[api/whatsapp/disconnect]", error);
    return NextResponse.json(
      { error: "Failed to disconnect WhatsApp." },
      { status: 500 }
    );
  }
}
