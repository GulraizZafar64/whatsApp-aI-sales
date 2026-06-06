import { ensureDb } from "@/lib/sequelize";
import { WhatsAppMessage } from "@/lib/models";

type WhatsAppMessagePayload = {
  from?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  image?: { caption?: string };
  audio?: { voice?: boolean };
};

export function previewWhatsAppBody(message: WhatsAppMessagePayload): string {
  const msgType = typeof message.type === "string" ? message.type : "unknown";
  return (
    message.text?.body ??
    (msgType === "image"
      ? (message.image?.caption?.trim()
          ? `[Image] ${message.image.caption.trim()}`
          : "[Image]")
      : msgType === "audio"
        ? message.audio?.voice
          ? "[Voice message]"
          : "[Audio]"
        : msgType === "document"
          ? "[Document]"
          : msgType === "button"
            ? message.button?.text ?? "[Button]"
            : `[${msgType}]`)
  );
}

export async function saveIncomingWhatsAppMessage(
  businessId: number,
  message: Record<string, unknown>,
  options?: {
    senderName?: string;
    whatsappChatId?: string | null;
    waMessageKey?: string | null;
  }
): Promise<void> {
  const m = message as WhatsAppMessagePayload;
  const from = typeof m.from === "string" ? m.from : "";
  const msgType = typeof m.type === "string" ? m.type : "unknown";
  const msgBody = previewWhatsAppBody(m);

  try {
    await ensureDb();
    const chatJid = options?.whatsappChatId?.trim() || null;
    const waMessageKey = options?.waMessageKey?.trim() || null;
    if (waMessageKey) {
      const existing = await WhatsAppMessage.findOne({
        where: { businessId, waMessageKey },
        attributes: ["id"],
      });
      if (existing) return;
    }
    await WhatsAppMessage.create({
      businessId,
      senderWaId: from,
      whatsappChatId: chatJid,
      senderName: options?.senderName ?? null,
      text: msgBody,
      messageType: msgType,
      direction: "incoming",
      status: "unread",
      waMessageKey,
    });
  } catch (error) {
    console.error("[whatsapp] Failed to persist message:", error);
  }
}

export async function updateLatestIncomingAudioTranscript(params: {
  businessId: number;
  senderWaId: string;
  transcript: string;
  detectedLanguage?: string;
}): Promise<void> {
  const transcript = params.transcript.trim();
  if (!transcript) return;

  try {
    await ensureDb();
    const row = await WhatsAppMessage.findOne({
      where: {
        businessId: params.businessId,
        senderWaId: params.senderWaId,
        direction: "incoming",
        messageType: "audio",
      },
      order: [["id", "DESC"]],
    });
    if (!row) return;

    const lang = params.detectedLanguage?.trim();
    const label = lang
      ? `🎤 ${transcript} (${lang})`
      : `🎤 ${transcript}`;
    await row.update({ text: label.slice(0, 16_000) });
  } catch (error) {
    console.error("[whatsapp] Failed to update voice transcript:", error);
  }
}
