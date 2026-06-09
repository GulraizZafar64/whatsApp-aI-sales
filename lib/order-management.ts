import { Op, type Transaction } from "sequelize";
import {
  Business,
  CompletedOrder,
  OrderActionLog,
  User,
  WhatsAppMessage,
  type OrderActionPerformer,
} from "@/lib/models";
import { latestPendingOrderGroupId, fetchCustomerOrderSummaries } from "@/lib/customer-order-status";
import {
  isTerminalOrderStatus,
  normalizeOrderStatus,
  orderStatusLabel,
  pickGroupStatus,
  type OrderStatus,
} from "@/lib/order-requirements";
import {
  sendOwnerOrderEmail,
  type OrderEmailEvent,
  type OrderEmailPayload,
} from "@/lib/order-email";
import { resolveCustomerPhoneDisplay } from "@/lib/customer-contact-display";
import { normalizeWaDigits } from "@/lib/phone-normalize";
import { getSequelize } from "@/lib/sequelize";
import { resetCustomerCheckoutSession } from "@/lib/customer-order-session-reset";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-send";

export type OrderActionType =
  | "order_created"
  | "order_updated"
  | "order_cancelled"
  | "cancellation_requested"
  | "cancellation_approved"
  | "cancellation_rejected"
  | "order_accepted"
  | "order_completed"
  | "order_dispatched"
  | "order_rejected"
  | "status_changed";

const ACTIVE_STATUS_RANK: Partial<Record<OrderStatus, number>> = {
  pending: 0,
  cancellation_requested: 1,
  accepted: 2,
  dispatched: 3,
};

export type OrderGroupSnapshot = {
  orderGroupId: string;
  leadOrderId: number;
  previousStatus: OrderStatus;
  customerWaId: string;
  customerName: string | null;
  totalAmount: number;
  detailsText: string;
  lineIds: number[];
};

export async function resolveCustomerDisplayName(
  businessId: number,
  customerWaId: string
): Promise<string | null> {
  const norm = normalizeWaDigits(customerWaId) || customerWaId;
  const row = await WhatsAppMessage.findOne({
    where: {
      businessId,
      senderWaId: norm,
      direction: "incoming",
      senderName: { [Op.ne]: null },
    },
    order: [["id", "DESC"]],
    attributes: ["senderName"],
  });
  return row?.senderName?.trim() || null;
}

async function loadOrderGroupSnapshot(params: {
  businessId: number;
  orderGroupId: string;
  transaction?: Transaction;
}): Promise<OrderGroupSnapshot | null> {
  const rows = await CompletedOrder.findAll({
    where: {
      businessId: params.businessId,
      orderGroupId: params.orderGroupId,
      status: { [Op.ne]: "deleted" },
    },
    transaction: params.transaction,
    order: [["id", "ASC"]],
  });
  if (!rows.length) return null;

  const statuses = rows.map((r) => normalizeOrderStatus(r.status));
  const customerWaId = rows[0]?.customerWaId?.trim();
  if (!customerWaId) return null;

  const totalAmount = rows.reduce(
    (sum, r) => sum + (Number.parseFloat(String(r.lineTotal)) || 0),
    0
  );
  const detailsText = rows
    .map(
      (r) =>
        `${r.quantitySold}× ${r.productName} @ ${r.unitPrice} = ${r.lineTotal}`
    )
    .join("\n");

  const customerName = await resolveCustomerDisplayName(
    params.businessId,
    customerWaId
  );

  return {
    orderGroupId: params.orderGroupId,
    leadOrderId: rows[0]!.id,
    previousStatus: pickGroupStatus(statuses),
    customerWaId,
    customerName,
    totalAmount,
    detailsText,
    lineIds: rows.map((r) => r.id),
  };
}

