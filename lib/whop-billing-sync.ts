import { Op } from "sequelize";
import { Business } from "@/lib/models";
import { ensureDb } from "@/lib/sequelize";
import type { BillingPlan } from "@/lib/billing";
import {
  ensureSubscriptionStartedAt,
  paidPlanPatch,
} from "@/lib/plan-usage";
import {
  extractPeriodEndFromWhopData,
  fetchWhopMembershipPeriodEnd,
  defaultMonthlyPeriodEnd,
} from "@/lib/whop-api";

const CHECKOUT_PENDING_MS = 3 * 60 * 60 * 1000;

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toBusinessId(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function readMetadataBusinessId(
  data: Record<string, unknown>
): number | null {
  const meta = readRecord(data.metadata);
  if (!meta) return null;
  return (
    toBusinessId(meta.businessId) ??
    toBusinessId(meta.business_id) ??
    null
  );
}

export function readMembershipId(
  data: Record<string, unknown>
): string | null {
  if (typeof data.id === "string" && data.id.startsWith("mem_")) {
    return data.id;
  }
  const membership = readRecord(data.membership);
  if (
    membership &&
    typeof membership.id === "string" &&
    membership.id.startsWith("mem_")
  ) {
    return membership.id;
  }
  if (typeof data.membership_id === "string") {
    return data.membership_id;
  }
  return null;
}

export function readProductPlanSlug(
  data: Record<string, unknown>
): BillingPlan {
  const product = readRecord(data.product);
  const title =
    product && typeof product.title === "string"
      ? product.title.trim().toLowerCase()
      : "";
  if (title === "starter" || title === "pro" || title === "enterprise") {
    return title;
  }
  const meta = readRecord(data.metadata);
  const metaPlan =
    meta && typeof meta.plan === "string" ? meta.plan.trim().toLowerCase() : "";
  if (metaPlan === "starter" || metaPlan === "pro") return metaPlan;
  return null;
}

export function readPlanId(data: Record<string, unknown>): string | null {
  const plan = readRecord(data.plan);
  if (plan && typeof plan.id === "string") return plan.id;
  if (typeof data.plan_id === "string") return data.plan_id;
  return null;
}

export function planSlugFromWhopPlanId(planId: string | null): BillingPlan {
  if (!planId) return null;
  const urls = [
    process.env.WHOP_SANDBOX_CHECKOUT_URL_STARTER,
    process.env.WHOP_SANDBOX_CHECKOUT_URL_PRO,
    process.env.WHOP_LIVE_CHECKOUT_URL_STARTER,
    process.env.WHOP_LIVE_CHECKOUT_URL_PRO,
  ];
  const starter = urls[0]?.trim();
  const pro = urls[1]?.trim();
  const liveStarter = urls[2]?.trim();
  const livePro = urls[3]?.trim();
  if (starter?.includes(planId) || liveStarter?.includes(planId)) return "starter";
  if (pro?.includes(planId) || livePro?.includes(planId)) return "pro";
  return null;
}

export function resolvePaidPlan(
  data: Record<string, unknown>,
  fallback: string | null
): BillingPlan {
  const meta = readRecord(data.metadata);
  const metaPlan =
    meta && typeof meta.plan === "string" ? meta.plan.trim().toLowerCase() : "";
  if (metaPlan === "starter" || metaPlan === "pro" || metaPlan === "enterprise") {
    return metaPlan;
  }
  return (
    readProductPlanSlug(data) ??
    planSlugFromWhopPlanId(readPlanId(data)) ??
    (fallback as BillingPlan) ??
    null
  );
}

async function findByPendingCheckout(
  planSlug: BillingPlan
): Promise<Business | null> {
  if (!planSlug) return null;
  const since = new Date(Date.now() - CHECKOUT_PENDING_MS);
  return Business.findOne({
    where: {
      billingStatus: "checkout_pending",
      plan: planSlug,
      updatedAt: { [Op.gte]: since },
    },
    order: [["updatedAt", "DESC"]],
  });
}

export async function findBusinessForWhopEvent(
  data: Record<string, unknown>,
  membershipId: string | null
): Promise<Business | null> {
  await ensureDb();

  const fromMeta = readMetadataBusinessId(data);
  if (fromMeta) {
    const row = await Business.findByPk(fromMeta);
    if (row) return row;
  }

  if (membershipId) {
    const byMembership = await Business.findOne({
      where: { whopMembershipId: membershipId },
    });
    if (byMembership) return byMembership;
  }

  const planSlug = readProductPlanSlug(data) ?? planSlugFromWhopPlanId(readPlanId(data));
  const pending = await findByPendingCheckout(planSlug);
  if (pending) return pending;

  const email = (() => {
    const user = readRecord(data.user);
    if (user && typeof user.email === "string") return user.email.trim();
    if (typeof data.email === "string") return data.email.trim();
    return null;
  })();

  if (email) {
    const { User } = await import("@/lib/models");
    const user = await User.findOne({
      where: { email: email.toLowerCase() },
    });
    if (user) {
      const biz = await Business.findOne({
        where: { ownerUserId: user.id },
        order: [["id", "DESC"]],
      });
      if (biz) return biz;
    }
  }

  return null;
}

export async function resolvePeriodEnd(
  data: Record<string, unknown>,
  membershipId: string | null
): Promise<Date> {
  const fromPayload = extractPeriodEndFromWhopData(data);
  if (fromPayload) return fromPayload;

  if (membershipId) {
    const fromApi = await fetchWhopMembershipPeriodEnd(membershipId);
    if (fromApi) return fromApi;
  }

  const paidAt =
    typeof data.paid_at === "string" ? new Date(data.paid_at) : null;
  if (paidAt && !Number.isNaN(paidAt.getTime())) {
    return defaultMonthlyPeriodEnd(paidAt);
  }

  return defaultMonthlyPeriodEnd();
}

export async function applyPaidSubscription(
  business: Business,
  data: Record<string, unknown>,
  membershipId: string | null
): Promise<void> {
  const periodEndsAt = await resolvePeriodEnd(data, membershipId);
  const paidPlan = resolvePaidPlan(data, business.plan);

  const planName = (paidPlan ?? business.plan ?? "starter").toString();
  const saved = {
    ...paidPlanPatch(planName, periodEndsAt),
    whopMembershipId: membershipId ?? business.whopMembershipId,
    billingEmailSentAt: null,
    billingNoticeKey: null,
  };

  console.log("[whop-billing] apply paid subscription", {
    businessId: business.id,
    saved,
  });

  const wasActive = business.billingStatus === "active";
  const previousPeriodEnd = business.periodEndsAt?.getTime() ?? 0;
  const isRenewal =
    wasActive &&
    periodEndsAt.getTime() > previousPeriodEnd + 60_000;

  await business.update(saved);
  await business.reload();
  await ensureSubscriptionStartedAt(business);

  console.log("[whop-billing] usage period reset for plan limits", {
    businessId: business.id,
    plan: planName,
    isRenewal,
    usagePeriodStart: business.usagePeriodStart,
  });
}

export async function markCheckoutPending(
  business: Business,
  plan: "starter" | "pro"
): Promise<void> {
  await business.update({
    plan,
    billingStatus: "checkout_pending",
  });
}
