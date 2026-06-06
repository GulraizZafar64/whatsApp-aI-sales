import { Op, fn, col } from "sequelize";
import { Business, WhatsAppMessage } from "@/lib/models";
import { ensureDb } from "@/lib/sequelize";
import {
  effectivePlanFromBusiness,
  getEffectiveQuota,
  isOverLimit,
  remainingCount,
  type EffectivePlan,
} from "@/lib/plan-limits";
import { readBusinessBilling } from "@/lib/business-billing";

export type PlanUsageSnapshot = {
  plan: EffectivePlan;
  planLabel: string;
  periodStart: string;
  periodEnd: string | null;
  subscriptionStartedAt: string | null;
  apiAccessEnabled: boolean;
  cancelAtPeriodEnd: boolean;
  aiRepliesUsed: number;
  aiRepliesLimit: number | null;
  aiRepliesRemaining: number | null;
  contactsUsed: number;
  contactsLimit: number | null;
  contactsRemaining: number | null;
  aiLimitReached: boolean;
  contactsLimitReached: boolean;
  whopMembershipId: string | null;
};

function planLabel(plan: EffectivePlan): string {
  if (plan === "trial") return "Free trial";
  if (plan === "starter") return "Starter";
  if (plan === "pro") return "Pro";
  if (plan === "enterprise") return "Enterprise";
  return "None";
}

export function usagePeriodStart(business: Business): Date {
  const usage = business.usagePeriodStart;
  if (usage) return usage instanceof Date ? usage : new Date(usage);
  const billing = readBusinessBilling(business);
  if (billing.periodEndsAt) {
    const d = new Date(billing.periodEndsAt.getTime());
    d.setUTCMonth(d.getUTCMonth() - 1);
    return d;
  }
  return business.createdAt instanceof Date
    ? business.createdAt
    : new Date();
}

export async function countAiRepliesInPeriod(
  businessId: number,
  since: Date
): Promise<number> {
  await ensureDb();
  return WhatsAppMessage.count({
    where: {
      businessId,
      direction: "outgoing",
      outgoingSource: "ai",
      createdAt: { [Op.gte]: since },
    },
  });
}

export async function countDistinctContactsInPeriod(
  businessId: number,
  since: Date
): Promise<number> {
  await ensureDb();
  const rows = (await WhatsAppMessage.findAll({
    attributes: [[fn("COUNT", fn("DISTINCT", col("sender_wa_id"))), "cnt"]],
    where: {
      businessId,
      direction: "incoming",
      createdAt: { [Op.gte]: since },
    },
    raw: true,
  })) as unknown as { cnt: string }[];
  return Number.parseInt(String(rows[0]?.cnt ?? "0"), 10) || 0;
}

export async function isNewContactInPeriod(
  businessId: number,
  senderWaId: string,
  since: Date
): Promise<boolean> {
  await ensureDb();
  const prior = await WhatsAppMessage.count({
    where: {
      businessId,
      senderWaId,
      direction: "incoming",
      createdAt: { [Op.gte]: since },
    },
  });
  return prior <= 1;
}

function quotaBonuses(business: Business) {
  return {
    quotaAiBonus: business.quotaAiBonus,
    quotaContactsBonus: business.quotaContactsBonus,
  };
}

export async function getPlanUsageSnapshot(
  business: Business
): Promise<PlanUsageSnapshot> {
  const plan = effectivePlanFromBusiness(business);
  const quota = getEffectiveQuota(plan, quotaBonuses(business));
  const since = usagePeriodStart(business);
  const billing = readBusinessBilling(business);

  const [aiRepliesUsed, contactsUsed] = await Promise.all([
    countAiRepliesInPeriod(business.id, since),
    countDistinctContactsInPeriod(business.id, since),
  ]);

  const subStarted = business.subscriptionStartedAt;
  return {
    plan,
    planLabel: planLabel(plan),
    periodStart: since.toISOString(),
    periodEnd: billing.periodEndsAt?.toISOString() ?? null,
    subscriptionStartedAt: subStarted
      ? (subStarted instanceof Date
          ? subStarted
          : new Date(subStarted)
        ).toISOString()
      : null,
    apiAccessEnabled: Boolean(business.apiAccessEnabled),
    cancelAtPeriodEnd: Boolean(business.cancelAtPeriodEnd),
    aiRepliesUsed,
    aiRepliesLimit: quota.aiRepliesPerMonth,
    aiRepliesRemaining: remainingCount(
      aiRepliesUsed,
      quota.aiRepliesPerMonth
    ),
    contactsUsed,
    contactsLimit: quota.contactsPerMonth,
    contactsRemaining: remainingCount(
      contactsUsed,
      quota.contactsPerMonth
    ),
    aiLimitReached: isOverLimit(aiRepliesUsed, quota.aiRepliesPerMonth),
    contactsLimitReached: isOverLimit(
      contactsUsed,
      quota.contactsPerMonth
    ),
    whopMembershipId: business.whopMembershipId?.trim() || null,
  };
}

