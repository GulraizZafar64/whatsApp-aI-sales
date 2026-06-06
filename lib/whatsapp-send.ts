import { ensureDb } from "@/lib/sequelize";
import { WhatsAppMessage } from "@/lib/models";
import {
  sendWebWhatsAppImage,
  sendWebWhatsAppText,
} from "@/lib/whatsapp-web/send";

export type SendTextResult =
  | { ok: true; wamid?: string }
  | { ok: false; error: string; status: number };

export async function sendWhatsAppTextMessage(params: {
  businessId: number;
  toWaId: string;
  whatsappChatId?: string | null;
  body: string;
}): Promise<SendTextResult> {
  return sendWebWhatsAppText({
    businessId: params.businessId,
    toWaId: params.toWaId,
    whatsappChatId: params.whatsappChatId,
    body: params.body,
  });
}

export async function sendWhatsAppImageMessage(params: {
  businessId: number;
  toWaId: string;
  whatsappChatId?: string | null;
  buffer: Buffer;
  mimeType: string;
  caption?: string;
}): Promise<SendTextResult> {
  return sendWebWhatsAppImage({
    businessId: params.businessId,
    toWaId: params.toWaId,
    whatsappChatId: params.whatsappChatId,
    buffer: params.buffer,
    mimeType: params.mimeType,
    caption: params.caption,
  });
}

export async function fetchHttpsImageUrlToBuffer(
  rawUrl: string
): Promise<{ buffer: Buffer; mimeType: string; ext: string } | null> {
  let u: URL;
  try {
    u = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const h = u.hostname.toLowerCase();
  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "169.254.169.254" ||
    h.startsWith("10.") ||
    h.startsWith("192.168.")
  ) {
    return null;
  }
  const m172 = /^172\.(\d+)\./.exec(h);
  if (m172) {
    const n = Number(m172[1]);
    if (n >= 16 && n <= 31) return null;
  }

  const res = await fetch(u.toString(), {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  const ct =
    res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ct.startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 32 || buf.length > 10_000_000) return null;
  let ext = "jpg";
  if (ct.includes("png")) ext = "png";
  else if (ct.includes("webp")) ext = "webp";
  else if (ct.includes("gif")) ext = "gif";
  return { buffer: buf, mimeType: ct, ext };
}

export function dataUrlToBufferAndMime(
  dataUrl: string
): { buffer: Buffer; mimeType: string; ext: string } | null {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(
    dataUrl.trim()
  );
  if (!m) return null;
  const mimeType = m[1].toLowerCase();
  let ext = "jpg";
  if (mimeType.includes("png")) ext = "png";
  else if (mimeType.includes("webp")) ext = "webp";
  else if (mimeType.includes("gif")) ext = "gif";
  try {
    const buffer = Buffer.from(m[2].replace(/\s/g, ""), "base64");
    if (buffer.length < 32 || buffer.length > 10_000_000) return null;
    return { buffer, mimeType, ext };
  } catch {
    return null;
  }
}

export async function saveOutgoingWhatsAppMessage(params: {
  businessId: number;
  contactWaId: string;
  whatsappChatId?: string | null;
  text: string;
  messageType?: string;
  outgoingSource?: "human" | "ai";
}): Promise<void> {
  try {
    await ensureDb();
    await WhatsAppMessage.create({
      businessId: params.businessId,
      senderWaId: params.contactWaId,
      whatsappChatId: params.whatsappChatId?.trim() || null,
      senderName: null,
      text: params.text,
      messageType: params.messageType ?? "text",
      direction: "outgoing",
      status: "sent",
      outgoingSource: params.outgoingSource ?? "human",
    });
  } catch (error) {
    console.error("[whatsapp] Failed to persist outgoing message:", error);
  }
}