export async function findActiveCustomerOrderGroup(params: {
  businessId: number;
  customerWaId: string;
}): Promise<OrderGroupSnapshot | null> {
  const pendingId = await latestPendingOrderGroupId(
    params.businessId,
    params.customerWaId
  );
  if (pendingId) {
    const snap = await loadOrderGroupSnapshot({
      businessId: params.businessId,
      orderGroupId: pendingId,
    });
    if (snap && !isTerminalOrderStatus(snap.previousStatus)) return snap;
  }

  const rows = await CompletedOrder.findAll({
    where: {
      businessId: params.businessId,
      customerWaId: params.customerWaId,
      status: {
        [Op.in]: ["pending", "accepted", "cancellation_requested", "dispatched"],
      },
    },
    order: [["id", "DESC"]],
    limit: 40,
  });

  const byGroup = new Map<string, CompletedOrder[]>();
  for (const row of rows) {
    const gid = row.orderGroupId?.trim();
    if (!gid) continue;
    const list = byGroup.get(gid) ?? [];
    list.push(row);
    byGroup.set(gid, list);
  }

  let best: OrderGroupSnapshot | null = null;
  for (const [orderGroupId] of byGroup) {
    const snap = await loadOrderGroupSnapshot({
      businessId: params.businessId,
      orderGroupId,
    });
    if (!snap || isTerminalOrderStatus(snap.previousStatus)) continue;
    const snapRank = ACTIVE_STATUS_RANK[snap.previousStatus] ?? -1;
    const bestRank = best
      ? (ACTIVE_STATUS_RANK[best.previousStatus] ?? -1)
      : -1;
    if (!best || snapRank >= bestRank) {
      best = snap;
    }
  }
  return best;
}

function actionDetailsLabel(actionType: OrderActionType, notes?: string | null): string {
  const base: Record<OrderActionType, string> = {
    order_created: "A new order was placed by the customer.",
    order_updated: "A pending order was updated by the customer.",
    order_cancelled: "The order was cancelled.",
    cancellation_requested: "The customer requested cancellation of an accepted order.",
    cancellation_approved: "You approved the customer's cancellation request.",
    cancellation_rejected: "You rejected the customer's cancellation request.",
    order_accepted: "The order was accepted.",
    order_completed: "The order was marked completed.",
    order_dispatched: "The order was marked dispatched.",
    order_rejected: "The order was rejected.",
    status_changed: "Order status was changed manually.",
  };
  const line = base[actionType] ?? "Order updated.";
  return notes?.trim() ? `${line} ${notes.trim()}` : line;
}

/** Owner inbox email — only high-signal customer actions (not accept/dispatch/complete). */
function shouldSendOwnerEmail(actionType: OrderActionType): boolean {
  return (
    actionType === "order_created" ||
    actionType === "order_cancelled" ||
    actionType === "cancellation_requested"
  );
}

function emailEventForAction(actionType: OrderActionType): OrderEmailEvent {
  switch (actionType) {
    case "order_created":
      return "order_created";
    case "order_updated":
      return "order_updated";
    case "order_cancelled":
      return "order_cancelled";
    case "cancellation_requested":
      return "cancellation_requested";
    case "cancellation_approved":
      return "cancellation_approved";
    case "cancellation_rejected":
      return "cancellation_rejected";
    case "order_accepted":
      return "order_accepted";
    case "order_completed":
      return "order_completed";
    case "order_dispatched":
      return "order_dispatched";
    case "order_rejected":
      return "order_rejected";
    default:
      return "status_changed";
  }
}

async function emailCustomerPhoneFields(params: {
  businessId: number;
  customerWaId: string;
  whatsappChatId?: string | null;
}): Promise<{ customerPhone: string | null; customerContact: string }> {
  const phone = await resolveCustomerPhoneDisplay({
    businessId: params.businessId,
    customerWaId: params.customerWaId,
    whatsappChatId: params.whatsappChatId,
  });
  return {
    customerPhone: phone,
    customerContact: phone ?? "WhatsApp customer",
  };
}

async function getOwnerEmail(businessId: number): Promise<string | null> {
  const business = await Business.findByPk(businessId, {
    attributes: ["id", "ownerUserId", "businessName"],
  });
  if (!business) return null;
  const owner = await User.findByPk(business.ownerUserId, {
    attributes: ["email"],
  });
  return owner?.email?.trim() || null;
}

export async function appendOrderActionLog(
  params: {
    businessId: number;
    orderGroupId: string | null;
    leadOrderId: number | null;
    actionType: OrderActionType;
    previousStatus: OrderStatus | null;
    newStatus: OrderStatus | null;
    performedBy: OrderActionPerformer;
    performedByUserId?: number | null;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
  },
  transaction?: Transaction
): Promise<void> {
  await OrderActionLog.create(
    {
      businessId: params.businessId,
      orderGroupId: params.orderGroupId,
      leadOrderId: params.leadOrderId,
      actionType: params.actionType,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      performedBy: params.performedBy,
      performedByUserId: params.performedByUserId ?? null,
      notes: params.notes ?? null,
      metadata: params.metadata ?? null,
    },
    { transaction }
  );
}

