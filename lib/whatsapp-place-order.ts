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
  /** Size/variant label saved with the line item, e.g. "Large". */
  lineLabel?: string;
};

const DUPLICATE_WINDOW_MS = 45 * 60 * 1000;

export async function placeWhatsAppCompletedOrders(params: {
  businessId: number;
  customerWaId: string;
  intents: WhatsAppOrderIntent[];
  deliveryNote?: string;
  status?: string;
  orderGroupId?: string;
  orderPaymentProof?: string | null;
  deliveryPaymentProof?: string | null;
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
      status: params.status,
      orderGroupId: params.orderGroupId,
      orderPaymentProof: params.orderPaymentProof,
      deliveryPaymentProof: params.deliveryPaymentProof,
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

/** Update an existing pending order group (add qty / new line) without creating a new checkout. */
export async function syncPendingOrderGroup(params: {
  businessId: number;
  customerWaId: string;
  orderGroupId: string;
  intents: WhatsAppOrderIntent[];
  deliveryNote?: string | null;
}): Promise<{ updated: number; created: number; orderIds: number[] }> {
  const deliveryNote = params.deliveryNote?.trim().slice(0, 2000) || null;
  const existing = await CompletedOrder.findAll({
    where: {
      businessId: params.businessId,
      customerWaId: params.customerWaId,
      orderGroupId: params.orderGroupId,
      status: "pending",
    },
  });

  if (!existing.length) {
    console.warn(
      "[whatsapp-place-order] sync skipped — no pending lines in group",
      params.orderGroupId
    );
    return { updated: 0, created: 0, orderIds: [] };
  }

  const byProductId = new Map(
    existing
      .filter((r) => r.productId != null)
      .map((r) => [r.productId as number, r])
  );

  let updated = 0;
  let created = 0;
  const orderIds: number[] = [];

  for (const intent of params.intents) {
    const qty = Math.max(1, Math.min(10_000, Math.floor(intent.quantity)));
    const unit = Math.max(0, intent.unitPrice);
    const lineTotal = (unit * qty).toFixed(2);
    const row = byProductId.get(intent.productId);

    if (row) {
      const productRow = await Product.findByPk(intent.productId);
      const productName = productRow
        ? orderLineProductName(productRow.productName, intent.lineLabel)
        : row.productName;
      await row.update({
        quantitySold: qty,
        unitPrice: unit.toFixed(2),
        lineTotal,
        productName,
        deliveryNote: deliveryNote ?? row.deliveryNote,
      });
      orderIds.push(row.id);
      updated += 1;
    } else {
      const result = await placeWhatsAppCompletedOrder({
        businessId: params.businessId,
        customerWaId: params.customerWaId,
        intent: { ...intent, deliveryNote: deliveryNote ?? undefined },
        status: "pending",
        orderGroupId: params.orderGroupId,
      });
      if (result.orderId != null) orderIds.push(result.orderId);
      if (result.created) created += 1;
    }
  }

  const keepProductIds = new Set(params.intents.map((i) => i.productId));
  for (const row of existing) {
    if (row.productId == null) continue;
    if (!keepProductIds.has(row.productId)) {
      await row.destroy();
    }
  }

  return { updated, created, orderIds };
}

function orderLineProductName(
  catalogName: string,
  lineLabel?: string | null
): string {
  const label = lineLabel?.trim();
  if (!label) return catalogName;
  if (catalogName.toLowerCase().includes(label.toLowerCase())) return catalogName;
  return `${catalogName} (${label})`;
}

export async function placeWhatsAppCompletedOrder(params: {
  businessId: number;
  customerWaId: string;
  intent: WhatsAppOrderIntent;
  status?: string;
  orderGroupId?: string;
  orderPaymentProof?: string | null;
  deliveryPaymentProof?: string | null;
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
      const dupStatus = (dup.status ?? "complete").trim().toLowerCase();
      const createdAt = dup.get("createdAt") as Date | undefined;
      if (
        dupStatus === "pending" &&
        createdAt &&
        createdAt >= since
      ) {
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
        productName: orderLineProductName(row.productName, params.intent.lineLabel),
        quantitySold: qty,
        unitPrice: unit.toFixed(2),
        lineTotal,
        customerWaId: params.customerWaId,
        deliveryNote,
        orderSource: "whatsapp",
        status: params.status ?? "pending",
        orderGroupId: params.orderGroupId ?? null,
        orderPaymentProof: params.orderPaymentProof ?? null,
        deliveryPaymentProof: params.deliveryPaymentProof ?? null,
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
