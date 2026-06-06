import { Op } from "sequelize";
import { Business, User } from "@/lib/models";
import { ensureDb } from "@/lib/sequelize";
import { hashPassword } from "@/lib/auth/password";
import { readBusinessBilling } from "@/lib/business-billing";
import {
  getPlanUsageSnapshot,
  paidPlanPatch,
  resetBillingUsagePeriod,
} from "@/lib/plan-usage";
import { defaultMonthlyPeriodEnd } from "@/lib/whop-api";
import {
  disconnectWhatsAppClient,
  prepareWhatsAppSession,
} from "@/lib/whatsapp-web/manager";

export type AdminUserRow = {
  userId: number;
  email: string;
  name: string | null;
  createdAt: string;
  business: {
    id: number;
    businessName: string | null;
    plan: string | null;
    billingStatus: string | null;
    periodEndsAt: string | null;
    waStatus: string;
    whatsappNumber: string | null;
    quotaAiBonus: number;
    quotaContactsBonus: number;
    aiAutoReplyEnabled: boolean;
    usage: {
      aiRepliesUsed: number;
      aiRepliesLimit: number | null;
      contactsUsed: number;
      contactsLimit: number | null;
    };
  } | null;
};

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  await ensureDb();
  const users = await User.findAll({
    order: [["id", "DESC"]],
    limit: 500,
  });

  const rows: AdminUserRow[] = [];
  for (const user of users) {
    const business = await Business.findOne({
      where: { ownerUserId: user.id },
      order: [["id", "DESC"]],
    });

    let businessPayload: AdminUserRow["business"] = null;
    if (business) {
      const usage = await getPlanUsageSnapshot(business);
      businessPayload = {
        id: business.id,
        businessName: business.businessName,
        plan: business.plan,
        billingStatus: business.billingStatus,
        periodEndsAt: business.periodEndsAt?.toISOString() ?? null,
        waStatus: business.waStatus ?? "disconnected",
        whatsappNumber: business.whatsappNumber,
        quotaAiBonus: business.quotaAiBonus ?? 0,
        quotaContactsBonus: business.quotaContactsBonus ?? 0,
        aiAutoReplyEnabled: business.aiAutoReplyEnabled !== false,
        usage: {
          aiRepliesUsed: usage.aiRepliesUsed,
          aiRepliesLimit: usage.aiRepliesLimit,
          contactsUsed: usage.contactsUsed,
          contactsLimit: usage.contactsLimit,
        },
      };
    }

    rows.push({
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt:
        (user.get("createdAt") as Date | undefined)?.toISOString() ??
        new Date().toISOString(),
      business: businessPayload,
    });
  }

  return rows;
}

export async function updateAdminUser(
  userId: number,
  patch: { email?: string; name?: string | null; password?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureDb();
  const user = await User.findByPk(userId);
  if (!user) return { ok: false, error: "User not found." };

  const updates: Partial<{ email: string; name: string | null; passwordHash: string }> =
    {};

  if (patch.email !== undefined) {
    const email = patch.email.trim().toLowerCase();
    if (!email.includes("@")) return { ok: false, error: "Invalid email." };
    const taken = await User.findOne({
      where: { email, id: { [Op.ne]: userId } },
    });
    if (taken) return { ok: false, error: "Email already in use." };
    updates.email = email;
  }

  if (patch.name !== undefined) {
    updates.name = patch.name?.trim() || null;
  }

  if (patch.password !== undefined) {
    const pw = patch.password;
    if (pw.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters." };
    }
    updates.passwordHash = await hashPassword(pw);
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "No changes provided." };
  }

  await user.update(updates);
  return { ok: true };
}

export async function deleteAdminUser(
  userId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureDb();
  const user = await User.findByPk(userId);
  if (!user) return { ok: false, error: "User not found." };

  const businesses = await Business.findAll({
    where: { ownerUserId: userId },
  });
  for (const b of businesses) {
    try {
      await disconnectWhatsAppClient(b.id);
      await prepareWhatsAppSession(b.id);
    } catch {
      /* best effort */
    }
  }

  await user.destroy();
  return { ok: true };
}

export type AdminBusinessPatch = {
  businessName?: string | null;
  plan?: string | null;
  billingStatus?: string | null;
  periodEndsAt?: string | null;
  quotaAiBonus?: number;
  quotaContactsBonus?: number;
  aiAutoReplyEnabled?: boolean;
  whopMembershipId?: string | null;
};