export type TransitionOrderGroupParams = {
  businessId: number;
  orderGroupId: string;
  lineIds?: number[];
  newStatus: OrderStatus;
  actionType: OrderActionType;
  performedBy: OrderActionPerformer;
  performedByUserId?: number | null;
  notes?: string | null;
  notifyCustomer?: boolean;
  customerMessage?: string;
  contactRawWaId?: string;
  whatsappChatId?: string;
  notifyOwnerEmail?: boolean;
  metadata?: Record<string, unknown>;
};

export type TransitionOrderGroupResult =
  | {
      ok: true;
      message: string;
      previousStatus: OrderStatus;
      newStatus: OrderStatus;
      leadOrderId: number;
      customerWaId: string;
      lineIds: number[];
    }
  | { ok: false; message: string; status?: number };

export async function transitionOrderGroup(
  params: TransitionOrderGroupParams
): Promise<TransitionOrderGroupResult> {
  const sequelize = getSequelize();
  const t = await sequelize.transaction();

  try {
    const snap = await loadOrderGroupSnapshot({
      businessId: params.businessId,
      orderGroupId: params.orderGroupId,
      transaction: t,
    });
    if (!snap) {
      await t.rollback();
      return { ok: false, message: "Order not found.", status: 404 };
    }

    const previousStatus = snap.previousStatus;
    const targetIds =
      params.lineIds?.length && params.lineIds.length > 0
        ? params.lineIds
        : snap.lineIds;

    const [affected] = await CompletedOrder.update(
      { status: params.newStatus },
      {
        where: {
          id: { [Op.in]: targetIds },
          businessId: params.businessId,
          orderGroupId: params.orderGroupId,
        },
        transaction: t,
      }
    );

    if (!affected) {
      await t.rollback();
      return {
        ok: false,
        message: "No order lines were updated. Please try again.",
        status: 409,
      };
    }

    await appendOrderActionLog(
      {
        businessId: params.businessId,
        orderGroupId: params.orderGroupId,
        leadOrderId: snap.leadOrderId,
        actionType: params.actionType,
        previousStatus,
        newStatus: params.newStatus,
        performedBy: params.performedBy,
        performedByUserId: params.performedByUserId,
        notes: params.notes,
        metadata: {
          lineIds: targetIds,
          ...params.metadata,
        },
      },
      t
    );

    await t.commit();

    const contactRaw =
      params.contactRawWaId?.trim() || snap.customerWaId;

    if (
      params.notifyCustomer !== false &&
      params.customerMessage?.trim() &&
      contactRaw
    ) {
      try {
        await sendWhatsAppTextMessage({
          businessId: params.businessId,
          toWaId: contactRaw,
          body: params.customerMessage.trim(),
        });
      } catch (e) {
        console.warn("[order-management] customer WhatsApp notify failed:", e);
      }
    }

    if (
      params.notifyOwnerEmail !== false &&
      shouldSendOwnerEmail(params.actionType)
    ) {
      const business = await Business.findByPk(params.businessId, {
        attributes: ["businessName"],
      });
      const ownerEmail = await getOwnerEmail(params.businessId);
      if (ownerEmail) {
        const contactFields = await emailCustomerPhoneFields({
          businessId: params.businessId,
          customerWaId: snap.customerWaId,
          whatsappChatId: params.whatsappChatId ?? params.contactRawWaId,
        });
        const emailPayload: OrderEmailPayload = {
          event: emailEventForAction(params.actionType),
          businessName: business?.businessName ?? null,
          orderId: snap.leadOrderId,
          orderGroupId: params.orderGroupId,
          customerName: snap.customerName,
          ...contactFields,
          previousStatus,
          newStatus: params.newStatus,
          timestamp: new Date(),
          orderAmount: snap.totalAmount,
          orderDetails: snap.detailsText,
          actionDetails: actionDetailsLabel(params.actionType, params.notes),
        };
        void sendOwnerOrderEmail(ownerEmail, emailPayload);
      }
    }

    if (
      previousStatus === "pending" &&
      params.newStatus !== "pending" &&
      snap.customerWaId
    ) {
      try {
        await resetCustomerCheckoutSession({
          businessId: params.businessId,
          customerWaId: snap.customerWaId,
        });
      } catch (e) {
        console.warn("[order-management] reset checkout session failed:", e);
      }
    }

    return {
      ok: true,
      message: `Order status updated to ${orderStatusLabel(params.newStatus)}.`,
      previousStatus,
      newStatus: params.newStatus,
      leadOrderId: snap.leadOrderId,
      customerWaId: snap.customerWaId,
      lineIds: targetIds,
    };
  } catch (e) {
    await t.rollback();
    console.error("[order-management] transitionOrderGroup", e);
    return {
      ok: false,
      message: "Could not update the order. Please try again.",
      status: 500,
    };
  }
}

