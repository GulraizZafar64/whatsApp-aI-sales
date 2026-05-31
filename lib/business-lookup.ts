import { Business } from "@/lib/models";
import { ensureDb } from "@/lib/sequelize";
import { generateWebhookVerifyToken } from "@/lib/webhook-verify-token";
/** Match Meta webhook `metadata.phone_number_id` to a business row. */
export async function findBusinessByPhoneNumberId(
  phoneNumberId: string
): Promise<Business | null> {
  const trimmed = phoneNumberId.trim();
  if (!trimmed) return null;

  await ensureDb();

  const exact = await Business.findOne({ where: { phoneNumberId: trimmed } });
  if (exact) return exact;

  const rows = await Business.findAll({
    where: { status: "active" },
    limit: 100,
  });
  return (
    rows.find((b) => String(b.phoneNumberId).trim() === trimmed) ?? null
  );
}

/** Meta webhook GET: match `hub.verify_token` to a registered business. */
export async function findBusinessByWebhookVerifyToken(
  verifyToken: string
): Promise<Business | null> {
  const trimmed = verifyToken.trim();
  if (!trimmed) return null;

  await ensureDb();

  const exact = await Business.findOne({
    where: { webhookVerifyToken: trimmed },
  });
  if (exact) return exact;

  const rows = await Business.findAll({
    where: { status: "active" },
    limit: 200,
  });
  return (
    rows.find((b) => b.webhookVerifyToken?.trim() === trimmed) ?? null
  );
}

export type MetaConnectPayload = {
  /** Long-lived Meta user token for this business (WhatsApp Cloud API sends). */
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  whatsappNumber?: string;
  businessName?: string;
  userId?: string;
  needsReconnect?: boolean;
};

/** Create or update business when user connects WhatsApp (sign-in / get-started). */
export async function upsertBusinessFromMetaConnect(
  data: MetaConnectPayload
): Promise<Business> {
  await ensureDb();

  const phoneNumberId = data.phoneNumberId.trim();
  const userId =
    data.userId?.trim() ||
    `phone_${phoneNumberId}`;
  const metaPayload = {
    phoneNumberId,
    whatsappToken: data.accessToken.trim(),
    businessAccountId: data.businessAccountId.trim(),
    whatsappNumber: data.whatsappNumber?.trim() ?? null,
    status: "active" as const,
    userId,
    needsReconnect: data.needsReconnect ?? false,
  };

  const name = data.businessName?.trim();
  const defaults = {
    ...metaPayload,
    ...(name ? { businessName: name } : {}),
  };

  const [row, created] = await Business.findOrCreate({
    where: { phoneNumberId },
    defaults: {
      ...defaults,
      webhookVerifyToken: generateWebhookVerifyToken(),
    },
  });

  if (!created) {
    const updates: Record<string, unknown> = { ...metaPayload };
    if (name) updates.businessName = name;
    if (!row.webhookVerifyToken?.trim()) {
      updates.webhookVerifyToken = generateWebhookVerifyToken();
    }
    await row.update(updates);
    await row.reload();
  }

  return row;
}
