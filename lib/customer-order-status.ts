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
import type { CustomerLanguage } from "@/lib/customer-language";

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

function daysAgoLabel(date: Date, lang: CustomerLanguage): string {
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return lang === "ur_roman" ? "aaj" : "today";
  if (days === 1) return lang === "ur_roman" ? "1 din pehle" : "1 day ago";
  return lang === "ur_roman" ? `${days} din pehle` : `${days} days ago`;
}

export function orderStatusPhrase(
  status: OrderStatus,
  lang: CustomerLanguage
): string {
  if (lang === "ur_roman") {
    switch (status) {
      case "pending":
        return "aapka order receive ho gaya hai — abhi pending hai, owner jald confirm karega";
      case "accepted":
        return "aapka order accept ho chuka hai aur tayari ho rahi hai";
      case "cancellation_requested":
        return "aapki cancellation request owner ke paas pending hai";
      case "cancelled":
        return "aapka order cancel ho chuka hai";
      case "rejected":
        return "aapka order reject ho gaya hai";
      case "dispatched":
        return "aapka order dispatch ho chuka hai — delivery ke raaste par hai";
      case "complete":
        return "aapka order complete / deliver ho chuka hai";
      case "deleted":
        return "yeh order record mein nahi hai";
      default:
        return "order ki halat update ho chuki hai";
    }
  }
  switch (status) {
    case "pending":
      return "your order is received and pending — the owner will confirm soon";
    case "accepted":
      return "your order is accepted and being prepared";
    case "cancellation_requested":
      return "your cancellation request is pending owner approval";
    case "cancelled":
      return "your order has been cancelled";
    case "rejected":
      return "your order was rejected by the business";
    case "dispatched":
      return "your order has been dispatched and is on the way";
    case "complete":
      return "your order is completed / delivered";
    case "deleted":
      return "this order is no longer on file";
    default:
      return "your order status has been updated";
  }
}

function replyLang(lang: CustomerLanguage): "ur_roman" | "en" {
  return lang === "ur_roman" || lang === "ur_script" ? "ur_roman" : "en";
}

export function buildOrderStatusWhatsAppReply(params: {
  orders: CustomerOrderSummary[];
  lang: CustomerLanguage;
}): string {
  const { orders } = params;
  const lang = replyLang(params.lang);
  if (!orders.length) {
    return lang === "ur_roman"
      ? "Hamain is number par koi purana order nahi mila. Naya order ke liye product ka naam likh kar order likhein."
      : "We could not find a previous order for this chat. To place a new order, tell us what you want.";
  }

  if (orders.length === 1) {
    const o = orders[0]!;
    const when = daysAgoLabel(o.createdAt, lang);
    const items =
      o.lines.length === 1
        ? `${o.lines[0]!.quantitySold}× ${o.lines[0]!.productName}`
        : o.productSummary;
    const intro =
      lang === "ur_roman"
        ? `Aapka order (ID ${o.leadOrderId}, ${when}): ${items}.`
        : `Your order (ID ${o.leadOrderId}, ${when}): ${items}.`;
    const statusLine = orderStatusPhrase(o.status, lang);
    const footer =
      o.status === "pending"
        ? lang === "ur_roman"
          ? " Agar order change karna ho (item add/remove) to batayein — sirf jab tak pending hai."
          : " If you need to change this order (add/remove items), tell us — only while it is still pending."
        : lang === "ur_roman"
          ? " Is order mein ab change nahi ho sakta. Naya order karna ho to product likh kar batayein."
          : " This order can no longer be changed. To order again, tell us what you want.";
    return `${intro} ${statusLine}.${footer}`;
  }

  const header =
    lang === "ur_roman"
      ? "Aapke recent orders:"
      : "Your recent orders:";
  const lines = orders.slice(0, 3).map((o) => {
    const when = daysAgoLabel(o.createdAt, lang);
    const items =
      o.lines.length === 1
        ? o.lines[0]!.productName
        : `${o.lines.length} items`;
    const status =
      lang === "ur_roman"
        ? o.status === "dispatched"
          ? "dispatch"
          : o.status === "accepted"
            ? "accepted"
            : o.status === "pending"
              ? "pending"
              : o.status === "cancellation_requested"
                ? "cancel pending"
                : o.status === "cancelled"
                  ? "cancelled"
                  : o.status === "rejected"
                    ? "rejected"
                    : "complete"
        : o.status;
    return `• ${items} (${when}) — ${status}`;
  });
  const latest = orders[0]!;
  const latestLine =
    lang === "ur_roman"
      ? `\nSab se recent: ${orderStatusPhrase(latest.status, lang)}.`
      : `\nMost recent: ${orderStatusPhrase(latest.status, lang)}.`;
  return `${header}\n${lines.join("\n")}${latestLine}`;
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
    "STATUS vs UPDATE: If they only ask status/address, give info only — do NOT use [[ORDER:…]] or modify their order.",
    "ORDER UPDATE is allowed ONLY when status=PENDING. Show current order from this block, ask what to change, then apply after they confirm.",
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
