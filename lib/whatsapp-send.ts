import { ensureDb } from "@/lib/sequelize";
import { WhatsAppMessage } from "@/lib/models";

import { metaGraphUrl } from "@/lib/meta-graph-version";

export type SendTextResult =
  | { ok: true; wamid?: string }
  | { ok: false; error: string; status: number };

export type UploadMediaResult =
  | { ok: true; mediaId: string }
  | { ok: false; error: string; status: number };

function graphErrorMessage(data: {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
  };
}): string {
  const e = data.error;
  const parts = [
    e?.error_user_title,
    e?.error_user_msg,
    e?.message,
  ].filter(Boolean);
  const base = parts.length > 0 ? parts.join(" — ") : "Meta API error";
  const code =
    e?.code != null
      ? ` [Meta code ${e.code}${e.error_subcode != null ? `/${e.error_subcode}` : ""}]`
      : "";
  return `${base}${code}`;
}

export async function sendWhatsAppTextMessage(params: {
  phoneNumberId: string;
  accessToken: string;
  toWaId: string;
  body: string;
}): Promise<SendTextResult> {
  const to = params.toWaId.replace(/\D/g, "");
  if (!to) {
    return { ok: false, error: "Invalid recipient phone / WhatsApp id", status: 400 };
  }

  const url = metaGraphUrl(`${params.phoneNumberId}/messages`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: params.body.trim() },
    }),
  });

  const data = (await res.json()) as {
    messages?: { id?: string }[];
    error?: {
      message?: string;
      type?: string;
      code?: number;
      error_subcode?: number;
      error_user_title?: string;
      error_user_msg?: string;
    };
  };

  if (!res.ok) {
    return {
      ok: false,
      error: graphErrorMessage(data),
      status: res.status >= 400 && res.status < 600 ? res.status : 502,
    };
  }

  const wamid = data.messages?.[0]?.id;
  return { ok: true, wamid };
}

/** Upload image bytes to WhatsApp Cloud API; returns media id for sending. */
export async function uploadWhatsAppMediaFromBuffer(params: {
  phoneNumberId: string;
  accessToken: string;
  buffer: Buffer;
  mimeType: string;
  filename: string;
}): Promise<UploadMediaResult> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append(
    "file",
    new Blob([new Uint8Array(params.buffer)], { type: params.mimeType }),
    params.filename
  );

  const url = metaGraphUrl(`${params.phoneNumberId}/media`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: form,
  });

  const data = (await res.json()) as {
    id?: string;
    error?: {
      message?: string;
      code?: number;
      error_subcode?: number;
      error_user_title?: string;
      error_user_msg?: string;
    };
  };

  if (!res.ok || !data.id) {
    return {
      ok: false,
      error: graphErrorMessage(data),
      status: res.status >= 400 && res.status < 600 ? res.status : 502,
    };
  }
  return { ok: true, mediaId: data.id };
}

/** Send a previously uploaded image by media id (optional caption). */
export async function sendWhatsAppImageMessage(params: {
  phoneNumberId: string;
  accessToken: string;
  toWaId: string;
  mediaId: string;
  caption?: string;
}): Promise<SendTextResult> {
  const to = params.toWaId.replace(/\D/g, "");
  if (!to) {
    return { ok: false, error: "Invalid recipient phone / WhatsApp id", status: 400 };
  }

  const image: { id: string; caption?: string } = { id: params.mediaId };
  if (params.caption?.trim()) {
    image.caption = params.caption.trim().slice(0, 1024);
  }

  const url = metaGraphUrl(`${params.phoneNumberId}/messages`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "image",
      image,
    }),
  });

  const data = (await res.json()) as {
    messages?: { id?: string }[];
    error?: {
      message?: string;
      code?: number;
      error_subcode?: number;
      error_user_title?: string;
      error_user_msg?: string;
    };
  };

  if (!res.ok) {
    return {
      ok: false,
      error: graphErrorMessage(data),
      status: res.status >= 400 && res.status < 600 ? res.status : 502,
    };
  }

  const wamid = data.messages?.[0]?.id;
  return { ok: true, wamid };
}

/**
 * Fetch a public HTTPS image URL into a buffer (for manual sends).
 * Blocks obvious private / loopback hosts to reduce SSRF risk.
 */
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

/** Outgoing row uses same `sender_wa_id` as the customer thread key. */
export async function saveOutgoingWhatsAppMessage(params: {
  businessPhoneNumberId: string | null;
  contactWaId: string;
  text: string;
  messageType?: string;
  /** Dashboard / manual sends default to `human`. Set `ai` when automation replies. */
  outgoingSource?: "human" | "ai";
}): Promise<void> {
  try {
    await ensureDb();
    const outgoingSource = params.outgoingSource ?? "human";
    await WhatsAppMessage.create({
      businessPhoneNumberId: params.businessPhoneNumberId,
      senderWaId: params.contactWaId,
      senderName: null,
      text: params.text,
      messageType: params.messageType ?? "text",
      direction: "outgoing",
      status: "sent",
      outgoingSource,
    });
  } catch (error) {
    console.error("[whatsapp] Failed to persist outgoing message:", error);
  }
}
