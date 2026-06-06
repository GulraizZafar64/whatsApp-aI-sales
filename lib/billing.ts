import { Business } from "@/lib/models";
import { readBusinessBilling, type StoredBillingStatus } from "@/lib/business-billing";
import { blockBusinessAccess } from "@/lib/billing-notice";

export type BillingPlan = "starter" | "pro" | "enterprise" | null;
export type BillingState =
  | "trial_active"
  | "trial_expired"
  | "subscription_active"
  | "subscription_expired"
  | "renewal_failed";

export type BlockedAccessReason =
  | "trial_expired"
  | "subscription_expired"
  | "renewal_failed";

export type AccessStatus =
  | { allowed: true; state: BillingState; reason: null }
  | {
      allowed: false;
      state: BillingState;
      reason: BlockedAccessReason;
    };

export function getWhopEnvironment(): "development" | "production" {
  return process.env.WHOP_ENV?.trim().toLowerCase() === "production"
    ? "production"
    : "development";
}

export function getCheckoutUrl(plan: "starter" | "pro"): string | null {
  const env = getWhopEnvironment();
  const starter =
    env === "production"
      ? process.env.WHOP_LIVE_CHECKOUT_URL_STARTER
      : process.env.WHOP_SANDBOX_CHECKOUT_URL_STARTER;
  const pro =
    env === "production"
      ? process.env.WHOP_LIVE_CHECKOUT_URL_PRO
      : process.env.WHOP_SANDBOX_CHECKOUT_URL_PRO;
  const raw = plan === "starter" ? starter : pro;
  return raw?.trim() || null;
}

export function getEnterpriseWhatsAppUrl(): string {
  const to = "923226246616";
  const msg = encodeURIComponent(
    "Hi, I want to buy the Enterprise plan for WhatsApp AI Sales."
  );
  return `https://wa.me/${to}?text=${msg}`;
}

function accessFromStored(
  billingStatus: StoredBillingStatus | null,
  periodEndsAt: Date | null
): AccessStatus {
  const now = Date.now();
  const ends = periodEndsAt?.getTime() ?? 0;

  if (billingStatus === "active") {
    if (!periodEndsAt || ends > now) {
      return { allowed: true, state: "subscription_active", reason: null };
    }
    return {
      allowed: false,
      state: "subscription_expired",
      reason: "subscription_expired",
    };
  }

  if (billingStatus === "renewal_failed") {
    return { allowed: false, state: "renewal_failed", reason: "renewal_failed" };
  }

  if (billingStatus === "expired") {
    return {
      allowed: false,
      state: "subscription_expired",
      reason: "subscription_expired",
    };
  }

  if (billingStatus === "trial_expired") {
    return { allowed: false, state: "trial_expired", reason: "trial_expired" };
  }

  if (
    billingStatus === "trial_active" ||
    billingStatus === "checkout_pending"
  ) {
    if (!periodEndsAt || ends > now) {
      return { allowed: true, state: "trial_active", reason: null };
    }
    return { allowed: false, state: "trial_expired", reason: "trial_expired" };
  }

  return { allowed: false, state: "trial_expired", reason: "trial_expired" };
}

export function resolveBusinessAccess(business: Business): AccessStatus {
  const { billingStatus, periodEndsAt } = readBusinessBilling(business);
  return accessFromStored(billingStatus, periodEndsAt);
}

export async function enforceBusinessAccess(
  business: Business,
  userId: number
): Promise<AccessStatus> {
  void userId;
  const access = resolveBusinessAccess(business);
  if (access.allowed) return access;

  await blockBusinessAccess(business, access);
  return access;
}

/** Trial expiry disconnects WhatsApp; paid subscription expiry keeps the session. */
export function isWhatsAppSessionAllowed(access: AccessStatus): boolean {
  if (access.allowed) return true;
  return access.reason !== "trial_expired";
}

export function isAiReplyAllowedByBilling(access: AccessStatus): boolean {
  return access.allowed;
}
