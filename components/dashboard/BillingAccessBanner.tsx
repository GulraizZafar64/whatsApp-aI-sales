"use client";

import Link from "next/link";
import type { BillingBlockReason } from "@/components/dashboard/DashboardProvider";

type BillingAccessBannerProps = {
  blockReason: BillingBlockReason;
};

export function BillingAccessBanner({ blockReason }: BillingAccessBannerProps) {
  const isTrial = blockReason === "trial_expired";

  return (
    <div
      className={`shrink-0 border-b px-4 py-3 ${
        isTrial
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-orange-200 bg-orange-50 text-orange-950"
      }`}
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            {isTrial ? "Trial Ended" : "Please Renew Your Subscription"}
          </p>
          <p className="mt-0.5 text-sm opacity-90">
            {isTrial
              ? "Your free trial has ended. Subscribe to reconnect WhatsApp and resume AI replies."
              : "Your subscription has expired. WhatsApp stays connected, but AI auto-replies are paused until you renew."}
          </p>
        </div>
        <Link
          href="/pricing"
          className={`inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors ${
            isTrial
              ? "bg-[#25D366] hover:bg-[#20bd5a]"
              : "bg-[#111827] hover:bg-[#1f2937]"
          }`}
        >
          {isTrial ? "View pricing" : "Renew subscription"}
        </Link>
      </div>
    </div>
  );
}
