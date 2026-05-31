import { NextResponse } from "next/server";
import { requireDashboardBusiness } from "@/lib/dashboard-business";
import {
  dataUrlToBufferAndMime,
  fetchHttpsImageUrlToBuffer,
  saveOutgoingWhatsAppMessage,
  sendWhatsAppImageMessage,
  sendWhatsAppTextMessage,
  uploadWhatsAppMediaFromBuffer,
} from "@/lib/whatsapp-send";

function isLikelyTokenAuthFailure(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("authentication") ||
    m.includes("invalid oauth") ||
    (m.includes("oauth") && m.includes("token")) ||
    m.includes("access token") ||
    m.includes("session has expired") ||
    m.includes("error validating access token")
  );
}

export async function POST(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { business, accessToken: graphToken } = gate;
  const phoneNumberId = business.phoneNumberId.trim();

  let body: {
    to?: string;
    text?: string;
    phoneNumberId?: string;
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

  const fail = (sent: { ok: false; error: string; status: number }) => {
    const hint = isLikelyTokenAuthFailure(sent.error)
      ? "WhatsApp token expired or invalid. Sign in with WhatsApp again from the app."
      : undefined;
    return NextResponse.json(
      { error: sent.error, hint },
      { status: sent.status }
    );
  };

  if (hasText) {
    const sent = await sendWhatsAppTextMessage({
      phoneNumberId,
      accessToken: graphToken,
      toWaId: to,
      body: text,
    });
    if (!sent.ok) return fail(sent);
    wamids.text = sent.wamid;
    await saveOutgoingWhatsAppMessage({
      businessPhoneNumberId: phoneNumberId,
      contactWaId: waId,
      text,
      outgoingSource: "human",
    });
  }

  if (hasImage) {
    let parsed =
      imageDataUrl.length > 0
        ? dataUrlToBufferAndMime(imageDataUrl)
        : null;
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

    const up = await uploadWhatsAppMediaFromBuffer({
      phoneNumberId,
      accessToken: graphToken,
      buffer: parsed.buffer,
      mimeType: parsed.mimeType,
      filename: `send.${parsed.ext}`,
    });
    if (!up.ok) return fail(up);

    const cap =
      imageCaption ||
      (hasText ? "" : text) ||
      "";
    const imgSent = await sendWhatsAppImageMessage({
      phoneNumberId,
      accessToken: graphToken,
      toWaId: to,
      mediaId: up.mediaId,
      caption: cap || undefined,
    });
    if (!imgSent.ok) return fail(imgSent);
    wamids.image = imgSent.wamid;
    await saveOutgoingWhatsAppMessage({
      businessPhoneNumberId: phoneNumberId,
      contactWaId: waId,
      text: cap || "[image]",
      messageType: "image",
      outgoingSource: "human",
    });
  }

  return NextResponse.json({ ok: true, wamids });
}
