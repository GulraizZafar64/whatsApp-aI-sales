import type { Business } from "@/lib/models";
import type { BillingPlan, BillingState } from "@/lib/billing";

/** Stored on `businesses.plan` — trial or paid tier. */
export type StoredBusinessPlan = BillingPlan | "trial";

export type StoredBillingStatus =
  | "trial_active"
  | "trial_expired"
  | "checkout_pending"
  | "active"
  | "expired"
  | "renewal_failed";

export function asBillingDate(
  value: Date | string | null | undefined
): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function readBusinessBilling(business: Business): {
  plan: StoredBusinessPlan | null;
  billingStatus: StoredBillingStatus | null;
  periodEndsAt: Date | null;
  whopMembershipId: string | null;
  billingEmailSentAt: Date | null;
  billingNoticeKey: string | null;
} {
  return {
    plan: (business.plan as StoredBusinessPlan | null) ?? null,
    billingStatus:
      (business.billingStatus as StoredBillingStatus | null) ?? null,
    periodEndsAt: asBillingDate(business.periodEndsAt),
    whopMembershipId: business.whopMembershipId?.trim() || null,
    billingEmailSentAt: asBillingDate(business.billingEmailSentAt),
    billingNoticeKey: business.billingNoticeKey?.trim() || null,
  };
}

export function billingStateToStoredStatus(
  state: BillingState
): StoredBillingStatus {
  if (state === "subscription_active") return "active";
  if (state === "subscription_expired") return "expired";
  return state;
}

export function storedStatusToBillingState(
  status: StoredBillingStatus | null
): BillingState | null {
  if (!status) return null;
  if (status === "active") return "subscription_active";
  if (status === "expired") return "subscription_expired";
  if (status === "checkout_pending") return "trial_active";
  if (status === "renewal_failed") return "renewal_failed";
  if (status === "trial_active") return "trial_active";
  if (status === "trial_expired") return "trial_expired";
  return "trial_expired";
}

/** Start or refresh the 1-day trial on first business setup. */
export function trialStartPayload(): Pick<
  Business,
  | "plan"
  | "billingStatus"
  | "periodEndsAt"
  | "billingEmailSentAt"
  | "usagePeriodStart"
  | "apiAccessEnabled"
  | "cancelAtPeriodEnd"
> {
  const now = new Date();
  const periodEndsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    plan: "trial",
    billingStatus: "trial_active",
    periodEndsAt,
    usagePeriodStart: now,
    apiAccessEnabled: false,
    cancelAtPeriodEnd: false,
    billingEmailSentAt: null,
  };
}

export function isTrialActive(business: Business): boolean {
  const { billingStatus, periodEndsAt } = readBusinessBilling(business);
  if (billingStatus !== "trial_active") return false;
  return Boolean(periodEndsAt && periodEndsAt.getTime() > Date.now());
}
