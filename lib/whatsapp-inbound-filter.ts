/** True for group chats, status updates, channels — not 1:1 customer inbox. */
export function isNonCustomerWhatsAppChatId(chatId: string): boolean {
  const id = chatId.trim().toLowerCase();
  if (!id) return true;
  if (id.includes("@g.us")) return true;
  if (id === "status@broadcast" || id.startsWith("status@")) return true;
  if (id.includes("@newsletter")) return true;
  if (id.endsWith("@broadcast") && !id.endsWith("@c.us")) return true;
  return false;
}

/** Skip WhatsApp Status / broadcast feeds (whatsapp-web.js `Message.isStatus`). */
export function shouldSkipInboundWhatsAppWebMessage(
  msg: import("whatsapp-web.js").Message
): boolean {
  const chatId = msg.from ?? "";
  if (isNonCustomerWhatsAppChatId(chatId)) return true;

  const flags = msg as { isStatus?: boolean };
  if (flags.isStatus === true) return true;

  return false;
}