export async function updateAdminBusiness(
  businessId: number,
  patch: AdminBusinessPatch
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureDb();
  const business = await Business.findByPk(businessId);
  if (!business) return { ok: false, error: "Business not found." };

  const updates: Record<string, unknown> = {};

  if (patch.businessName !== undefined) {
    updates.businessName = patch.businessName?.trim() || null;
  }
  if (patch.plan !== undefined) {
    updates.plan = patch.plan?.trim().toLowerCase() || null;
  }
  if (patch.billingStatus !== undefined) {
    updates.billingStatus = patch.billingStatus?.trim().toLowerCase() || null;
  }
  if (patch.periodEndsAt !== undefined) {
    if (!patch.periodEndsAt) {
      updates.periodEndsAt = null;
    } else {
      const d = new Date(patch.periodEndsAt);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, error: "Invalid period end date." };
      }
      updates.periodEndsAt = d;
    }
  }
  if (patch.quotaAiBonus !== undefined) {
    updates.quotaAiBonus = Math.max(0, Math.floor(patch.quotaAiBonus));
  }
  if (patch.quotaContactsBonus !== undefined) {
    updates.quotaContactsBonus = Math.max(
      0,
      Math.floor(patch.quotaContactsBonus)
    );
  }
  if (patch.aiAutoReplyEnabled !== undefined) {
    updates.aiAutoReplyEnabled = Boolean(patch.aiAutoReplyEnabled);
  }
  if (patch.whopMembershipId !== undefined) {
    updates.whopMembershipId = patch.whopMembershipId?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "No changes provided." };
  }

  await business.update(updates);
  return { ok: true };
}

export async function grantAdminSubscription(params: {
  businessId: number;
  plan: "starter" | "pro" | "enterprise" | "trial";
  days?: number;
  resetUsage?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureDb();
  const business = await Business.findByPk(params.businessId);
  if (!business) return { ok: false, error: "Business not found." };

  const days = Math.max(1, Math.min(365, params.days ?? 30));
  const periodEndsAt = new Date();
  periodEndsAt.setUTCDate(periodEndsAt.getUTCDate() + days);

  if (params.plan === "trial") {
    await business.update({
      plan: "trial",
      billingStatus: "trial_active",
      periodEndsAt,
      usagePeriodStart: new Date(),
      cancelAtPeriodEnd: false,
      billingNoticeKey: null,
      billingEmailSentAt: null,
    });
  } else {
    const end =
      params.plan === "enterprise"
        ? defaultMonthlyPeriodEnd(periodEndsAt)
        : periodEndsAt;
    await business.update({
      ...paidPlanPatch(params.plan, end),
      billingNoticeKey: null,
      billingEmailSentAt: null,
    });
  }

  if (params.resetUsage !== false) {
    await resetBillingUsagePeriod(business);
  }

  await business.reload();
  return { ok: true };
}

export async function adminResetBusinessUsage(
  businessId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureDb();
  const business = await Business.findByPk(businessId);
  if (!business) return { ok: false, error: "Business not found." };
  await resetBillingUsagePeriod(business);
  return { ok: true };
}

export async function adminDisconnectWhatsApp(
  businessId: number,
  clearSession = true
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureDb();
  const business = await Business.findByPk(businessId);
  if (!business) return { ok: false, error: "Business not found." };

  await disconnectWhatsAppClient(businessId);
  if (clearSession) {
    await prepareWhatsAppSession(businessId);
  }
  await business.update({
    waStatus: "disconnected",
    waQrDataUrl: null,
    whatsappNumber: null,
  });
  return { ok: true };
}

export async function getAdminUserDetail(userId: number) {
  await ensureDb();
  const user = await User.findByPk(userId);
  if (!user) return null;

  const business = await Business.findOne({
    where: { ownerUserId: userId },
    order: [["id", "DESC"]],
  });

  const billing = business ? readBusinessBilling(business) : null;
  const usage = business ? await getPlanUsageSnapshot(business) : null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    business: business
      ? {
          id: business.id,
          businessName: business.businessName,
          billing,
          usage,
          waStatus: business.waStatus,
          whatsappNumber: business.whatsappNumber,
          quotaAiBonus: business.quotaAiBonus ?? 0,
          quotaContactsBonus: business.quotaContactsBonus ?? 0,
          aiAutoReplyEnabled: business.aiAutoReplyEnabled !== false,
        }
      : null,
  };
}
