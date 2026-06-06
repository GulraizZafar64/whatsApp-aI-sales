import { normalizeCurrency } from "@/lib/currency";
import { Business } from "@/lib/models";
import { ensureDb } from "@/lib/sequelize";

export async function findBusinessById(
  businessId: number
): Promise<Business | null> {
  if (!Number.isFinite(businessId) || businessId <= 0) return null;
  await ensureDb();
  return Business.findByPk(businessId);
}

export async function findBusinessForUser(
  userId: number
): Promise<Business | null> {
  await ensureDb();
  return Business.findOne({
    where: { ownerUserId: userId },
    order: [["id", "DESC"]],
  });
}

export async function createBusinessForUser(params: {
  ownerUserId: number;
  businessName: string;
  businessType: string;
  country: string;
  currency?: string | null;
  whatsappNumber?: string | null;
}): Promise<Business> {
  await ensureDb();

  const existing = await findBusinessForUser(params.ownerUserId);
  if (existing) {
    await existing.update({
      businessName: params.businessName.trim(),
      businessType: params.businessType.trim(),
      country: params.country.trim(),
      ...(params.currency != null
        ? { currency: normalizeCurrency(params.currency) }
        : {}),
      whatsappNumber: params.whatsappNumber?.trim() ?? existing.whatsappNumber,
    });
    await existing.reload();
    return existing;
  }

  const row = await Business.create({
    ownerUserId: params.ownerUserId,
    businessName: params.businessName.trim(),
    businessType: params.businessType.trim(),
    country: params.country.trim(),
    currency: normalizeCurrency(params.currency),
    whatsappNumber: params.whatsappNumber?.trim() ?? null,
    waStatus: "disconnected",
  });
  await row.reload();
  return row;
}
