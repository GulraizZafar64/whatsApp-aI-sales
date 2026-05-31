import { NextResponse } from "next/server";
import { Op } from "sequelize";
import { CompletedOrder, WhatsAppMessage } from "@/lib/models";
import { requireDashboardBusiness } from "@/lib/dashboard-business";
import { normalizeWaDigits } from "@/lib/phone-normalize";

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

export async function GET(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const rows = await CompletedOrder.findAll({
      where: { businessId: gate.business.id },
      order: [["id", "DESC"]],
      limit: 200,
    });

    const waIds = rows
      .map((r) => r.customerWaId)
      .filter((w): w is string => Boolean(w?.trim()));
    const names = await customerNamesByWaId(waIds);

    const orders = rows.map((r) => {
      const waKey = r.customerWaId ? normalizeWaDigits(r.customerWaId) : "";
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
