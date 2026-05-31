import { metaGraphUrl } from "@/lib/meta-graph-version";

type MediaMeta = {
  url: string;
  mime_type: string;
};

async function fetchWhatsAppMediaMeta(
  mediaId: string,
  accessToken: string
): Promise<MediaMeta | null> {
  const metaRes = await fetch(
    metaGraphUrl(mediaId.trim()),
    {
      headers: { Authorization: `Bearer ${accessToken.trim()}` },
      signal: AbortSignal.timeout(15_000),
    }
  );
  const meta = (await metaRes.json()) as {
    url?: string;
    mime_type?: string;
    error?: { message?: string };
  };
  if (!metaRes.ok || !meta.url) {
    console.warn(
      "[whatsapp-media] meta failed:",
      meta.error?.message ?? metaRes.status
    );
    return null;
  }
  return {
    url: meta.url,
    mime_type: (meta.mime_type ?? "application/octet-stream").toLowerCase(),
  };
}

/** Download any WhatsApp media id to a buffer. */
export async function downloadWhatsAppMediaBuffer(params: {
  mediaId: string;
  accessToken: string;
  maxBytes?: number;
  mimePrefix?: string;
}): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const id = params.mediaId.trim();
  const token = params.accessToken.trim();
  if (!id || !token) return null;

  const maxBytes = params.maxBytes ?? 25 * 1024 * 1024;

  try {
    const meta = await fetchWhatsAppMediaMeta(id, token);
    if (!meta) return null;

    const mime = meta.mime_type.split(";")[0].trim();
    if (params.mimePrefix && !mime.startsWith(params.mimePrefix)) {
      console.warn("[whatsapp-media] mime mismatch:", mime, params.mimePrefix);
      return null;
    }

    const fileRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(60_000),
    });
    if (!fileRes.ok) return null;

    const buf = Buffer.from(await fileRes.arrayBuffer());
    if (buf.length < 32 || buf.length > maxBytes) return null;

    return { buffer: buf, mimeType: mime };
  } catch (e) {
    console.error("[whatsapp-media] download error:", e);
    return null;
  }
}

/** Download WhatsApp Cloud media by id → base64 data URL (images only). */
export async function downloadWhatsAppImageAsDataUrl(params: {
  mediaId: string;
  accessToken: string;
}): Promise<string | null> {
  const downloaded = await downloadWhatsAppMediaBuffer({
    mediaId: params.mediaId,
    accessToken: params.accessToken,
    maxBytes: 5_000_000,
    mimePrefix: "image/",
  });
  if (!downloaded) return null;

  const normalizedMime =
    downloaded.mimeType === "image/jpg" ? "image/jpeg" : downloaded.mimeType;
  return `data:${normalizedMime};base64,${downloaded.buffer.toString("base64")}`;
}
