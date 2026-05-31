/** Saved on `Business.replyTone` and chosen in AI instructions. */
export const REPLY_TONES = ["Professional", "Friendly", "Cool"] as const;

export type ReplyTone = (typeof REPLY_TONES)[number];

export const DEFAULT_REPLY_TONE: ReplyTone = "Professional";

const TONE_ALIASES: Record<string, ReplyTone> = {
  professional: "Professional",
  friendly: "Friendly",
  cool: "Cool",
  casual: "Cool",
};

export function normalizeReplyTone(raw: string | null | undefined): ReplyTone {
  const key = raw?.trim().toLowerCase() ?? "";
  return TONE_ALIASES[key] ?? DEFAULT_REPLY_TONE;
}

/** System-prompt block so Claude consistently matches the selected tab. */
export function replyToneSystemPrompt(tone: ReplyTone): string {
  const shared =
    "This tone applies to every reply (greeting, sales, order thanks, upsell). " +
    "Stay in the customer's language; do not switch tone mid-chat unless they change theirs first.";

  switch (tone) {
    case "Friendly":
      return (
        `REPLY TONE — Friendly: ${shared} ` +
        "Warm, approachable, and human—like a helpful shop assistant who genuinely cares. " +
        "Use light emojis when natural (😊 🙏 ✨). Short sentences, contractions OK. " +
        "Be enthusiastic but never pushy or fake."
      );
    case "Cool":
      return (
        `REPLY TONE — Cool: ${shared} ` +
        "Relaxed, confident, and modern—concise and a bit laid-back, like a trendy brand on WhatsApp. " +
        "Minimal fluff; light humor or casual phrasing is fine. " +
        "Emojis sparingly (😎 🔥 👍). Never stiff or corporate; never rude or slang-heavy."
      );
    case "Professional":
    default:
      return (
        `REPLY TONE — Professional: ${shared} ` +
        "Polite, clear, and trustworthy—like a skilled sales rep. " +
        "Complete sentences, proper grammar, respectful address. " +
        "Emojis only if the customer uses them first. No slang, no hype, no overly casual jokes."
      );
  }
}

export const REPLY_TONE_UI: {
  id: ReplyTone;
  label: string;
  blurb: string;
}[] = [
  {
    id: "Professional",
    label: "Professional",
    blurb: "Clear, polite, business-like",
  },
  {
    id: "Friendly",
    label: "Friendly",
    blurb: "Warm, welcoming, emoji-friendly",
  },
  {
    id: "Cool",
    label: "Cool",
    blurb: "Relaxed, modern, concise",
  },
];
