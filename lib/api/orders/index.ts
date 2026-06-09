/** Handler for /api/completed-orders */
import { NextResponse } from "next/server";
import { Op } from "sequelize";
import { CompletedOrder, WhatsAppMessage } from "@/lib/models";
import { requireDashboardBusiness } from "@/lib/dashboard-business";
import { normalizeWaDigits } from "@/lib/phone-normalize";
import { formatCustomerPhoneDisplay } from "@/lib/customer-contact-display";
import { buildContactPhoneMap } from "@/lib/wa-resolve-display-phone";
import { getWhatsAppClient } from "@/lib/whatsapp-web/manager";
import { contactKey } from "@/lib/inbox";

export const dynamic = "force-dynamic";

async function customerNamesByWaId(
  waIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(waIds.map((w) => normalizeWaDigits(w)).filter(Boolean))];
  if (!unique.length) return map;

  const rows = await WhatsAppMessage.findAll({
    where: {
      senderWaId: { [Op.in]: unique },
      direction: "incoming",
      senderName: { [Op.ne]: null },
    },
    attributes: ["senderWaId", "senderName"],
    order: [["id", "DESC"]],
    limit: 500,
  });

  for (const r of rows) {
    const key = normalizeWaDigits(r.senderWaId);
    const name = r.senderName?.trim();
    if (key && name && !map.has(key)) {
      map.set(key, name);
    }
  }
  return map;
}

async function latestWhatsappChatIdsByWaId(
  businessId: number,
  waIds: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(waIds.map((w) => normalizeWaDigits(w)).filter(Boolean))];
  if (!unique.length) return new Map();

  const rows = await WhatsAppMessage.findAll({
    where: {
      businessId,
      senderWaId: { [Op.in]: unique },
      whatsappChatId: { [Op.ne]: null },
    },
    attributes: ["senderWaId", "whatsappChatId"],
    order: [["id", "DESC"]],
    limit: 500,
  });

  const map = new Map<string, string>();
  for (const r of rows) {
    const key = normalizeWaDigits(r.senderWaId);
    const chatId = r.whatsappChatId?.trim();
    if (key && chatId && !map.has(key)) {
      map.set(key, chatId);
    }
  }
  return map;
}

function resolveCustomerPhoneFromMaps(params: {
  customerWaId: string | null;
  chatId: string | null | undefined;
  lidPhoneMap: Record<string, string>;
}): string | null {
  if (!params.customerWaId?.trim()) return null;
  const direct = formatCustomerPhoneDisplay(
    params.chatId,
    params.customerWaId
  );
  if (direct) return direct;
  const key = contactKey(params.customerWaId);
  return params.lidPhoneMap[key]?.trim() || null;
}

export async function GET(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const rows = await CompletedOrder.findAll({
      where: {
        businessId: gate.business.id,
        status: { [Op.ne]: "deleted" },
      },
      order: [["id", "DESC"]],
      limit: 200,
    });

    const waIds = rows
      .map((r) => r.customerWaId)
      .filter((w): w is string => Boolean(w?.trim()));
    const [names, chatIdsByWa] = await Promise.all([
      customerNamesByWaId(waIds),
      latestWhatsappChatIdsByWaId(gate.business.id, waIds),
    ]);

    let lidPhoneMap: Record<string, string> = {};
    const client = await getWhatsAppClient(gate.business.id);
    if (client) {
      const needsResolve = waIds.filter((w) => {
        const key = normalizeWaDigits(w);
        return !resolveCustomerPhoneFromMaps({
          customerWaId: w,
          chatId: chatIdsByWa.get(key),
          lidPhoneMap: {},
        });
      });
      if (needsResolve.length) {
        lidPhoneMap = await buildContactPhoneMap(client, needsResolve);
      }
    }

    const orders = rows.map((r) => {
      const waKey = r.customerWaId ? normalizeWaDigits(r.customerWaId) : "";
      const customerPhone = resolveCustomerPhoneFromMaps({
        customerWaId: r.customerWaId ?? null,
        chatId: waKey ? chatIdsByWa.get(waKey) : null,
        lidPhoneMap,
      });
      return {
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        quantitySold: r.quantitySold,
        unitPrice: String(r.unitPrice),
        lineTotal: String(r.lineTotal),
        orderSource: r.orderSource ?? "manual",
        deliveryNote: r.deliveryNote ?? null,
        customerWaId: r.customerWaId ?? null,
        customerName: waKey ? names.get(waKey) ?? null : null,
        customerPhone,
        status: r.status ?? "pending",
        orderGroupId: r.orderGroupId ?? null,
        hasOrderPaymentProof: Boolean(r.orderPaymentProof?.trim()),
        hasDeliveryPaymentProof: Boolean(r.deliveryPaymentProof?.trim()),
        createdAt:
          (r.get("createdAt") as Date | undefined)?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[api/completed-orders GET]", error);
    return NextResponse.json(
      { error: "Failed to load orders" },
      { status: 500 }
    );
  }
}