const recentNotifyCache = new Map<string, number>();

export async function notifyNewOrUpdatedOrder(params: {
  businessId: number;
  orderGroupId: string;
  actionType: "order_created" | "order_updated";
  customerWaId: string;
  contactRawWaId?: string;
  whatsappChatId?: string;
  customerMessage?: string;
}): Promise<void> {
  // Deduplicate: same orderGroupId + actionType within 30 seconds → skip
  const dedupeKey = `${params.orderGroupId}:${params.actionType}`;
  const lastCalledAt = recentNotifyCache.get(dedupeKey);
  const now = Date.now();
  if (lastCalledAt && now - lastCalledAt < 30_000) {
    console.log(
      "[order-management] notifyNewOrUpdatedOrder deduped:",
      dedupeKey
    );
    return;
  }
  recentNotifyCache.set(dedupeKey, now);
  // Cleanup old entries to prevent memory leak
  if (recentNotifyCache.size > 200) {
    const cutoff = now - 60_000;
    for (const [key, ts] of recentNotifyCache) {
      if (ts < cutoff) recentNotifyCache.delete(key);
    }
  }

  const snap = await loadOrderGroupSnapshot({
    businessId: params.businessId,
    orderGroupId: params.orderGroupId,
  });
  if (!snap) return;

  await appendOrderActionLog({
    businessId: params.businessId,
    orderGroupId: params.orderGroupId,
    leadOrderId: snap.leadOrderId,
    actionType: params.actionType,
    previousStatus:
      params.actionType === "order_updated" ? "pending" : null,
    newStatus: "pending",
    performedBy: "customer",
    notes: null,
    metadata: { lineIds: snap.lineIds },
  });

  const business = await Business.findByPk(params.businessId, {
    attributes: ["businessName"],
  });
  const ownerEmail = await getOwnerEmail(params.businessId);
  if (ownerEmail && params.actionType === "order_created") {
    const contactFields = await emailCustomerPhoneFields({
      businessId: params.businessId,
      customerWaId: params.customerWaId,
      whatsappChatId: params.whatsappChatId ?? params.contactRawWaId,
    });
    void sendOwnerOrderEmail(ownerEmail, {
      event: emailEventForAction(params.actionType),
      businessName: business?.businessName ?? null,
      orderId: snap.leadOrderId,
      orderGroupId: params.orderGroupId,
      customerName: snap.customerName,
      ...contactFields,
      previousStatus: null,
      newStatus: "pending",
      timestamp: new Date(),
      orderAmount: snap.totalAmount,
      orderDetails: snap.detailsText,
      actionDetails: actionDetailsLabel(params.actionType),
    });
  }
}

export type CustomerOrderActionResult =
  | { handled: false }
  | { handled: true; message: string; customerNotified?: boolean };

