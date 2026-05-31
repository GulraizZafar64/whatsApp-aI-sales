import { NextResponse } from "next/server";
import { requireDashboardBusiness } from "@/lib/dashboard-business";
import { ensureDb } from "@/lib/sequelize";
import { WhatsAppMessage } from "@/lib/models";

export async function GET(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const phoneNumberId = gate.business.phoneNumberId.trim();

  try {
    await ensureDb();
    const rows = await WhatsAppMessage.findAll({
      where: { businessPhoneNumberId: phoneNumberId },
      order: [["createdAt", "DESC"]],
      limit: 500,
    });

    const messages = rows.map((m) => ({
      id: String(m.id),
      from: m.senderWaId,
      senderName: m.senderName,
      text: m.text,
      messageType: m.messageType,
      direction: m.direction,
      type: m.direction,
      status: m.status,
      businessPhoneNumberId: m.businessPhoneNumberId,
      createdAt:
        (m.get("createdAt") as Date | undefined)?.toISOString() ?? null,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[api/messages]", error);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}
