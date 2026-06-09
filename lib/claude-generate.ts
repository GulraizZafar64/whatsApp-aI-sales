import { anthropicModelFromEnv } from "@/lib/claude-env";
import { buildWhatsAppAiSystemPrompt } from "@/lib/whatsapp-ai-prompt";
import { stripOrderEventTags } from "@/lib/order-ai-events";

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

export type ParsedAiOrderJsonItem = {
  productId: number;
  quantity: number;
  unitPrice: number;
  size?: string;
};

const HIDDEN_TAG_RE =
  /\[\[(?:ORDER_EVENT|ORDER_JSON|ORDERS?|PRODUCT_IDS|ORDER_UPDATE_CONFIRMED|CANCEL_ORDER):[^\]]*\]\]/gi;

/** Strip hidden machine tags from the customer-visible reply; keep [[PRODUCT_IDS:…]] ids. */
export function stripModelFooters(text: string): { body: string; ids: number[] } {
  let body = text.trim();
  let ids: number[] = [];

  for (;;) {
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
    const tailTag = /\[\[[^\]]+\]\]\s*$/i.exec(body);
    if (tailTag) {
      body = body.slice(0, tailTag.index).trim();
      continue;
    }
    break;
  }

  body = stripOrderEventTags(body.replace(HIDDEN_TAG_RE, "").trim());
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
