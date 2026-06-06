"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { BallLoader } from "@/components/ui/BallLoader";
import { PlanExpiryCountdown } from "@/components/billing/PlanExpiryCountdown";
import { UsageBarChart } from "@/components/plan/UsageBarChart";
import { dashboardFetch } from "@/lib/dashboard/session";
import type { PlanUsageSnapshot } from "@/lib/plan-usage";

type OverviewPayload = {
  usage: PlanUsageSnapshot;
  daily: { date: string; aiReplies: number; contacts: number }[];
  checkout: { starter: string | null; pro: string | null; enterpriseWhatsapp: string };
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function limitLabel(used: number, limit: number | null, remaining: number | null): string {
  if (limit == null) return `${used.toLocaleString()} used · Unlimited`;
  const left = remaining ?? Math.max(0, limit - used);
  return `${used.toLocaleString()} / ${limit.toLocaleString()} · ${left.toLocaleString()} left`;
}

function UsageMeter({
  label,
  used,
  limit,
  remaining,
  warn,
}: {
  label: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  warn: boolean;
}) {
  const pct =
    limit != null && limit > 0
      ? Math.min(100, Math.round((used / limit) * 100))
      : 0;

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b7280]">
        {label}
      </p>
      <p
        className={`text-lg font-bold tabular-nums mt-1 ${
          warn ? "text-amber-600" : "text-[#111827]"
        }`}
      >
        {limitLabel(used, limit, remaining)}
      </p>
      {limit != null ? (
        <div className="mt-3 h-2 rounded-full bg-[#f3f4f6] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              warn ? "bg-amber-500" : "bg-[#25D366]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <p className="text-xs text-[#25D366] font-semibold mt-2">Unlimited on your plan</p>
      )}
    </div>
  );
}

export function BillingPanel() {
  const { bootstrapped, needsSetup } = useDashboard();
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!bootstrapped || needsSetup) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await dashboardFetch("/api/billing/overview", {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof json.error === "string" ? json.error : "Could not load billing."
        );
        setData(null);
        return;
      }
      setData(json as OverviewPayload);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }, [bootstrapped, needsSetup]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await dashboardFetch("/api/billing/cancel", {
        method: "POST",
        body: JSON.stringify({ mode: "at_period_end" }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? "Could not cancel subscription.");
        return;
      }
      toast.success(json.message ?? "Cancellation scheduled.");
      setCancelOpen(false);
      void load();
    } catch {
      toast.error("Network error.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-[#f0f2f5]">
        <BallLoader size="lg" />
      </div>
    );
  }

  const u = data?.usage;
  if (!u) {
    return (
      <div className="p-8 text-center text-[#667781]">
        Billing information is not available.
      </div>
    );
  }

  const canCancel =
    Boolean(u.whopMembershipId) &&
    u.plan !== "trial" &&
    !u.cancelAtPeriodEnd;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-[#f0f2f5]">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b7280]">
                Current plan
              </p>
              <h2 className="text-2xl font-bold text-[#111827] mt-1">{u.planLabel}</h2>
              <p className="text-sm text-[#6b7280] mt-2">
                Member since {fmtDate(u.subscriptionStartedAt)} · Billing period{" "}
                {fmtDate(u.periodStart)} → {fmtDate(u.periodEnd)}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {u.apiAccessEnabled ? (
                <span className="text-xs font-bold text-[#075E54] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  API access enabled
                </span>
              ) : (
                <span className="text-xs font-semibold text-[#6b7280] bg-[#f3f4f6] px-3 py-1 rounded-full">
                  API access · Enterprise only
                </span>
              )}
              {u.cancelAtPeriodEnd ? (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  Cancels at period end
                </span>
              ) : null}
            </div>
          </div>

          <PlanExpiryCountdown
            periodEnd={u.periodEnd}
            plan={u.plan}
            cancelAtPeriodEnd={u.cancelAtPeriodEnd}
          />

          {(u.aiLimitReached || u.contactsLimitReached) && (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
              <p className="font-bold">Monthly limit reached</p>
              <p className="mt-1">
                AI auto-reply is paused until your next billing cycle starts
                {u.periodEnd ? ` (${fmtDate(u.periodEnd)})` : ""}, or you can{" "}
                <Link href="/pricing" className="font-bold underline text-[#075E54]">
                  upgrade your plan
                </Link>
                .
              </p>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <UsageMeter
            label="AI replies this period"
            used={u.aiRepliesUsed}
            limit={u.aiRepliesLimit}
            remaining={u.aiRepliesRemaining}
            warn={u.aiLimitReached}
          />
          <UsageMeter
            label="Contacts this period"
            used={u.contactsUsed}
            limit={u.contactsLimit}
            remaining={u.contactsRemaining}
            warn={u.contactsLimitReached}
          />
        </div>

        <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#e5e7eb] bg-[#f8f9fa]">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#111b21]">
              Usage over time
            </h3>
          </div>
          <UsageBarChart data={data?.daily ?? []} aiLimit={u.aiRepliesLimit} />
        </div>

        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#111827]">Subscription</h3>
          <p className="text-sm text-[#4b5563] leading-relaxed">
            You joined us on <strong>{fmtDate(u.subscriptionStartedAt)}</strong>.
            We have built WhatsApp AI Sales to grow with your business — orders,
            AI replies, and happy customers matter to us. If you ever need to leave,
            we understand, though we would genuinely miss having you with us.
          </p>
          <p className="text-sm text-[#6b7280]">
            Cancelling stops future renewals. With &quot;cancel at period end&quot; you
            keep access until {fmtDate(u.periodEnd)}.
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#20bd5a]"
            >
              Change plan
            </Link>
            {canCancel ? (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"
              >
                Cancel subscription
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {cancelOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-labelledby="cancel-title"
          >
            <h3 id="cancel-title" className="text-lg font-bold text-[#111827]">
              Cancel your subscription?
            </h3>
            <p className="mt-3 text-sm text-[#4b5563] leading-relaxed">
              We are sorry to see you go. You joined on{" "}
              <strong>{fmtDate(u.subscriptionStartedAt)}</strong> and we value the
              trust you placed in us. Your access continues until the end of this
              billing period ({fmtDate(u.periodEnd)}). After that, AI replies and
              dashboard access will pause until you subscribe again.
            </p>
            <p className="mt-2 text-sm text-[#6b7280]">
              Your products, orders, and settings stay saved.
            </p>
            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setCancelOpen(false)}
                className="rounded-xl border border-[#e5e7eb] px-4 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb]"
              >
                Keep my plan
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={() => void handleCancel()}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-70"
              >
                {cancelling ? "Cancelling…" : "Yes, cancel at period end"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
