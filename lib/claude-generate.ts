import { anthropicModelFromEnv } from "@/lib/claude-env";
import { buildWhatsAppAiSystemPrompt } from "@/lib/whatsapp-ai-prompt";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: {
        type: "base64";
        media_type: string;
        data: string;
      };
    };

/** A single turn in the conversation (role + content blocks). */
export type ConversationTurn = {
  role: "user" | "assistant";
  content: AnthropicContentBlock[] | string;
};

type MessagesResponse = {
  content?: { type: string; text?: string }[];
  error?: { type?: string; message?: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse data URL → Anthropic image block (raw base64, no prefix). */
export function dataUrlToAnthropicImage(
  dataUrl: string
): AnthropicContentBlock | null {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(
    dataUrl.trim()
  );
  if (!m) return null;
  const mediaType = m[1].toLowerCase();
  if (!mediaType.startsWith("image/")) return null;
  const data = m[2].replace(/\s/g, "");
  if (data.length > 5_000_000) return null;
  return {
    type: "image",
    source: { type: "base64", media_type: mediaType, data },
  };
}

export type ParsedWhatsAppOrderFooter = {
  productId: number;
  quantity: number;
  unitPrice: number;
};

export type ParsedAiOrderJsonItem = {
  productId: number;
  quantity: number;
  unitPrice: number;
  size?: string;
};

/** Structured order payload from [[ORDER_JSON:{…}]] — authoritative for DB save. */
export type ParsedAiOrderJson = {
  items: ParsedAiOrderJsonItem[];
  address?: string;
};

export type OrderJsonValidation = {
  ok: true;
  data: ParsedAiOrderJson;
} | {
  ok: false;
  errors: string[];
  partial: ParsedAiOrderJson | null;
};

const MAX_ORDER_JSON_ITEMS = 20;
const MAX_ORDER_QTY = 10_000;

/** Extract `{…}` payload after [[ORDER_JSON: using balanced braces (nested-safe). */
export function extractOrderJsonPayloadFromText(text: string): string | null {
  const marker = "[[ORDER_JSON:";
  let searchFrom = 0;
  let best: string | null = null;

  while (searchFrom < text.length) {
    const idx = text.indexOf(marker, searchFrom);
    if (idx < 0) break;
    let i = idx + marker.length;
    while (i < text.length && /\s/.test(text[i]!)) i++;
    if (text[i] !== "{") {
      searchFrom = idx + marker.length;
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
    searchFrom = idx + marker.length;
  }

  return best;
}

function stripOrderJsonTags(text: string): string {
  let out = text;
  while (true) {
    const idx = out.indexOf("[[ORDER_JSON:");
    if (idx < 0) break;
    const payload = extractOrderJsonPayloadFromText(out.slice(idx));
    if (!payload) {
      out = out.slice(0, idx) + out.slice(idx + "[[ORDER_JSON:".length);
      continue;
    }
    const payloadStart = out.indexOf(payload, idx);
    if (payloadStart < 0) break;
    let end = payloadStart + payload.length;
    while (end < out.length && /\s/.test(out[end]!)) end++;
    if (out.slice(end, end + 2) === "]]") end += 2;
    out = (out.slice(0, idx) + out.slice(end)).trim();
  }
  return out;
}

export function validateParsedAiOrderJson(
  data: ParsedAiOrderJson,
  validProductIds?: ReadonlySet<number>
): OrderJsonValidation {
  const errors: string[] = [];

  if (!data.items.length) {
    errors.push("items array is empty");
  }
  if (data.items.length > MAX_ORDER_JSON_ITEMS) {
    errors.push(`too many items (max ${MAX_ORDER_JSON_ITEMS})`);
  }

  for (const [i, item] of data.items.entries()) {
    if (!Number.isFinite(item.productId) || item.productId <= 0) {
      errors.push(`items[${i}].productId invalid`);
    } else if (validProductIds && !validProductIds.has(item.productId)) {
      errors.push(`items[${i}].productId ${item.productId} not in catalog`);
    }
    if (!Number.isFinite(item.quantity) || item.quantity < 1 || item.quantity > MAX_ORDER_QTY) {
      errors.push(`items[${i}].qty out of range`);
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      errors.push(`items[${i}].unitPrice invalid`);
    }
  }

  if (data.address != null && data.address.length > 0 && data.address.length < 4) {
    errors.push("address too short");
  }

  if (errors.length) {
    return { ok: false, errors, partial: data.items.length ? data : null };
  }
  return { ok: true, data };
}

export function parseOrderJsonPayload(raw: string): ParsedAiOrderJson | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const v = JSON.parse(trimmed) as Record<string, unknown>;
    if (!Array.isArray(v.items)) return null;
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
    if (!items.length) return null;
    const address =
      typeof v.address === "string"
        ? v.address.trim().slice(0, 2000)
        : undefined;
    const parsed: ParsedAiOrderJson = {
      items,
      address: address || undefined,
    };
    const validation = validateParsedAiOrderJson(parsed);
    return validation.ok ? validation.data : validation.partial;
  } catch {
    return null;
  }
}

export const ORDER_JSON_AI_HINT =
  'When the order is ready to save (items + address confirmed), end with [[ORDER_JSON:{"items":[{"productId":CATALOG_ID,"qty":1,"unitPrice":PRICE,"size":"Large"}],"address":"full delivery address"}]]. ' +
  "Include ONLY items the customer wants in this checkout — never add products from old chat unless they asked. " +
  "Use catalog productId, qty, unitPrice (customer or agreed bargain price), optional size, and full address. " +
  "This JSON is what gets saved to the database — it overrides [[ORDER:…]] / chat parsing.";

/** Parse [[ORDERS:…]] payload (semicolons or comma-separated id,qty,price triplets). */
export function parseOrdersFooterPayload(
  payload: string
): ParsedWhatsAppOrderFooter[] {
  const orders: ParsedWhatsAppOrderFooter[] = [];
  const trimmed = payload.trim();
  if (!trimmed) return orders;

  const pushTriple = (a: string, b: string, c: string) => {
    const parsed = parseOrderFooterTriple(a, b, c);
    if (parsed) orders.push(parsed);
  };

  const semiParts = trimmed
    .split(/[;|]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (semiParts.length > 1) {
    for (const part of semiParts) {
      const single = /^(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*$/.exec(part);
      if (single) {
        pushTriple(single[1], single[2], single[3]);
        continue;
      }
      const chunks = part.split(",").map((s) => s.trim());
      for (let i = 0; i + 2 < chunks.length; i += 3) {
        pushTriple(chunks[i]!, chunks[i + 1]!, chunks[i + 2]!);
      }
    }
    if (orders.length) return orders;
  }

  const chunks = trimmed.split(",").map((s) => s.trim());
  if (chunks.length >= 6 && chunks.length % 3 === 0) {
    for (let i = 0; i + 2 < chunks.length; i += 3) {
      pushTriple(chunks[i]!, chunks[i + 1]!, chunks[i + 2]!);
    }
    if (orders.length) return orders;
  }

  const single = /^(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*$/.exec(trimmed);
  if (single) {
    pushTriple(single[1], single[2], single[3]);
  }
  return orders;
}

function parseOrderFooterTriple(
  productIdRaw: string,
  qtyRaw: string,
  priceRaw: string
): ParsedWhatsAppOrderFooter | null {
  const productId = Number.parseInt(productIdRaw, 10);
  const quantity = Number.parseInt(qtyRaw, 10);
  const unitPrice = Number.parseFloat(priceRaw);
  if (
    Number.isFinite(productId) &&
    productId > 0 &&
    Number.isFinite(quantity) &&
    quantity > 0 &&
    Number.isFinite(unitPrice) &&
    unitPrice >= 0
  ) {
    return { productId, quantity, unitPrice };
  }
  return null;
}

/**
 * Strip hidden `[[ORDER:…]]`, `[[ORDERS:…]]`, and `[[PRODUCT_IDS:…]]` footers from the model reply.
 */
export function stripModelFooters(text: string): {
  body: string;
  ids: number[];
  orders: ParsedWhatsAppOrderFooter[];
  /** First order line (compat). */
  order: ParsedWhatsAppOrderFooter | null;
  /** Structured order from AI — preferred for DB save. */
  orderJson: ParsedAiOrderJson | null;
} {
  let body = text.trim();
  const orders: ParsedWhatsAppOrderFooter[] = [];
  let ids: number[] = [];
  let orderJson: ParsedAiOrderJson | null = null;

  for (;;) {
    const orderJsonM = /\[\[ORDER_JSON:\s*(\{[\s\S]*\})\]\]\s*$/i.exec(body);
    if (orderJsonM) {
      const extracted =
        extractOrderJsonPayloadFromText(`[[ORDER_JSON:${orderJsonM[1]}]]`) ??
        orderJsonM[1]!;
      const parsed = parseOrderJsonPayload(extracted);
      if (parsed) orderJson = parsed;
      body = body.slice(0, orderJsonM.index).trim();
      continue;
    }

    const ordersM = /\[\[ORDERS:([^\]]+)\]\]\s*$/i.exec(body);
    if (ordersM) {
      orders.push(...parseOrdersFooterPayload(ordersM[1]));
      body = body.slice(0, ordersM.index).trim();
      continue;
    }

    const orderM = /\[\[ORDER:(\d+),(\d+),([\d.]+)\]\]\s*$/i.exec(body);
    if (orderM) {
      const parsed = parseOrderFooterTriple(orderM[1], orderM[2], orderM[3]);
      if (parsed) orders.unshift(parsed);
      body = body.slice(0, orderM.index).trim();
      continue;
    }

    const pidM = /\[\[PRODUCT_IDS:([\d,\s]*)\]\]\s*$/i.exec(body);
    if (pidM) {
      ids = pidM[1]
        .split(/[,]+/)
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0);
      ids = [...new Set(ids)].slice(0, 3);
      body = body.slice(0, pidM.index).trim();
      continue;
    }

    const updateConfirmedM = /\[\[ORDER_UPDATE_CONFIRMED\]\]\s*$/i.exec(body);
    if (updateConfirmedM) {
      body = body.slice(0, updateConfirmedM.index).trim();
      continue;
    }

    const cancelM = /\[\[CANCEL_ORDER\]\]\s*$/i.exec(body);
    if (cancelM) {
      body = body.slice(0, cancelM.index).trim();
      continue;
    }

    break;
  }

  const jsonPayload = extractOrderJsonPayloadFromText(body);
  if (jsonPayload) {
    const parsed = parseOrderJsonPayload(jsonPayload);
    if (parsed) orderJson = parsed;
  }
  for (const m of body.matchAll(/\[\[ORDER_JSON:\s*/gi)) {
    const slice = body.slice(m.index ?? 0);
    const payload = extractOrderJsonPayloadFromText(slice);
    if (payload) {
      const parsed = parseOrderJsonPayload(payload);
      if (parsed) orderJson = parsed;
    }
  }
  for (const m of body.matchAll(/\[\[ORDERS:([^\]]+)\]\]/gi)) {
    orders.push(...parseOrdersFooterPayload(m[1]!));
  }
  for (const m of body.matchAll(/\[\[ORDER:(\d+),(\d+),([\d.]+)\]\]/gi)) {
    const parsed = parseOrderFooterTriple(m[1]!, m[2]!, m[3]!);
    if (parsed) orders.push(parsed);
  }
  body = stripOrderJsonTags(body)
    .replace(/\[\[ORDERS:[^\]]+\]\]/gi, "")
    .replace(/\[\[ORDER:\d+,\d+,[\d.]+\]\]/gi, "")
    .replace(/\[\[PRODUCT_IDS:[^\]]*\]\]/gi, "")
    .replace(/\[\[ORDER_UPDATE_CONFIRMED\]\]/gi, "")
    .replace(/\[\[CANCEL_ORDER\]\]/gi, "")
    .trim();

  const dedupedOrders: ParsedWhatsAppOrderFooter[] = [];
  const seen = new Set<string>();
  for (const o of orders) {
    const key = `${o.productId}:${o.quantity}:${o.unitPrice}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedOrders.push(o);
  }

  return {
    body,
    ids,
    orders: dedupedOrders,
    order: dedupedOrders[0] ?? null,
    orderJson,
  };
}

/** @deprecated Use stripModelFooters */
export function stripProductIdFooter(text: string): {
  body: string;
  ids: number[];
} {
  const { body, ids } = stripModelFooters(text);
  return { body, ids };
}

/** Max tokens for main WhatsApp AI replies (Anthropic `max_tokens`). */
export const MAX_TOKENS_PER_MESSAGE = 400;

/** Max tokens for language-detection calls only. */
export const MAX_TOKENS_LANGUAGE_DETECT = 100;

// ─── Main function ────────────────────────────────────────────────────────────

export async function generateClaudeWhatsAppReply(params: {
  apiKey: string;
  systemPrompt: string;

  /** Full conversation history so far (oldest first).
   *  Each entry has role "user" | "assistant" and its content.
   *  Pass the COMPLETE history on every call so Claude remembers everything. */
  history: ConversationTurn[];

  /** The new customer message text (plain string). */
  userText: string;

  /** Labeled catalog photos for this turn only (product ID + name + data URL). */
  catalogReferenceImages?: {
    productId: number;
    productName: string;
    dataUrl: string;
  }[];

  /** Customer-sent WhatsApp image (data URL) for vision on this turn. */
  customerInboundImageDataUrl?: string;
}): Promise<string | null> {
  const key = params.apiKey.trim();
  if (!key) return null;

  const model = anthropicModelFromEnv();

  // ── Build content blocks for the NEW user turn ───────────────────────────

  const newUserContent: AnthropicContentBlock[] = [];

  for (const item of (params.catalogReferenceImages ?? []).slice(0, 6)) {
    newUserContent.push({
      type: "text",
      text: `Catalog photo — product ID ${item.productId}: ${item.productName}`,
    });
    const img = dataUrlToAnthropicImage(item.dataUrl);
    if (img) newUserContent.push(img);
  }

  const customerImg = params.customerInboundImageDataUrl
    ? dataUrlToAnthropicImage(params.customerInboundImageDataUrl)
    : null;
  if (customerImg) {
    newUserContent.push({
      type: "text",
      text: "Customer WhatsApp message includes this image:",
    });
    newUserContent.push(customerImg);
  }

  newUserContent.push({
    type: "text",
    text: params.userText.trim(),
  });

  // ── Assemble the full messages array (history + new turn) ────────────────

  const messages: ConversationTurn[] = [
    ...params.history,
    { role: "user", content: newUserContent },
  ];

  // ── Call the API (with retry) ─────────────────────────────────────────────
  let res: Response | null = null;
  let lastError: any = null;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS_PER_MESSAGE,
          system: buildWhatsAppAiSystemPrompt(params.systemPrompt),
          messages,
        }),
      });
      if (res.ok) break;
      const errorData = await res.json().catch(() => ({}));
      console.warn(`[claude] API attempt ${attempt} returned ${res.status}:`, errorData);
    } catch (err: any) {
      lastError = err;
      console.warn(`[claude] API attempt ${attempt} failed:`, err.message ?? err);
    }
    if (attempt < maxRetries) {
      const backoffMs = Math.min(8000, 1000 * 2 ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  if (!res) {
    console.error("[claude] All API retries failed. Last error:", lastError?.message ?? lastError);
    return null;
  }

  const data = (await res.json()) as MessagesResponse;

  if (!res.ok) {
    console.error(
      "[claude]",
      data.error?.message ?? `HTTP ${res.status}`,
      data.error?.type ?? ""
    );
    return null;
  }

  const parts = data.content ?? [];
  const raw = parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();

  if (!raw) return null;

  const maxChars = MAX_TOKENS_PER_MESSAGE * 4;
  return raw.length > maxChars ? `${raw.slice(0, maxChars - 1)}…` : raw;
}
