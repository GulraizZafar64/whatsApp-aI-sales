import { Op } from "sequelize";
import { CompletedOrder } from "@/lib/models";
import {
  normalizeOrderStatus,
  pickGroupStatus,
  type OrderStatus,
} from "@/lib/order-requirements";
import {
  findProductIdsMentionedInText,
  isSimpleGreetingMessage,
  customerRequestsAddressUpdate,
  isOrderUpdateRequest,
} from "@/lib/whatsapp-catalog-match";
import { customerRequestsOrderUpdate } from "@/lib/order-customer-intent";

type ProductRef = { id: number; productName: string };

const ORDER_STATUS_INQUIRY_RE =
  /\b(?:order\s*status|order\s+ka\s+status|status\s+(?:kya|kia|hai|ha|batao|btao|check|dekh)|status\s*(?:kya|of|for)?|track(?:ing)?\s*(?:my\s*)?order|where\s+is\s+my\s+order|my\s+order|mera\s+order|kab\s+(?:aey?ga|aye\s*gi|deliver|milega|pohanch|pohonch|receive)|kitn[aei]\s+din|delivery\s+(?:kab|status)|deliver\s+(?:hoga|kab|when)|parcel\s+kahan|order\s+kya\s+hua|pehle\s+(?:wala\s+)?order|purana\s+order|old\s+order|when\s+(?:will|is)\s+(?:it\s+)?deliver|already\s+(?:placed\s+)?order|dispatch(?:ed)?|bhej\s+diya|nikal\s+gaya)\b|(?:what|kya)\s+is\s+(?:the\s+)?status/i;

export type CustomerOrderSummary = {
  orderGroupId: string | null;
  leadOrderId: number;
  status: OrderStatus;
  productSummary: string;
  totalBill: number;
  deliveryNote: string | null;
  createdAt: Date;
  lines: {
    id: number;
    productName: string;
    quantitySold: number;
    lineTotal: string;
  }[];
};

const DELIVERY_OR_ADDRESS_INQUIRY_RE =
  /\b(?:(?:mera|my|current|abhi(?:\s+ka)?)\s+(?:address|pata|delivery)|(?:address|pata|delivery)\s*(?:kya|kia|hai|ha|batao|btao|kahan|where|confirm|update|change)|(?:kahan|where)\s+(?:deliver|bhej|bhejna)|delivery\s+address)\b/i;

export function customerAsksOrderStatus(userText: string): boolean {
  const t = userText.trim();
  if (!t || t.length < 4) return false;
  return ORDER_STATUS_INQUIRY_RE.test(t);
}

/** Status, update, cancel-prep, or "what is my address" — must use database, not chat. */
export function customerAsksAboutExistingOrder(userText: string): boolean {
  const t = userText.trim();
  if (!t || t.length < 3) return false;
  if (customerAsksOrderStatus(t)) return true;
  if (customerRequestsOrderUpdate(t)) return true;
  if (isOrderUpdateRequest(t)) return true;
  if (customerRequestsAddressUpdate(t)) return true;
  if (DELIVERY_OR_ADDRESS_INQUIRY_RE.test(t)) return true;
  return false;
}

function normalizeDbStatus(raw: string | null | undefined): OrderStatus {
  return normalizeOrderStatus(raw);
}

/** Highest status among all lines in one checkout group (pending < accepted < …). */
export async function getOrderGroupStatus(
  businessId: number,
  customerWaId: string,
  orderGroupId: string
): Promise<OrderStatus | null> {
  const rows = await CompletedOrder.findAll({
    where: {
      businessId,
      customerWaId,
      orderGroupId,
      status: { [Op.ne]: "deleted" },
    },
    attributes: ["status"],
  });
  if (!rows.length) return null;
  return pickGroupStatus(
    rows.map((r) => normalizeDbStatus(r.status))
  );
}

export async function latestPendingOrderGroupId(
  businessId: number,
  customerWaId: string
): Promise<string | null> {
  const row = await CompletedOrder.findOne({
    where: {
      businessId,
      customerWaId,
      status: "pending",
    },
    order: [["id", "DESC"]],
    attributes: ["orderGroupId"],
  });
  const id = row?.orderGroupId?.trim();
  return id || null;
}

const GROUP_WINDOW_MS = 5 * 60 * 1000;

function groupOrderRows(
  rows: CompletedOrder[]
): CustomerOrderSummary[] {
  const sorted = [...rows].sort((a, b) => b.id - a.id);
  const groups: CustomerOrderSummary[] = [];

  for (const row of sorted) {
    const createdAt = row.get("createdAt") as Date | undefined;
    const t = createdAt?.getTime() ?? 0;
    const groupId = row.orderGroupId?.trim() || null;
    const prev = groups[groups.length - 1];

    const sameGroup = groupId && prev?.orderGroupId === groupId;
    const sameCustomer =
      (row.deliveryNote?.trim() ?? "") === (prev?.deliveryNote?.trim() ?? "");
    const prevT = prev?.createdAt.getTime() ?? 0;
    const closeInTime =
      prev && t > 0 && prevT > 0 && Math.abs(t - prevT) <= GROUP_WINDOW_MS;

    if (prev && (sameGroup || (!groupId && sameCustomer && closeInTime))) {
      prev.lines.push({
        id: row.id,
        productName: row.productName,
        quantitySold: row.quantitySold,
        lineTotal: String(row.lineTotal),
      });
      prev.totalBill += Number.parseFloat(String(row.lineTotal)) || 0;
      prev.status = pickGroupStatus([
        prev.status,
        normalizeDbStatus(row.status),
      ]);
      if (t > prevT && createdAt) prev.createdAt = createdAt;
    } else {
      const lineTotal = Number.parseFloat(String(row.lineTotal)) || 0;
      groups.push({
        orderGroupId: groupId,
        leadOrderId: row.id,
        status: normalizeDbStatus(row.status),
        productSummary: row.productName,
        totalBill: lineTotal,
        deliveryNote: row.deliveryNote ?? null,
        createdAt: createdAt ?? new Date(),
        lines: [
          {
            id: row.id,
            productName: row.productName,
            quantitySold: row.quantitySold,
            lineTotal: String(row.lineTotal),
          },
        ],
      });
    }
  }

  for (const g of groups) {
    if (g.lines.length > 1) {
      g.productSummary = g.lines.map((l) => l.productName).join(", ");
    }
  }

  return groups;
}

