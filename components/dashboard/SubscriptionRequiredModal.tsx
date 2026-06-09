"use client";

import Link from "next/link";
import type { BillingBlockReason } from "@/components/dashboard/DashboardProvider";

type Props = {
  blockReason: BillingBlockReason;
};

export function SubscriptionRequiredModal({ blockReason }: Props) {
  const isTrial = blockReason === "trial_expired";

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-required-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
          {isTrial ? "⏱" : "🔒"}
        </div>
        <h2
          id="subscription-required-title"
          className="text-xl font-bold text-[#111827]"
        >
          {isTrial ? "Free trial ended" : "Please renew subscription"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#4b5563]">
          {isTrial
            ? "Your trial has ended. Subscribe to connect WhatsApp and use AI auto-replies again."
            : blockReason === "renewal_failed"
              ? "We could not renew your subscription. Buy or renew a plan to restore full access."
              : "Your subscription has expired. Renew your plan to continue using WhatsApp AI Sales."}
        </p>
        <Link
          href="/pricing"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white hover:bg-[#20bd5a] transition-colors"
        >
          {isTrial ? "Buy subscription" : "Renew subscription"}
        </Link>
        <p className="mt-3 text-xs text-[#667781]">
          Choose a plan on the pricing page to continue.
        </p>
      </div>
    </div>
  );
}
