/** WhatsApp link for customer support (change via SUPPORT_WHATSAPP in env). */
export function getSupportWhatsAppUrl(): string {
  const to =
    process.env.SUPPORT_WHATSAPP?.trim().replace(/\D/g, "") || "923226246616";
  const msg = encodeURIComponent(
    "Hi, I need help with my WhatsApp connection on WhatsApp AI Sales."
  );
  return `https://wa.me/${to}?text=${msg}`;
}

export function supportContactSuffix(): string {
  return " Contact support if you need help.";
}
