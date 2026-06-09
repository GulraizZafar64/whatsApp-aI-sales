import { franc } from "franc-min";
import type { ConversationTurn } from "@/lib/claude-generate";

/** Chat rows loaded for AI context (language + conversation). */
export const MAX_THREAD_MESSAGES_FOR_AI = 40;
import {
  parseCustomerLanguageCode,
  type CustomerLanguage,
} from "@/lib/customer-language";

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const DEVANAGARI_RE = /[\u0900-\u097F]/;
const CJK_RE = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
const HANGUL_RE = /[\uAC00-\uD7AF\u1100-\u11FF]/;
const KANA_RE = /[\u3040-\u30FF]/;

const ROMAN_URDU_HINT_RE =
  /\b(?:mujhe|muja|muji|aap|ap|kya|kia|kitne|kitna|chahiye|chiya|chiye|hai|ha|hain|nahi|nahin|theek|thik|batao|btao|krna|karna|krdo|kardo|shukriya|salam|ji+|han|haan|bhai|yar|acha|theek\s+hai)\b/i;

const FRANC_TO_CUSTOMER: Record<string, CustomerLanguage> = {
  eng: "en",
  urd: "ur_roman",
  ara: "ar",
  hin: "hi",
  cmn: "zh",
  zho: "zh",
  jpn: "ja",
  kor: "ko",
  fra: "fr",
  deu: "de",
  spa: "es",
  ita: "it",
  por: "pt",
};

/** All customer (user) text from thread history — up to last 40 DB messages merged into turns. */
export function allUserTextFromHistory(history: ConversationTurn[]): string {
  return history
    .filter((t) => t.role === "user")
    .map((t) =>
      typeof t.content === "string"
        ? t.content
        : t.content
            .filter((b) => b.type === "text")
            .map((b) => ("text" in b ? b.text : ""))
            .join("\n")
    )
    .filter(Boolean)
    .join("\n");
}

function scriptLanguage(text: string): CustomerLanguage | null {
  if (DEVANAGARI_RE.test(text)) return "hi";
  if (KANA_RE.test(text)) return "ja";
  if (HANGUL_RE.test(text)) return "ko";
  if (CJK_RE.test(text)) return "zh";
  if (ARABIC_SCRIPT_RE.test(text)) {
    return /[\u0679\u0686\u0691\u0698\u06AF\u06BE\u06C1\u06D2\u06CC\u06AF\u06CC\u06A9\u06BE]/.test(
      text
    )
      ? "ur_script"
      : "ar";
  }
  return null;
}

function francLanguage(text: string): CustomerLanguage {
  const code = franc(text, { minLength: 3 });
  if (!code || code === "und") return "other";
  return FRANC_TO_CUSTOMER[code] ?? "other";
}

/**
 * Fast local language detection — no API call.
 * Roman Urdu vs English uses word hints; Urdu script vs Arabic uses character ranges.
 */
export function detectCustomerLanguageLocal(params: {
  userText: string;
  history?: ConversationTurn[];
}): CustomerLanguage {
  const latest = params.userText.trim();
  if (!latest || latest.startsWith("[Voice")) return "other";

  // Latin-only without Roman Urdu hints → English (place names, short English replies).
  if (
    /^[a-z0-9\s,.\-#'"/]+$/i.test(latest) &&
    !ROMAN_URDU_HINT_RE.test(latest)
  ) {
    return "en";
  }

  const userHistory = allUserTextFromHistory(params.history ?? []);
  const combined = userHistory ? `${userHistory}\n${latest}`.trim() : latest;

  const fromScript = scriptLanguage(combined);
  if (fromScript) return fromScript;

  if (ROMAN_URDU_HINT_RE.test(combined) && !ARABIC_SCRIPT_RE.test(combined)) {
    return "ur_roman";
  }

  const fromFranc = francLanguage(combined);

  if (fromFranc === "en" && ROMAN_URDU_HINT_RE.test(combined)) {
    return "ur_roman";
  }
  if (fromFranc === "ur_roman" && !ROMAN_URDU_HINT_RE.test(combined)) {
    return "en";
  }

  return parseCustomerLanguageCode(fromFranc);
}

/** Short replies (ok, yes, ji) — local guess is often wrong; caller may use AI. */
export function needsAiLanguageDisambiguation(userText: string): boolean {
  const t = userText.trim();
  if (!t || t.length > 24) return false;
  // Latin-only English / address lines — local detection is reliable enough.
  if (/^[a-z0-9\s,.\-#'"/]+$/i.test(t) && !ROMAN_URDU_HINT_RE.test(t)) {
    return false;
  }
  return true;
}
