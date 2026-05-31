import { NextResponse } from "next/server";
import { requireDashboardBusiness } from "@/lib/dashboard-business";
import { ensureDb } from "@/lib/sequelize";
import { WhatsAppMessage } from "@/lib/models";

export async function POST(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const phoneNumberId = gate.business.phoneNumberId.trim();

  let body: { contactWaId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const contactWaId =
    typeof body.contactWaId === "string" ? body.contactWaId.trim() : "";
  if (!contactWaId) {
    return NextResponse.json({ error: "Missing contactWaId" }, { status: 400 });
  }

  try {
    await ensureDb();
    await WhatsAppMessage.update(
      { status: "read" },
      {
        where: {
          businessPhoneNumberId: phoneNumberId,
          senderWaId: contactWaId,
          direction: "incoming",
        },
      }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/messages/read]", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
