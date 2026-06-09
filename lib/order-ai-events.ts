import type { ParsedAiOrderJsonItem } from "@/lib/claude-generate";

export type WhatsAppConversationStage =
  | "default"
  | "order_just_confirmed"
  | "delivery_address_received"
  | "post_purchase_close";

export type OrderAiEventType =
  | "order_create"
  | "order_update"
  | "order_cancel"
  | "order_status";

export type ParsedOrderAiEvent = {
  event: OrderAiEventType;
  items: ParsedAiOrderJsonItem[];
  address?: string;
};

const ORDER_EVENT_MARKER = "[[ORDER_EVENT:";
const VALID_EVENTS = new Set<OrderAiEventType>([
  "order_create",
  "order_update",
  "order_cancel",
  "order_status",
]);
const MAX_ORDER_JSON_ITEMS = 20;
const MAX_ORDER_QTY = 10_000;

/** Extract `{…}` JSON after [[ORDER_EVENT: (balanced braces). */
export function extractOrderEventPayloadFromText(text: string): string | null {
  let searchFrom = 0;
  let best: string | null = null;

  while (searchFrom < text.length) {
    const idx = text.indexOf(ORDER_EVENT_MARKER, searchFrom);
    if (idx < 0) break;
    let i = idx + ORDER_EVENT_MARKER.length;
    while (i < text.length && /\s/.test(text[i]!)) i++;
    if (text[i] !== "{") {
      searchFrom = idx + ORDER_EVENT_MARKER.length;
      continue;
    }
    let depth = 0;
    const start = i;
    for (; i < text.length; i++) {
      const ch = text[i]!;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          best = text.slice(start, i + 1);
          break;
        }
      }
    }
    searchFrom = idx + ORDER_EVENT_MARKER.length;
  }

  return best;
}

function parseItemsFromEventObject(
  v: Record<string, unknown>
): ParsedAiOrderJsonItem[] {
  if (!Array.isArray(v.items)) return [];
  const items: ParsedAiOrderJsonItem[] = [];
  for (const row of v.items) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const productId = Number.parseInt(String(o.productId ?? o.id ?? ""), 10);
    const quantity = Number.parseInt(String(o.qty ?? o.quantity ?? 1), 10);
    const unitPrice = Number.parseFloat(String(o.unitPrice ?? o.price ?? 0));
    const sizeRaw =
      typeof o.size === "string"
        ? o.size
        : typeof o.variant === "string"
          ? o.variant
          : "";
    const size = sizeRaw.trim().slice(0, 80) || undefined;
    if (
      Number.isFinite(productId) &&
      productId > 0 &&
      Number.isFinite(quantity) &&
      quantity > 0 &&
      quantity <= MAX_ORDER_QTY
    ) {
      items.push({
        productId,
        quantity,
        unitPrice:
          Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0,
        size,
      });
    }
  }
  return items;
}

export function parseOrderAiEvent(raw: string): ParsedOrderAiEvent | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const v = JSON.parse(trimmed) as Record<string, unknown>;
    const eventRaw = String(v.event ?? "").trim().toLowerCase();
    if (!VALID_EVENTS.has(eventRaw as OrderAiEventType)) return null;

    const address =
      typeof v.address === "string"
        ? v.address.trim().slice(0, 2000)
        : undefined;

    return {
      event: eventRaw as OrderAiEventType,
      items: parseItemsFromEventObject(v),
      address: address || undefined,
    };
  } catch {
    return null;
  }
}

/** Parse [[ORDER_EVENT:{…}]] from the model reply — the only order action channel. */
export function parseOrderEventFromAiReply(rawReply: string): ParsedOrderAiEvent | null {
  const payload = extractOrderEventPayloadFromText(rawReply);
  if (!payload) return null;
  return parseOrderAiEvent(payload);
}

function validateEventItems(
  event: ParsedOrderAiEvent,
  validProductIds?: ReadonlySet<number>
): string[] {
  const errors: string[] = [];
  if (!event.items.length) errors.push("items array is empty");
  if (event.items.length > MAX_ORDER_JSON_ITEMS) {
    errors.push(`too many items (max ${MAX_ORDER_JSON_ITEMS})`);
  }
  for (const [i, item] of event.items.entries()) {
    if (!Number.isFinite(item.productId) || item.productId <= 0) {
      errors.push(`items[${i}].productId invalid`);
    } else if (validProductIds && !validProductIds.has(item.productId)) {
      errors.push(`items[${i}].productId ${item.productId} not in catalog`);
    }
    if (
      !Number.isFinite(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_ORDER_QTY
    ) {
      errors.push(`items[${i}].qty out of range`);
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      errors.push(`items[${i}].unitPrice invalid`);
    }
  }
  if (
    event.address != null &&
    event.address.length > 0 &&
    event.address.length < 4
  ) {
    errors.push("address too short");
  }
  return errors;
}

export function validateOrderAiEvent(
  event: ParsedOrderAiEvent,
  validProductIds?: ReadonlySet<number>,
  options?: { requireAddress?: boolean }
): { ok: true; data: ParsedOrderAiEvent } | { ok: false; errors: string[] } {
  if (event.event === "order_cancel" || event.event === "order_status") {
    return { ok: true, data: event };
  }

  const requireAddress = options?.requireAddress !== false;
  const errors = validateEventItems(event, validProductIds);
  if (
    requireAddress &&
    (event.event === "order_create" || event.event === "order_update") &&
    !event.address?.trim()
  ) {
    errors.push("address required for order_create/order_update");
  }
  if (errors.length) return { ok: false, errors };

  return { ok: true, data: event };
}

export function stripOrderEventTags(text: string): string {
  let out = text.trim();
  while (true) {
    const idx = out.indexOf(ORDER_EVENT_MARKER);
    if (idx < 0) break;
    const payload = extractOrderEventPayloadFromText(out.slice(idx));
    if (!payload) {
      out = out.slice(0, idx) + out.slice(idx + ORDER_EVENT_MARKER.length);
      continue;
    }
    const payloadStart = out.indexOf(payload, idx);
    if (payloadStart < 0) break;
    let end = payloadStart + payload.length;
    while (end < out.length && /\s/.test(out[end]!)) end++;
    if (out.slice(end, end + 2) === "]]") end += 2;
    out = (out.slice(0, idx) + out.slice(end)).trim();
  }
  return out.replace(/\[\[ORDER_EVENT:[^\]]*\]\]/gi, "").trim();
}

export const ORDER_EVENT_AI_HINT =
  "MANDATORY — every order action MUST end with exactly ONE [[ORDER_EVENT:{…}]] line (no text after it). " +
  'order_create — customer confirmed order: {"event":"order_create","items":[{"productId":ID,"qty":1,"unitPrice":PRICE,"size":"Large"}],"address":"full address if required"}. ' +
  'order_update — pending order changed after customer confirmed: {"event":"order_update","items":[...],"address":"..."}. ' +
  'order_cancel — customer wants to cancel: {"event":"order_cancel"}. ' +
  'order_status — customer asks order status / mera order: {"event":"order_status"} — reply using CUSTOMER ORDER HISTORY from database. ' +
  "Never say order is saved/cancelled/updated without the matching ORDER_EVENT. Never use legacy [[ORDER:…]] / [[ORDER_JSON:…]] tags.";
