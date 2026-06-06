export type CustomerLanguage =
  | "ur_roman"
  | "ur_script"
  | "ar"
  | "hi"
  | "en"
  | "zh"
  | "ja"
  | "ko"
  | "fr"
  | "de"
  | "es"
  | "it"
  | "pt"
  | "other";

export const CUSTOMER_LANGUAGE_CODES: readonly CustomerLanguage[] = [
  "ur_roman",
  "ur_script",
  "ar",
  "hi",
  "en",
  "zh",
  "ja",
  "ko",
  "fr",
  "de",
  "es",
  "it",
  "pt",
  "other",
] as const;

const LANGUAGE_CODE_SET = new Set<string>(CUSTOMER_LANGUAGE_CODES);

export function parseCustomerLanguageCode(raw: string): CustomerLanguage {
  const code = raw.trim().toLowerCase();
  return LANGUAGE_CODE_SET.has(code) ? (code as CustomerLanguage) : "other";
}

/** Template order-status replies exist only for Urdu + English. */
export function orderStatusUsesTemplateLang(lang: CustomerLanguage): boolean {
  return (
    lang === "ur_roman" ||
    lang === "ur_script" ||
    lang === "en"
  );
}

export function customerLanguageLabel(lang: CustomerLanguage): string {
  switch (lang) {
    case "ur_roman":
      return "Roman Urdu";
    case "ur_script":
      return "Urdu";
    case "ar":
      return "Arabic";
    case "hi":
      return "Hindi";
    case "en":
      return "English";
    case "zh":
      return "Chinese";
    case "ja":
      return "Japanese";
    case "ko":
      return "Korean";
    case "fr":
      return "French";
    case "de":
      return "German";
    case "es":
      return "Spanish";
    case "it":
      return "Italian";
    case "pt":
      return "Portuguese";
    default:
      return "customer's language";
  }
}

export function replyLanguageInstruction(lang: CustomerLanguage): string {
  switch (lang) {
    case "ur_roman":
      return [
        "MANDATORY LANGUAGE: The customer wrote in Roman Urdu (Urdu in Latin letters).",
        "Reply ONLY in Roman Urdu using the same Latin alphabet (e.g. \"Aap ke liye black shirt Rs 100 hai\").",
        "Do NOT use Urdu Arabic script (اردو). Do NOT switch to English unless the customer used English in this same message.",
      ].join(" ");
    case "ur_script":
      return [
        "MANDATORY LANGUAGE: The customer wrote in Urdu (Arabic script).",
        "Reply ONLY in Urdu using Arabic script (اردو).",
        "Do not use English or Roman Urdu unless the customer mixed them in this same message.",
      ].join(" ");
    case "ar":
      return "MANDATORY LANGUAGE: The customer wrote in Arabic. Reply ONLY in Arabic.";
    case "hi":
      return "MANDATORY LANGUAGE: The customer wrote in Hindi. Reply ONLY in Hindi (Devanagari).";
    case "en":
      return "MANDATORY LANGUAGE: The customer wrote in English. Reply ONLY in English.";
    case "zh":
      return "MANDATORY LANGUAGE: The customer wrote in Chinese. Reply ONLY in Chinese (中文), matching their script (Simplified or Traditional).";
    case "ja":
      return "MANDATORY LANGUAGE: The customer wrote in Japanese. Reply ONLY in Japanese (日本語).";
    case "ko":
      return "MANDATORY LANGUAGE: The customer wrote in Korean. Reply ONLY in Korean (한국어).";
    case "fr":
      return "MANDATORY LANGUAGE: The customer wrote in French. Reply ONLY in French.";
    case "de":
      return "MANDATORY LANGUAGE: The customer wrote in German. Reply ONLY in German.";
    case "es":
      return "MANDATORY LANGUAGE: The customer wrote in Spanish. Reply ONLY in Spanish.";
    case "it":
      return "MANDATORY LANGUAGE: The customer wrote in Italian. Reply ONLY in Italian.";
    case "pt":
      return "MANDATORY LANGUAGE: The customer wrote in Portuguese. Reply ONLY in Portuguese.";
    default:
      return [
        "MANDATORY LANGUAGE: Match the customer's latest message language and script exactly.",
        "You support all major languages (Chinese, French, German, Spanish, Arabic, Urdu, Hindi, English, etc.).",
        "If they ask whether you speak their language, confirm yes and reply in that language — never say you only speak English or Urdu.",
      ].join(" ");
  }
}

export function userTextLanguageHint(
  lang: CustomerLanguage,
  userText: string
): string {
  if (lang === "ur_roman") {
    return `${userText}\n\n[Reply in Roman Urdu (Latin letters) only — same style as the customer. Do not use Urdu Arabic script.]`;
  }
  if (lang === "ur_script") {
    return `${userText}\n\n[Reply in Urdu (اردو) Arabic script only.]`;
  }
  if (lang !== "en" && lang !== "other") {
    const label = customerLanguageLabel(lang);
    return `${userText}\n\n[Reply in ${label} only — same language and script as the customer.]`;
  }
  return userText;
}
