import { getWhatsAppClient } from "@/lib/whatsapp-web/manager";
import { resolveOutboundChatId } from "@/lib/whatsapp-web/resolve-chat-id";

export async function sendWebWhatsAppText(params: {
  businessId: number;
  toWaId: string;
  whatsappChatId?: string | null;
  body: string;
}): Promise<
  | { ok: true; wamid?: string }
  | { ok: false; error: string; status: number }
> {
  const client = await getWhatsAppClient(params.businessId);
  if (!client) {
    return {
      ok: false,
      error: "WhatsApp is not connected. Scan the QR code in the dashboard.",
      status: 503,
    };
  }

  const text = params.body.trim();
  if (!text) {
    return { ok: false, error: "Empty message", status: 400 };
  }

  try {
    const chatId = await resolveOutboundChatId(
      client,
      params.toWaId,
      params.whatsappChatId
    );
    if (!chatId) {
      return { ok: false, error: "Invalid recipient.", status: 400 };
    }

    const chat = await client.getChatById(chatId);
    const sent = await chat.sendMessage(text);
    return { ok: true, wamid: sent.id.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed";
    if (/no lid for user/i.test(message)) {
      return {
        ok: false,
        error:
          "Could not send — ask this contact to message you first, then try again.",
        status: 400,
      };
    }
    return {
      ok: false,
      error: message,
      status: 500,
    };
  }
}

export async function sendWebWhatsAppImage(params: {
  businessId: number;
  toWaId: string;
  whatsappChatId?: string | null;
  buffer: Buffer;
  mimeType: string;
  caption?: string;
}): Promise<
  | { ok: true; wamid?: string }
  | { ok: false; error: string; status: number }
> {
  const client = await getWhatsAppClient(params.businessId);
  if (!client) {
    return {
      ok: false,
      error: "WhatsApp is not connected. Scan the QR code in the dashboard.",
      status: 503,
    };
  }

  const { MessageMedia } = await import("whatsapp-web.js");
  const base64 = params.buffer.toString("base64");
  const media = new MessageMedia(
    params.mimeType,
    base64,
    `image.${params.mimeType.split("/")[1] || "jpg"}`
  );

  try {
    const chatId = await resolveOutboundChatId(
      client,
      params.toWaId,
      params.whatsappChatId
    );
    if (!chatId) {
      return { ok: false, error: "Invalid recipient.", status: 400 };
    }

    const chat = await client.getChatById(chatId);
    const sent = await chat.sendMessage(media, {
      caption: params.caption?.trim() || undefined,
    });
    return { ok: true, wamid: sent.id.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Image send failed";
    if (/no lid for user/i.test(message)) {
      return {
        ok: false,
        error:
          "Could not send — ask this contact to message you first, then try again.",
        status: 400,
      };
    }
    return {
      ok: false,
      error: message,
      status: 500,
    };
  }
}
