export type EffectivePlan =
  | "trial"
  | "starter"
  | "pro"
  | "enterprise"
  | null;

export type PlanQuota = {
  aiRepliesPerMonth: number | null;
  contactsPerMonth: number | null;
  apiAccess: boolean;
};

export const PLAN_QUOTAS: Record<
  Exclude<EffectivePlan, null>,
  PlanQuota
> = {
  trial: {
    aiRepliesPerMonth: 1_000,
    contactsPerMonth: 500,
    apiAccess: false,
  },
  starter: {
    aiRepliesPerMonth: 5_000,
    contactsPerMonth: 1_000,
    apiAccess: false,
  },
  pro: {
    aiRepliesPerMonth: null,
    contactsPerMonth: null,
    apiAccess: false,
  },
  enterprise: {
    aiRepliesPerMonth: null,
    contactsPerMonth: null,
    apiAccess: true,
  },
};

const NO_PLAN_QUOTA: PlanQuota = {
  aiRepliesPerMonth: 0,
  contactsPerMonth: 0,
  apiAccess: false,
};

export function effectivePlanFromBusiness(business: {
  plan: string | null;
  billingStatus: string | null;
}): EffectivePlan {
  const status = business.billingStatus?.trim().toLowerCase() ?? "";
  const plan = business.plan?.trim().toLowerCase() ?? "";

  if (status === "trial_active" || plan === "trial") return "trial";
  if (
    plan === "starter" ||
    plan === "pro" ||
    plan === "enterprise"
  ) {
    return plan;
  }
  if (status === "active") return "starter";
  return null;
}

export function getPlanQuota(plan: EffectivePlan): PlanQuota {
  if (!plan) return NO_PLAN_QUOTA;
  return PLAN_QUOTAS[plan] ?? NO_PLAN_QUOTA;
}

/** Plan limits plus optional admin bonuses on the business row. */
export function getEffectiveQuota(
  plan: EffectivePlan,
  bonuses?: { quotaAiBonus?: number | null; quotaContactsBonus?: number | null }
): PlanQuota {
  const base = getPlanQuota(plan);
  const aiBonus = Math.max(0, Number(bonuses?.quotaAiBonus ?? 0) || 0);
  const contactBonus = Math.max(
    0,
    Number(bonuses?.quotaContactsBonus ?? 0) || 0
  );
  return {
    apiAccess: base.apiAccess,
    aiRepliesPerMonth:
      base.aiRepliesPerMonth == null
        ? null
        : base.aiRepliesPerMonth + aiBonus,
    contactsPerMonth:
      base.contactsPerMonth == null
        ? null
        : base.contactsPerMonth + contactBonus,
  };
}

export function remainingCount(
  used: number,
  limit: number | null
): number | null {
  if (limit == null) return null;
  return Math.max(0, limit - used);
}

export function isOverLimit(used: number, limit: number | null): boolean {
  if (limit == null) return false;
  return used >= limit;
}
