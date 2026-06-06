/** Handler for /api/messages */
import { NextResponse } from "next/server";
import type { InboxMessage } from "@/lib/inbox";
import {
  buildCatalogImageIndex,
  resolveInboxImagePreview,
} from "@/lib/inbox-message-media";
import { requireDashboardAuth } from "@/lib/dashboard-business";
import { Product, WhatsAppMessage } from "@/lib/models";
import { ensureDb } from "@/lib/sequelize";
import { buildContactPhoneMap } from "@/lib/wa-resolve-display-phone";
import { getWhatsAppClient } from "@/lib/whatsapp-web/manager";

export async function GET(request: Request) {
  const gate = await requireDashboardAuth(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const business = gate.business;
  const businessId = business.id;

  try {
    await ensureDb();

    const rows = await WhatsAppMessage.findAll({
      where: { businessId },
      order: [["createdAt", "DESC"]],
      limit: 500,
    });

    const products = await Product.findAll({
      where: { businessId },
      attributes: ["productName", "imagesJson"],
    });
    const catalog = buildCatalogImageIndex(products);

    const messages: InboxMessage[] = rows.map((m) => {
      const text = m.text;
      const messageType = m.messageType;
      return {
        id: String(m.id),
        from: m.senderWaId,
        whatsappChatId: m.whatsappChatId,
        senderName: m.senderName,
        text,
        messageType,
        direction: m.direction,
        status: m.status,
        businessId: m.businessId,
        outgoingSource: m.outgoingSource,
        createdAt:
          (m.get("createdAt") as Date | undefined)?.toISOString() ?? null,
        imagePreviewUrl: resolveInboxImagePreview(text, messageType, catalog),
      };
    });

    let contactPhones: Record<string, string> = {};
    const client = await getWhatsAppClient(businessId);
    if (client) {
      const waIds = [
        ...new Set(
          rows
            .map((r) => r.senderWaId)
            .filter((w): w is string => Boolean(w?.trim()))
        ),
      ];
      contactPhones = await buildContactPhoneMap(client, waIds);
    }

    return NextResponse.json({
      messages,
      contactPhones,
      waConnected: business.waStatus === "ready",
    });
  } catch (error) {
    console.error("[api/messages]", error);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}
