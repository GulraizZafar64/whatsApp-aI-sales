import { NextResponse } from "next/server";
import { fn, col, Op } from "sequelize";
import {
  CompletedOrder,
  Product,
  WhatsAppMessage,
} from "@/lib/models";
import { requireDashboardBusiness } from "@/lib/dashboard-business";

export const dynamic = "force-dynamic";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function tenantWhere(phoneId: string) {
  return {
    [Op.or]: [
      { businessPhoneNumberId: phoneId },
      { businessPhoneNumberId: { [Op.is]: null } },
    ],
  };
}

export async function GET(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const phoneId = gate.business.phoneNumberId;
  const tenant = tenantWhere(phoneId);

  try {
    const aiRows = (await WhatsAppMessage.findAll({
      attributes: [
        "senderWaId",
        [fn("COUNT", col("WhatsAppMessage.id")), "count"],
      ],
      where: {
        [Op.and]: [
          { direction: "outgoing" },
          { outgoingSource: "ai" },
          tenant,
        ],
      },
      group: ["senderWaId"],
      raw: true,
    })) as unknown as { senderWaId: string; count: string }[];

    const perUser = aiRows.map((r) => ({
      contactWaId: r.senderWaId,
      displayPhone:
        digitsOnly(r.senderWaId).length >= 10
          ? `+${digitsOnly(r.senderWaId)}`
          : r.senderWaId,
      aiMessagesSent: Number.parseInt(String(r.count), 10) || 0,
    }));

    const totalAiMessages = perUser.reduce((s, x) => s + x.aiMessagesSent, 0);
    const usersWithAi = perUser.length;

    const manualTotal = await WhatsAppMessage.count({
      where: {
        [Op.and]: [
          { direction: "outgoing" },
          {
            [Op.or]: [
              { outgoingSource: "human" },
              { outgoingSource: { [Op.is]: null } },
            ],
          },
          tenant,
        ],
      },
    });

    const recentOrders = await CompletedOrder.findAll({
      where: { businessId: gate.business.id },
      order: [["id", "DESC"]],
      limit: 12,
    });

    const ordersPayload = recentOrders.map((r) => {
      const created = r.get("createdAt") as Date | undefined;
      return {
        id: r.id,
        productName: r.productName,
        quantitySold: r.quantitySold,
        lineTotal: String(r.lineTotal),
        createdAt: created ? created.toISOString() : null,
      };
    });

    const outOfStockCount = await Product.count({
      where: {
        businessId: gate.business.id,
        subtractOnOrder: true,
        quantity: { [Op.lte]: 0 },
      },
    });

    return NextResponse.json({
      phoneNumberId: phoneId,
      ai: {
        totalMessagesSent: totalAiMessages,
        uniqueUsers: usersWithAi,
        perUser,
      },
      manual: {
        totalMessagesSent: manualTotal,
      },
      orders: {
        recent: ordersPayload,
        outOfStockTrackedSkus: outOfStockCount,
      },
    });
  } catch (error) {
    console.error("[api/activity GET]", error);
    return NextResponse.json(
      { error: "Failed to load activity" },
      { status: 500 }
    );
  }
}