export async function fetchCustomerOrderSummaries(params: {
  businessId: number;
  customerWaId: string;
  userText?: string;
  products?: ProductRef[];
  limit?: number;
  /** When true, return latest DB orders as-is — never filter by chat product mentions. */
  authoritativeDbContext?: boolean;
}): Promise<CustomerOrderSummary[]> {
  const rows = await CompletedOrder.findAll({
    where: {
      businessId: params.businessId,
      customerWaId: params.customerWaId,
      status: { [Op.ne]: "deleted" },
    },
    order: [["id", "DESC"]],
    limit: 80,
  });

  let groups = groupOrderRows(rows);

  const text = params.userText?.trim();
  const skipProductFilter =
    params.authoritativeDbContext === true ||
    (text ? customerAsksAboutExistingOrder(text) : false);

  if (text && params.products?.length && !skipProductFilter) {
    const productIds = findProductIdsMentionedInText(text, params.products);
    if (productIds.length > 0) {
      const filtered = groups.filter((g) =>
        g.lines.some((line) => {
          const ids = findProductIdsMentionedInText(
            line.productName,
            params.products!
          );
          return ids.some((id) => productIds.includes(id));
        })
      );
      if (filtered.length > 0) groups = filtered;
    }
  }

  const max = params.limit ?? 5;
  return groups.slice(0, max);
}

export function orderStatusSystemPromptBlock(
  orders: CustomerOrderSummary[]
): string {
  if (!orders.length) {
    return (
      "CUSTOMER ORDER HISTORY (database): none for this phone number. " +
      "If they ask about an old order, say no order was found and offer to help place a new one."
    );
  }

  const lines = orders.map((o) => {
    const date = o.createdAt.toISOString().slice(0, 10);
    const items = o.lines
      .map((l) => `${l.quantitySold}× ${l.productName}`)
      .join("; ");
    return (
      `- Order #${o.leadOrderId} (${date}): ${items}; total ${o.totalBill.toFixed(2)}; ` +
      `status=${o.status.toUpperCase()}; delivery=${o.deliveryNote?.trim() || "—"}`
    );
  });

  return [
    "CUSTOMER ORDER HISTORY (database — the ONLY source for order status, items, and delivery address):",
    "The business owner may edit orders in the dashboard (address, status). Chat history can be WRONG or outdated — NEVER quote address or status from older messages.",
    ...lines,
    "Status meanings: PENDING=received awaiting owner; ACCEPTED=confirmed preparing; CANCELLATION_REQUESTED=customer asked to cancel accepted order; CANCELLED=cancelled; REJECTED=rejected; DISPATCHED=sent/out for delivery; COMPLETE=delivered/done.",
    "If the customer asks about their order status, delivery time, delivery address, or wants to update an order, answer using ONLY this database block.",
    "When showing current address for an order update, read delivery= from here — not from chat.",
    "STATUS vs UPDATE: If they only ask status/address, give info only — emit [[ORDER_EVENT:{\"event\":\"order_status\"}]] and do NOT modify their order.",
    "ORDER UPDATE: When customer asks to update/change order — read ONLY this database block for which order exists and what items/address are saved. NEVER infer from chat history. Allowed ONLY when status=PENDING.",
    "If status is ACCEPTED, DISPATCHED, or COMPLETE, say it cannot be changed and offer to place a NEW separate order.",
  ].join("\n");
}

/** Highlight the active pending order for update flows. */
export function activePendingOrderDbBlock(
  orders: CustomerOrderSummary[]
): string {
  const pending = orders.find((o) => o.status === "pending");
  if (!pending) return "";
  const items = pending.lines
    .map((l) => `${l.quantitySold}× ${l.productName}`)
    .join(", ");
  const addr = pending.deliveryNote?.trim() || "—";
  return [
    "ACTIVE PENDING ORDER (database — use this when customer asks to update or asks current address):",
    `- Order #${pending.leadOrderId}: ${items}; status=PENDING; delivery=${addr}`,
    "This delivery address is what is saved in the dashboard right now. Ignore any different address mentioned in chat.",
  ].join("\n");
}

export function isOrderStatusOnlyMessage(userText: string): boolean {
  if (!customerAsksOrderStatus(userText)) return false;
  if (
    /\b(?:order\s+kar|order\s+karo|mujhe\s+chahiye|i\s+want\s+to\s+order|confirm\s+order|naya\s+order|new\s+order|add\s+\d+|add\s+\w+|extra|aur\s+\d+|update\s+my\s+order|change\s+my\s+order|order\s+update|order\s+change)\b/i.test(
      userText
    )
  ) {
    return false;
  }
  return true;
}

/** True when checkout must not run (status-only, simple hello, etc.). */
export function shouldSkipOrderCheckoutForMessage(userText: string): boolean {
  if (isSimpleGreetingMessage(userText)) return true;
  return customerAsksOrderStatus(userText) && isOrderStatusOnlyMessage(userText);
}
