/** Legacy Meta media download — not used with WhatsApp Web. */

export async function downloadWhatsAppMediaBuffer(_params: {
  mediaId: string;
  accessToken: string;
  mimePrefix?: string;
}): Promise<{ buffer: Buffer; mimeType: string } | null> {
  return null;
}

export async function downloadWhatsAppImageAsDataUrl(_params: {
  whatsappMediaId: string;
}): Promise<string | null> {
  return null;
}
