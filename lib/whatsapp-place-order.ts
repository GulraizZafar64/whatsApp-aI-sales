import { CompletedOrder, Product } from "@/lib/models";
import {
  bargainFloorPrice,
  canOfferBargainFloor,
  customerUnitPrice,
} from "@/lib/product-pricing";
import { getSequelize } from "@/lib/sequelize";

export type WhatsAppOrderIntent = {
  productId: number;
  quantity: number;
  unitPrice: number;
  deliveryNote?: string;
};

const DUPLICATE_WINDOW_MS = 45 * 60 * 1000;

export async function placeWhatsAppCompletedOrders(params: {
  businessId: number;
  customerWaId: string;
  intents: WhatsAppOrderIntent[];
  deliveryNote?: string;
}): Promise<{
  createdCount: number;
  duplicateCount: number;
  orderIds: number[];
}> {
  const deliveryNote = params.deliveryNote?.trim().slice(0, 2000) || null;
  const orderIds: number[] = [];
  let createdCount = 0;

  let duplicateCount = 0;
  for (const intent of params.intents) {
    const result = await placeWhatsAppCompletedOrder({
      businessId: params.businessId,
      customerWaId: params.customerWaId,
      intent: { ...intent, deliveryNote: deliveryNote ?? undefined },
    });
    if (result.orderId != null) {
      orderIds.push(result.orderId);
    }
    if (result.created) {
      createdCount += 1;
    } else if (result.reason === "duplicate") {
      duplicateCount += 1;
    }
  }

  return { createdCount, duplicateCount, orderIds };
}

export async function placeWhatsAppCompletedOrder(params: {
  businessId: number;
  customerWaId: string;
  intent: WhatsAppOrderIntent;
}): Promise<{ created: boolean; orderId?: number; reason?: string }> {
  const qty = Math.max(1, Math.min(10_000, Math.floor(params.intent.quantity)));
  const unit = Math.max(0, params.intent.unitPrice);
  const lineTotal = (unit * qty).toFixed(2);
  const deliveryNote = params.intent.deliveryNote?.trim().slice(0, 2000) || null;

  const sequelize = getSequelize();
  const t = await sequelize.transaction();

  try {
    const row = await Product.findOne({
      where: { id: params.intent.productId, businessId: params.businessId },
      transaction: t,
    });
    if (!row) {
      await t.rollback();
      return { created: false, reason: "product_not_found" };
    }

    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
    const dup = await CompletedOrder.findOne({
      where: {
        businessId: params.businessId,
        productId: row.id,
        customerWaId: params.customerWaId,
      },
      order: [["id", "DESC"]],
      transaction: t,
    });
    if (dup) {
      const createdAt = dup.get("createdAt") as Date | undefined;
      if (createdAt && createdAt >= since) {
        await t.rollback();
        return { created: false, orderId: dup.id, reason: "duplicate" };
      }
    }

    if (row.subtractOnOrder && row.quantity < qty) {
      await t.rollback();
      return { created: false, reason: "out_of_stock" };
    }

    if (row.subtractOnOrder) {
      await row.update(
        { quantity: Math.max(0, row.quantity - qty) },
        { transaction: t }
      );
    }

    const order = await CompletedOrder.create(
      {
        businessId: params.businessId,
        productId: row.id,
        productName: row.productName,
        quantitySold: qty,
        unitPrice: unit.toFixed(2),
        lineTotal,
        customerWaId: params.customerWaId,
        deliveryNote,
        orderSource: "whatsapp",
      },
      { transaction: t }
    );

    await t.commit();
    return { created: true, orderId: order.id };
  } catch (e) {
    await t.rollback();
    console.error("[whatsapp-place-order]", e);
    return { created: false, reason: "error" };
  }
}

/** Default unit price when placing from address heuristic (no model footer). */
export function defaultWhatsAppOrderUnitPrice(
  product: Product,
  discountRequestCount: number
): number {
  const customer = customerUnitPrice(product);
  const floor = bargainFloorPrice(product);
  if (
    floor != null &&
    canOfferBargainFloor(discountRequestCount) &&
    floor < customer
  ) {
    return floor;
  }
  return customer;
}
