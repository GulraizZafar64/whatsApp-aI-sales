import { digitsOnly, isPlausiblePhoneDigits } from "@/lib/wa-contact-id";

/** Normalize stored id / dashboard `to` into a WhatsApp chat JID for sendMessage. */
export async function resolveOutboundChatId(
  client: import("whatsapp-web.js").Client,
  toWaId: string,
  whatsappChatId?: string | null
): Promise<string | null> {
  const storedChat = whatsappChatId?.trim();
  if (storedChat?.includes("@")) {
    return storedChat;
  }

  const raw = toWaId.trim();
  if (raw.includes("@")) {
    return raw;
  }

  const digits = digitsOnly(raw);
  if (!digits) return null;

  const tryIds = [
    `${digits}@c.us`,
    `${digits}@lid`,
    `${digits}@s.whatsapp.net`,
  ];

  for (const id of tryIds) {
    try {
      const chat = await client.getChatById(id);
      if (chat?.id?._serialized) return chat.id._serialized;
      if (chat) return id;
    } catch {
      /* next */
    }
  }

  try {
    const numberId = await client.getNumberId(digits);
    const serialized =
      typeof numberId === "object" && numberId !== null
        ? (numberId as { _serialized?: string })._serialized
        : null;
    if (serialized?.includes("@")) return serialized;
  } catch {
    /* fall through */
  }

  try {
    const chats = await client.getChats();
    for (const chat of chats) {
      if (chat.isGroup) continue;
      const chatSerialized =
        chat.id?._serialized ??
        (typeof chat.id === "string" ? chat.id : null);
      if (!chatSerialized || chatSerialized.includes("@g.us")) continue;

      const contact = await chat.getContact().catch(() => null);
      const num = digitsOnly(contact?.number ?? "");
      if (num === digits && isPlausiblePhoneDigits(num)) {
        return chatSerialized;
      }
      const user = digitsOnly(
        typeof contact?.id?.user === "string" ? contact.id.user : ""
      );
      if (user === digits) return chatSerialized;
    }
  } catch (err) {
    console.warn("[whatsapp-web] getChats lookup failed:", err);
  }

  return `${digits}@c.us`;
}
