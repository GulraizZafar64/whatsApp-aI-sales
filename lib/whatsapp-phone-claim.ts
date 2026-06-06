import { Op } from "sequelize";
import { Business } from "@/lib/models";
import { normalizeWaDigits } from "@/lib/phone-normalize";
import { ensureDb } from "@/lib/sequelize";

export type WhatsAppPhoneClaimResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      ownerBusinessId: number;
      ownerBusinessName: string | null;
    };

/** One WhatsApp number may only be linked to a single business account. */
export async function assertWhatsAppPhoneAvailable(
  businessId: number,
  phoneRaw: string
): Promise<WhatsAppPhoneClaimResult> {
  const phone = normalizeWaDigits(phoneRaw);
  if (!phone) {
    return { ok: true };
  }

  await ensureDb();

  const rows = await Business.findAll({
    where: {
      id: { [Op.ne]: businessId },
      whatsappNumber: { [Op.ne]: null },
    },
    attributes: ["id", "businessName", "whatsappNumber"],
    limit: 200,
  });

  for (const row of rows) {
    const stored = normalizeWaDigits(row.whatsappNumber ?? "");
    if (stored && stored === phone) {
      return {
        ok: false,
        message:
          "This WhatsApp number is already linked to another account. Disconnect it there first, or use a different number.",
        ownerBusinessId: row.id,
        ownerBusinessName: row.businessName,
      };
    }
  }

  return { ok: true };
}
