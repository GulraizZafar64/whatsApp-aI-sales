import { digitsOnly, isPlausiblePhoneDigits } from "@/lib/wa-contact-id";
import { formatChatPhone } from "@/lib/inbox";

function formatFromDigits(d: string): string {
  return isPlausiblePhoneDigits(d) ? `+${d}` : "";
}

/**
 * Resolve a human phone for dashboard display when the stored id is a WhatsApp LID.
 */
export async function resolveDisplayPhoneForWaId(
  client: import("whatsapp-web.js").Client,
  storedWaId: string
): Promise<string> {
  const digits = digitsOnly(storedWaId.split("@")[0]);
  if (!digits) return "";

  const direct = formatFromDigits(digits);
  if (direct) return direct;

  const jidSuffixes = ["@c.us", "@lid", "@s.whatsapp.net"];
  for (const suffix of jidSuffixes) {
    try {
      const contact = await client.getContactById(`${digits}${suffix}`);
      const fromNumber = digitsOnly(contact?.number ?? "");
      const formatted = formatFromDigits(fromNumber);
      if (formatted) return formatted;

      const user = contact?.id?.user;
      if (typeof user === "string") {
        const fromUser = formatFromDigits(digitsOnly(user));
        if (fromUser) return fromUser;
      }
    } catch {
      /* try next jid */
    }
  }

  return "";
}

export async function buildContactPhoneMap(
  client: import("whatsapp-web.js").Client,
  senderWaIds: string[]
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const seen = new Set<string>();

  for (const raw of senderWaIds) {
    const key = digitsOnly(raw) || raw;
    if (!key || seen.has(key)) continue;
    seen.add(key);

    if (formatChatPhone(raw)) continue;

    const phone = await resolveDisplayPhoneForWaId(client, raw);
    if (phone) map[key] = phone;
  }

  return map;
}
