/** Handler for /api/whatsapp/send */
import { NextResponse } from "next/server";
import { requireDashboardBusiness } from "@/lib/dashboard-business";
import {
  dataUrlToBufferAndMime,
  fetchHttpsImageUrlToBuffer,
  saveOutgoingWhatsAppMessage,
  sendWhatsAppImageMessage,
  sendWhatsAppTextMessage,
} from "@/lib/whatsapp-send";

export async function POST(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { business } = gate;
  const businessId = business.id;

  let body: {
    to?: string;
    whatsappChatId?: string;
    text?: string;
    imageDataUrl?: string;
    imageUrl?: string;
    imageCaption?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const whatsappChatId =
    typeof body.whatsappChatId === "string" ? body.whatsappChatId.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const imageDataUrl =
    typeof body.imageDataUrl === "string" ? body.imageDataUrl.trim() : "";
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const imageCaption =
    typeof body.imageCaption === "string" ? body.imageCaption.trim() : "";

  const hasImage = Boolean(imageDataUrl || imageUrl);
  const hasText = Boolean(text);

  if (!to || (!hasText && !hasImage)) {
    return NextResponse.json(
      {
        error:
          "Missing `to` or message content. Provide `text` and/or `imageDataUrl` / `imageUrl`.",
      },
      { status: 400 }
    );
  }

  const waId = to.replace(/\D/g, "") || to;
  const wamids: { text?: string; image?: string } = {};

  const fail = (sent: { ok: false; error: string; status: number }) =>
    NextResponse.json({ error: sent.error }, { status: sent.status });

  if (hasText) {
    const sent = await sendWhatsAppTextMessage({
      businessId,
      toWaId: to,
      whatsappChatId: whatsappChatId || undefined,
      body: text,
    });
    if (!sent.ok) return fail(sent);
    wamids.text = sent.wamid;
    await saveOutgoingWhatsAppMessage({
      businessId,
      contactWaId: waId,
      whatsappChatId: whatsappChatId || undefined,
      text,
      outgoingSource: "human",
    });
  }

  if (hasImage) {
    let parsed =
      imageDataUrl.length > 0 ? dataUrlToBufferAndMime(imageDataUrl) : null;
    if (!parsed && imageUrl.length > 0) {
      parsed = await fetchHttpsImageUrlToBuffer(imageUrl);
    }
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Invalid image: use `imageDataUrl` (data:image/...;base64,...) or a public `imageUrl` (https, image/*, max ~10MB).",
        },
        { status: 400 }
      );
    }

    const cap = imageCaption || (hasText ? "" : text) || "";
    const imgSent = await sendWhatsAppImageMessage({
      businessId,
      toWaId: to,
      whatsappChatId: whatsappChatId || undefined,
      buffer: parsed.buffer,
      mimeType: parsed.mimeType,
      caption: cap || undefined,
    });
    if (!imgSent.ok) return fail(imgSent);
    wamids.image = imgSent.wamid;
    await saveOutgoingWhatsAppMessage({
      businessId,
      contactWaId: waId,
      whatsappChatId: whatsappChatId || undefined,
      text: cap || "[image]",
      messageType: "image",
      outgoingSource: "human",
    });
  }

  return NextResponse.json({ ok: true, wamids });
}
