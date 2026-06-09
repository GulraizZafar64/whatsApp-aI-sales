import { Op } from "sequelize";
import { Business } from "@/lib/models";
import { normalizeWaDigits, formatWaPhoneForDisplay } from "@/lib/phone-normalize";
import { ensureDb } from "@/lib/sequelize";
import { supportContactSuffix } from "@/lib/support-contact";

export type WhatsAppPhoneClaimReason =
  | "number_bound_elsewhere"
  | "account_number_locked";

export type WhatsAppPhoneClaimResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      reason: WhatsAppPhoneClaimReason;
      ownerBusinessId: number;
      ownerBusinessName: string | null;
    };

function wrongNumberForAccountMessage(boundDigits: string): string {
  const display = formatWaPhoneForDisplay(boundDigits);
  return `This account can only connect ${display}. Scan that WhatsApp number, or use a different account.${supportContactSuffix()}`;
}

function numberBoundElsewhereMessage(): string {
  return `This WhatsApp number is permanently linked to another account and cannot be used here.${supportContactSuffix()}`;
}

/**
 * Once linked, a WhatsApp number stays bound to one business forever.
 * Each business may only ever connect its own bound number.
 */
export async function assertWhatsAppPhoneAvailable(
  businessId: number,
  phoneRaw: string
): Promise<WhatsAppPhoneClaimResult> {
  const phone = normalizeWaDigits(phoneRaw);
  if (!phone) {
    return { ok: true };
  }

  await ensureDb();

  const self = await Business.findByPk(businessId, {
    attributes: ["id", "businessName", "boundWhatsappNumber"],
  });
  if (!self) {
    return { ok: true };
  }

  const selfBound = normalizeWaDigits(self.boundWhatsappNumber ?? "");
  if (selfBound && selfBound !== phone) {
    return {
      ok: false,
      reason: "account_number_locked",
      message: wrongNumberForAccountMessage(selfBound),
      ownerBusinessId: businessId,
      ownerBusinessName: self.businessName,
    };
  }

  const rows = await Business.findAll({
    where: {
      id: { [Op.ne]: businessId },
      boundWhatsappNumber: { [Op.ne]: null },
    },
    attributes: ["id", "businessName", "boundWhatsappNumber"],
    limit: 500,
  });

  for (const row of rows) {
    const stored = normalizeWaDigits(row.boundWhatsappNumber ?? "");
    if (stored && stored === phone) {
      return {
        ok: false,
        reason: "number_bound_elsewhere",
        message: numberBoundElsewhereMessage(),
        ownerBusinessId: row.id,
        ownerBusinessName: row.businessName,
      };
    }
  }

  return { ok: true };
}

/** Save the first connected WhatsApp number permanently for this business. */
export async function persistWhatsAppNumberBinding(
  businessId: number,
  phoneRaw: string
): Promise<void> {
  const phone = normalizeWaDigits(phoneRaw);
  if (!phone) return;

  await ensureDb();
  const row = await Business.findByPk(businessId, {
    attributes: ["id", "boundWhatsappNumber"],
  });
  if (!row || row.boundWhatsappNumber) return;

  await Business.update(
    { boundWhatsappNumber: phone },
    {
      where: {
        id: businessId,
        boundWhatsappNumber: null,
      },
    }
  );
}