export async function handleCustomerOrderCancel(params: {
  businessId: number;
  customerWaId: string;
  contactRawWaId: string;
  whatsappChatId?: string;
}): Promise<CustomerOrderActionResult> {
  const group = await findActiveCustomerOrderGroup({
    businessId: params.businessId,
    customerWaId: params.customerWaId,
  });

  if (!group) {
    return {
      handled: true,
      message:
        "We could not find an active order to cancel. If you need help, describe what you ordered.",
    };
  }

  const status = group.previousStatus;

  if (status === "pending") {
    const result = await transitionOrderGroup({
      businessId: params.businessId,
      orderGroupId: group.orderGroupId,
      newStatus: "cancelled",
      actionType: "order_cancelled",
      performedBy: "customer",
      notifyCustomer: false,
      contactRawWaId: params.contactRawWaId,
      whatsappChatId: params.whatsappChatId,
      notifyOwnerEmail: true,
    });
    return {
      handled: true,
      customerNotified: result.ok,
      message: result.ok
        ? result.message
        : "We could not cancel your order right now. Please try again or contact the business.",
    };
  }

  if (status === "accepted") {
    const result = await transitionOrderGroup({
      businessId: params.businessId,
      orderGroupId: group.orderGroupId,
      newStatus: "cancellation_requested",
      actionType: "cancellation_requested",
      performedBy: "customer",
      notifyCustomer: false,
      contactRawWaId: params.contactRawWaId,
      whatsappChatId: params.whatsappChatId,
      notifyOwnerEmail: true,
    });
    return {
      handled: true,
      customerNotified: result.ok,
      message: result.ok
        ? "Cancellation request submitted. The owner will review it."
        : "We could not submit your cancellation request. Please try again.",
    };
  }

  if (status === "cancellation_requested") {
    return {
      handled: true,
      message:
        "Your cancellation request is already pending. The owner will approve or reject it soon.",
    };
  }

  return {
    handled: true,
    message: `Your order is ${orderStatusLabel(status)} and cannot be cancelled from chat. Please contact the business directly.`,
  };
}

export async function handleCustomerOrderUpdateBlock(params: {
  businessId: number;
  customerWaId: string;
}): Promise<CustomerOrderActionResult> {
  const orders = await fetchCustomerOrderSummaries({
    businessId: params.businessId,
    customerWaId: params.customerWaId,
    limit: 1,
  });
  const latest = orders[0];
  if (!latest) {
    return { handled: false };
  }

  if (latest.status === "pending") {
    return { handled: false };
  }

  const items = latest.lines
    .map((l) => `${l.quantitySold}× ${l.productName}`)
    .join(", ");
  const statusLabel = orderStatusLabel(latest.status);

  return {
    handled: true,
    message:
      `Your latest order (${items}) is ${statusLabel} and can no longer be changed.\n\n` +
      `To order something new, tell us what you want (e.g. product name and quantity).`,
  };
}

export async function ownerRespondToCancellation(params: {
  businessId: number;
  orderGroupId: string;
  approve: boolean;
  ownerUserId: number;
  lineIds?: number[];
}): Promise<TransitionOrderGroupResult> {
  const snap = await loadOrderGroupSnapshot({
    businessId: params.businessId,
    orderGroupId: params.orderGroupId,
  });

  if (!snap) {
    return { ok: false, message: "Order not found.", status: 404 };
  }

  const groupStatus = snap.previousStatus;

  if (groupStatus !== "cancellation_requested") {
    return {
      ok: false,
      message: "This order does not have a pending cancellation request.",
      status: 400,
    };
  }

  if (params.approve) {
    return transitionOrderGroup({
      businessId: params.businessId,
      orderGroupId: params.orderGroupId,
      lineIds: params.lineIds,
      newStatus: "cancelled",
      actionType: "cancellation_approved",
      performedBy: "owner",
      performedByUserId: params.ownerUserId,
      notifyCustomer: false,
      notifyOwnerEmail: false,
      notes: "Owner approved cancellation.",
    });
  }

  return transitionOrderGroup({
    businessId: params.businessId,
    orderGroupId: params.orderGroupId,
    lineIds: params.lineIds,
    newStatus: "accepted",
    actionType: "cancellation_rejected",
    performedBy: "owner",
    performedByUserId: params.ownerUserId,
    notifyCustomer: false,
    notifyOwnerEmail: false,
    notes: "Owner rejected cancellation.",
  });
}

export function actionTypeForOwnerStatusChange(
  previousStatus: OrderStatus,
  newStatus: OrderStatus,
  accept?: boolean
): OrderActionType {
  if (accept || (previousStatus === "pending" && newStatus === "accepted")) {
    return "order_accepted";
  }
  if (newStatus === "complete") return "order_completed";
  if (newStatus === "dispatched") return "order_dispatched";
  if (newStatus === "rejected") return "order_rejected";
  if (newStatus === "cancelled") return "order_cancelled";
  return "status_changed";
}

export function customerMessageForOwnerStatusChange(
  _newStatus: OrderStatus,
  _accept?: boolean
): string | undefined {
  // Status updates are dashboard-only — no automated WhatsApp to the customer.
  return undefined;
}
