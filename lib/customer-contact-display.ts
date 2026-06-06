import { formatChatPhone } from "@/lib/inbox";
import { digitsOnly, isPlausiblePhoneDigits } from "@/lib/wa-contact-id";
import { resolveDisplayPhoneForWaId } from "@/lib/wa-resolve-display-phone";
import { getWhatsAppClient } from "@/lib/whatsapp-web/manager";

/** Format a stored wa id or full chat jid for human display (+E.164), or null if LID/internal. */
export function formatCustomerPhoneDisplay(
  ...ids: (string | null | undefined)[]
): string | null {
  for (const raw of ids) {
    const id = raw?.trim();
    if (!id) continue;
    const fromJid = formatChatPhone(id);
    if (fromJid) return fromJid;
    const d = digitsOnly(id.split("@")[0]);
    if (isPlausiblePhoneDigits(d)) return `+${d}`;
  }
  return null;
}

/**
 * Resolve a real phone for owner emails / UI when the stored id is a WhatsApp LID.
 * Uses the connected WhatsApp Web client when plain formatting is not enough.
 */
export async function resolveCustomerPhoneDisplay(params: {
  businessId: number;
  customerWaId: string;
  whatsappChatId?: string | null;
}): Promise<string | null> {
  const direct = formatCustomerPhoneDisplay(
    params.whatsappChatId,
    params.customerWaId
  );
  if (direct) return direct;

  const client = await getWhatsAppClient(params.businessId);
  if (!client) return null;

  const tryIds = [params.whatsappChatId, params.customerWaId].filter(
    (v): v is string => Boolean(v?.trim())
  );
  const seen = new Set<string>();
  for (const id of tryIds) {
    const key = digitsOnly(id) || id;
    if (seen.has(key)) continue;
    seen.add(key);
    const phone = await resolveDisplayPhoneForWaId(client, id);
    if (phone) return phone;
  }
  return null;
}
