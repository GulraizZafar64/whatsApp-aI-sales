import { anthropicModelFromEnv } from "@/lib/claude-env";
import type { ConversationTurn } from "@/lib/claude-generate";
import { MAX_TOKENS_LANGUAGE_DETECT } from "@/lib/claude-generate";
import { MAX_THREAD_MESSAGES_FOR_AI } from "@/lib/customer-language-detect";
import {
  parseCustomerLanguageCode,
  type CustomerLanguage,
} from "@/lib/customer-language";

export type CustomerPhotoIntent = {
  wantsPhotos: boolean;
  /** Customer explicitly asked to send/show a photo now (resend allowed). */
  explicitRequest: boolean;
  productIds: number[];
  /** Customer wants to browse the whole catalog with photos. */
  showAllCatalog: boolean;
};

const EMPTY_PHOTO_INTENT: CustomerPhotoIntent = {
  wantsPhotos: false,
  explicitRequest: false,
  productIds: [],
  showAllCatalog: false,
};

type CatalogProductRef = { id: number; productName: string };

function historySnippet(
  history: ConversationTurn[],
  maxTurns = MAX_THREAD_MESSAGES_FOR_AI
): string {
  const slice = history.slice(-maxTurns);
  return slice
    .map((t) => {
      const text =
        typeof t.content === "string"
          ? t.content
          : t.content
              .filter((b) => b.type === "text")
              .map((b) => ("text" in b ? b.text : ""))
              .join("\n");
      return `${t.role}: ${text.trim().slice(0, 400)}`;
    })
    .filter((line) => line.length > 6)
    .join("\n");
}

function parsePhotoIntentJson(
  raw: string,
  products: CatalogProductRef[]
): CustomerPhotoIntent {
  const validIds = new Set(products.map((p) => p.id));
  const jsonMatch = /\{[\s\S]*\}/.exec(raw.trim());
  if (!jsonMatch) return EMPTY_PHOTO_INTENT;

  try {
    const v = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const productIds = Array.isArray(v.productIds)
      ? v.productIds
          .map((x) => Number.parseInt(String(x), 10))
          .filter((id) => Number.isFinite(id) && id > 0 && validIds.has(id))
      : [];
    return {
      wantsPhotos: Boolean(v.wantsPhotos),
      explicitRequest: Boolean(v.explicitRequest),
      productIds: [...new Set(productIds)].slice(0, 3),
      showAllCatalog: Boolean(v.showAllCatalog),
    };
  } catch {
    return EMPTY_PHOTO_INTENT;
  }
}

/**
 * Language-agnostic photo intent via Claude — replaces manual keyword matching.
 */
export async function detectCustomerPhotoIntent(params: {
  apiKey: string;
  userText: string;
  products: CatalogProductRef[];
  history?: ConversationTurn[];
}): Promise<CustomerPhotoIntent> {
  const key = params.apiKey.trim();
  const userText = params.userText.trim();
  if (!key || !userText || userText.startsWith("[Voice")) {
    return EMPTY_PHOTO_INTENT;
  }

  const catalogLines = params.products
    .map((p) => `  id ${p.id}: ${p.productName}`)
    .join("\n");

  const system = [
    "You classify WhatsApp shop messages. The customer may write in ANY language or script.",
    "Output ONLY one JSON object (no markdown, no explanation).",
    "",
    "Catalog:",
    catalogLines || "  (empty)",
    "",
    "Fields:",
    '- wantsPhotos (boolean): true ONLY if they clearly want to see/send/share a photo or picture now.',
    '- explicitRequest (boolean): true if they explicitly asked to send/show/share a photo (e.g. "photo bhejo", "share kro", "dikhao", "send pic").',
    '- productIds (number[]): catalog ids they want photos of; [] if unclear.',
    '- showAllCatalog (boolean): true if browsing all products / what is available (with photos).',
    "",
    "General product questions (price, size, availability) without asking for a photo → wantsPhotos false, explicitRequest false.",
    "",
    "Use recent chat context when the latest message is short (e.g. yes, ok, ha).",
    'Example: {"wantsPhotos":true,"explicitRequest":true,"productIds":[2],"showAllCatalog":false}',
  ].join("\n");

  const userPayload = [
    params.history?.length ? `Recent chat:\n${historySnippet(params.history)}` : "",
    `Latest customer message:\n${userText}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: anthropicModelFromEnv(),
        max_tokens: MAX_TOKENS_LANGUAGE_DETECT,
        system,
        messages: [{ role: "user", content: userPayload }],
      }),
    });

    if (!res.ok) {
      console.warn("[claude-intent] photo intent HTTP", res.status);
      return EMPTY_PHOTO_INTENT;
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const raw = (data.content ?? [])
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("")
      .trim();

    const intent = parsePhotoIntentJson(raw, params.products);
    console.log("[claude-intent] photo intent", intent);
    return intent;
  } catch (err) {
    console.warn("[claude-intent] photo intent failed:", err);
    return EMPTY_PHOTO_INTENT;
  }
}

function parseLanguageJson(raw: string): CustomerLanguage {
  const jsonMatch = /\{[\s\S]*\}/.exec(raw.trim());
  if (!jsonMatch) return "other";
  try {
    const v = JSON.parse(jsonMatch[0]) as { language?: string };
    return parseCustomerLanguageCode(String(v.language ?? ""));
  } catch {
    return "other";
  }
}

/**
 * Language detection via Claude — replaces manual regex/keyword matching.
 */
export async function detectCustomerLanguageWithAi(params: {
  apiKey: string;
  userText: string;
  history?: ConversationTurn[];
}): Promise<CustomerLanguage> {
  const key = params.apiKey.trim();
  const userText = params.userText.trim();
  if (!key || !userText || userText.startsWith("[Voice")) {
    return "other";
  }

  const system = [
    "You detect the language of WhatsApp shop customer messages.",
    "Output ONLY one JSON object (no markdown, no explanation).",
    "",
    'Field language (string) — exactly one code:',
    "ur_roman = Urdu in Latin letters (Roman Urdu, e.g. kitne ka hai, mujhe shirt chahiye)",
    "ur_script = Urdu in Arabic script (اردو)",
    "ar = Arabic",
    "hi = Hindi (Devanagari)",
    "en = English",
    "zh = Chinese",
    "ja = Japanese",
    "ko = Korean",
    "fr = French",
    "de = German",
    "es = Spanish",
    "it = Italian",
    "pt = Portuguese",
    "other = any other language, or unclear / mixed",
    "",
    "Detect language from ALL customer messages in the chat history below (last 40 messages).",
    "The assistant must reply in that same language — weight recent messages more if the customer switched language.",
    "Use the full history when the latest message is very short (ok, yes, ha, ji, thanks).",
    "Roman Urdu MUST be ur_roman, not en, even though it uses Latin letters.",
    'Example: {"language":"fr"}',
  ].join("\n");

  const userPayload = [
    params.history?.length ? `Recent chat:\n${historySnippet(params.history)}` : "",
    `Latest customer message:\n${userText}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: anthropicModelFromEnv(),
        max_tokens: MAX_TOKENS_LANGUAGE_DETECT,
        system,
        messages: [{ role: "user", content: userPayload }],
      }),
    });

    if (!res.ok) {
      console.warn("[claude-intent] language detect HTTP", res.status);
      return "other";
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const raw = (data.content ?? [])
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("")
      .trim();

    const lang = parseLanguageJson(raw);
    console.log("[claude-intent] customer language", lang);
    return lang;
  } catch (err) {
    console.warn("[claude-intent] language detect failed:", err);
    return "other";
  }
}