export type PlanUsageGate =
  | { allowed: true }
  | {
      allowed: false;
      reason: "ai_limit" | "contacts_limit";
      message: string;
      usage: PlanUsageSnapshot;
    };

export async function checkAiReplyAllowed(
  business: Business,
  senderWaId: string
): Promise<PlanUsageGate> {
  const usage = await getPlanUsageSnapshot(business);
  const since = new Date(usage.periodStart);

  if (usage.aiLimitReached) {
    return {
      allowed: false,
      reason: "ai_limit",
      message:
        "Monthly AI reply limit reached. Wait for your next billing cycle or upgrade your plan.",
      usage,
    };
  }

  const quota = getEffectiveQuota(usage.plan, quotaBonuses(business));
  if (quota.contactsPerMonth != null) {
    const isNew = await isNewContactInPeriod(
      business.id,
      senderWaId,
      since
    );
    if (isNew && usage.contactsLimitReached) {
      return {
        allowed: false,
        reason: "contacts_limit",
        message:
          "Monthly contact limit reached. Wait for your next billing cycle or upgrade your plan.",
        usage,
      };
    }
  }

  return { allowed: true };
}

/** Start a new billing usage period (AI replies + contacts count from this time). */
export function newUsagePeriodStart(): Date {
  return new Date();
}

/** Reset monthly counters at subscription start / renewal. */
export function paidPlanPatch(
  plan: string,
  periodEndsAt: Date
): Partial<Business> {
  const p = plan.trim().toLowerCase();
  return {
    plan: p,
    billingStatus: "active",
    periodEndsAt,
    usagePeriodStart: newUsagePeriodStart(),
    apiAccessEnabled: p === "enterprise",
    cancelAtPeriodEnd: false,
  };
}

export async function resetBillingUsagePeriod(
  business: Business
): Promise<void> {
  await business.update({ usagePeriodStart: newUsagePeriodStart() });
}

export async function ensureSubscriptionStartedAt(
  business: Business
): Promise<void> {
  if (!business.subscriptionStartedAt) {
    await business.update({ subscriptionStartedAt: new Date() });
  }
}

export type DailyUsagePoint = { date: string; aiReplies: number; contacts: number };

export async function dailyUsageSeries(
  businessId: number,
  since: Date,
  days = 30
): Promise<DailyUsagePoint[]> {
  await ensureDb();
  const end = new Date();
  const series: DailyUsagePoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(end);
    day.setUTCHours(0, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() - i);
    const next = new Date(day);
    next.setUTCDate(next.getUTCDate() + 1);

    const [aiReplies, contactRows] = await Promise.all([
      WhatsAppMessage.count({
        where: {
          businessId,
          direction: "outgoing",
          outgoingSource: "ai",
          createdAt: { [Op.gte]: day, [Op.lt]: next },
        },
      }),
      WhatsAppMessage.findAll({
        attributes: [[fn("COUNT", fn("DISTINCT", col("sender_wa_id"))), "cnt"]],
        where: {
          businessId,
          direction: "incoming",
          createdAt: { [Op.gte]: day, [Op.lt]: next },
        },
        raw: true,
      }) as Promise<unknown[]>,
    ]);

    const cnt = Number.parseInt(
      String((contactRows[0] as { cnt?: string })?.cnt ?? "0"),
      10
    );

    series.push({
      date: day.toISOString().slice(0, 10),
      aiReplies,
      contacts: cnt,
    });
  }

  return series;
}
