/** Parsed inbound WhatsApp webhook message for AI + storage. */
export type ParsedInboundWhatsApp = {
  from: string;
  msgType: string;
  /** Text for AI (caption, button label, or synthetic for media). */
  userText: string;
  /** Meta media id when customer sent image/audio/document. */
  whatsappMediaId?: string;
  /** True when customer sent image (download for Claude vision). */
  isCustomerImage: boolean;
  /** Voice note or audio file. */
  isCustomerAudio: boolean;
};

function readString(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" ? v : undefined;
}

function readMediaId(obj: unknown): string | undefined {
  return readString(obj, "id");
}

/**
 * Turn a raw webhook `messages[]` item into text the AI can respond to.
 * Supports text, buttons, interactive replies, images (caption), voice/audio, stickers.
 */
export function parseInboundWhatsAppMessage(
  msg: Record<string, unknown>
): ParsedInboundWhatsApp | null {
  const from =
    typeof msg.from === "string" ? msg.from : String(msg.from ?? "");
  if (!from.trim()) return null;

  const msgType =
    typeof msg.type === "string" ? msg.type.trim().toLowerCase() : "unknown";

  const textBody =
    msg.text &&
    typeof msg.text === "object" &&
    "body" in msg.text &&
    typeof (msg.text as { body?: unknown }).body === "string"
      ? (msg.text as { body: string }).body.trim()
      : "";

  const buttonText =
    msgType === "button" &&
    msg.button &&
    typeof msg.button === "object" &&
    "text" in msg.button &&
    typeof (msg.button as { text?: unknown }).text === "string"
      ? (msg.button as { text: string }).text.trim()
      : "";

  if (msgType === "interactive" && msg.interactive && typeof msg.interactive === "object") {
    const interactive = msg.interactive as Record<string, unknown>;
    let title = "";
    const br = interactive.button_reply;
    if (br && typeof br === "object") {
      const t = (br as { title?: unknown }).title;
      if (typeof t === "string") title = t.trim();
    }
    if (!title) {
      const lr = interactive.list_reply;
      if (lr && typeof lr === "object") {
        const t = (lr as { title?: unknown }).title;
        if (typeof t === "string") title = t.trim();
      }
    }
    if (title) {
      return { from, msgType, userText: title, isCustomerImage: false, isCustomerAudio: false };
    }
  }

  if (textBody || buttonText) {
    return {
      from,
      msgType,
      userText: textBody || buttonText,
      isCustomerImage: false,
      isCustomerAudio: false,
    };
  }

  if (msgType === "image" && msg.image && typeof msg.image === "object") {
    const image = msg.image as Record<string, unknown>;
    const caption =
      typeof image.caption === "string" ? image.caption.trim() : "";
    const mediaId = readMediaId(image);
    return {
      from,
      msgType,
      userText:
        caption ||
        "[Customer sent a product photo. Describe what you see if relevant, help them order from CATALOG_JSON, and ask a short follow-up if needed.]",
      whatsappMediaId: mediaId,
      isCustomerImage: true,
      isCustomerAudio: false,
    };
  }

  if (msgType === "audio" && msg.audio && typeof msg.audio === "object") {
    const audio = msg.audio as Record<string, unknown>;
    return {
      from,
      msgType,
      userText: "[Voice message — transcribing…]",
      whatsappMediaId: readMediaId(audio),
      isCustomerImage: false,
      isCustomerAudio: true,
    };
  }

  if (msgType === "sticker") {
    return {
      from,
      msgType,
      userText:
        "[Customer sent a sticker. Reply briefly and warmly, then continue helping with their order if they were shopping.]",
      isCustomerImage: false,
      isCustomerAudio: false,
    };
  }

  if (msgType === "video" && msg.video && typeof msg.video === "object") {
    const video = msg.video as Record<string, unknown>;
    const caption =
      typeof video.caption === "string" ? video.caption.trim() : "";
    return {
      from,
      msgType,
      userText:
        caption ||
        "[Customer sent a video. Reply helpfully; ask them to type details or send a photo of the product if they want to order.]",
      isCustomerImage: false,
      isCustomerAudio: false,
    };
  }

  if (msgType === "document" && msg.document && typeof msg.document === "object") {
    const doc = msg.document as Record<string, unknown>;
    const caption =
      typeof doc.caption === "string" ? doc.caption.trim() : "";
    const filename =
      typeof doc.filename === "string" ? doc.filename.trim() : "";
    return {
      from,
      msgType,
      userText:
        caption ||
        (filename
          ? `[Customer sent a document: ${filename}. Ask what they need or to type their order.]`
          : "[Customer sent a document. Ask them to type their order or send a product photo.]"),
      isCustomerImage: false,
      isCustomerAudio: false,
    };
  }

  if (msgType === "location" && msg.location && typeof msg.location === "object") {
    const loc = msg.location as Record<string, unknown>;
    const name =
      typeof loc.name === "string" ? loc.name.trim() : "";
    const address =
      typeof loc.address === "string" ? loc.address.trim() : "";
    const parts = [name, address].filter(Boolean);
    return {
      from,
      msgType,
      userText:
        parts.join(", ") ||
        "[Customer shared a location. Treat as delivery information if they are checking out.]",
      isCustomerImage: false,
      isCustomerAudio: false,
    };
  }

  if (msgType !== "unknown" && msgType !== "system" && msgType !== "reaction") {
    return {
      from,
      msgType,
      userText: `[Customer sent a ${msgType} message. Reply politely and ask them to type their request or send a photo if they want to order.]`,
      isCustomerImage: false,
      isCustomerAudio: false,
    };
  }

  return null;
}
