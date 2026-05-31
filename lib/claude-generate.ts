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
} {
  let body = text.trim();
  const orders: ParsedWhatsAppOrderFooter[] = [];
  let ids: number[] = [];

  for (;;) {
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

    break;
  }

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

/** Max tokens for each AI reply (Anthropic `max_tokens`). */
export const MAX_TOKENS_PER_MESSAGE = 250;

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

  // ── Call the API ─────────────────────────────────────────────────────────

  const res = await fetch("https://api.anthropic.com/v1/messages", {
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
