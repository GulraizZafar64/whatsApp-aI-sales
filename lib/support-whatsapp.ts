/** Business support line (E.164 without +). */
export const SUPPORT_WHATSAPP_E164 = "923226246616";

export const SUPPORT_WHATSAPP_DISPLAY = "+92 322 6246616";

export function whatsappChatUrl(prefill?: string): string {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_E164}`;
  const text = prefill?.trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}
