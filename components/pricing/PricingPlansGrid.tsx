"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { MARKETING_WHATSAPP } from "@/lib/marketing-cta";
import { PRICING_PLANS } from "@/lib/pricing-plans";
import {
  dashboardFetch,
  hasDashboardSession,
  requestOpenBusinessSettings,
} from "@/lib/dashboard/session";

function CheckIcon({ included }: { included: boolean }) {
  if (included) {
    return (
      <span
        className="material-symbols-outlined text-[#25D366] text-lg shrink-0"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        check_circle
      </span>
    );
  }
  return (
    <span className="material-symbols-outlined text-[#4b5563] text-lg shrink-0">
      close
    </span>
  );
}

export function PricingPlansGrid({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();

  const handleBuy = async (planId: string) => {
    if (planId === "enterprise") {
      window.open(MARKETING_WHATSAPP.sales, "_blank", "noopener,noreferrer");
      return;
    }

    if (!hasDashboardSession()) {
      router.push("/sign-in?next=/pricing");
      return;
    }

    try {
      const meRes = await dashboardFetch("/api/auth/me", { cache: "no-store" });
      if (meRes.status === 401) {
        router.push("/sign-in?next=/pricing");
        return;
      }

      const me = (await meRes.json().catch(() => ({}))) as {
        businessId?: number | null;
        profileComplete?: boolean;
        error?: string;
      };

      if (meRes.status === 402) {
        // Trial/subscription blocked — still allow purchasing a plan.
      } else if (!meRes.ok) {
        toast.error(me.error ?? "Could not verify your account.");
        return;
      } else if (!me.businessId || !me.profileComplete) {
        toast.error("Please complete your business details first.");
        requestOpenBusinessSettings();
        return;
      }

      const checkoutRes = await dashboardFetch("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: planId }),
      });
      const checkoutJson = (await checkoutRes.json().catch(() => ({}))) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (checkoutRes.status === 401) {
        router.push("/sign-in?next=/pricing");
        return;
      }
      if (checkoutRes.status === 403) {
        toast.error(
          checkoutJson.error ?? "Complete your business details before subscribing."
        );
        requestOpenBusinessSettings();
        return;
      }
      if (!checkoutRes.ok || !checkoutJson.checkoutUrl) {
        toast.error(checkoutJson.error ?? "Could not start checkout.");
        return;
      }

      window.location.href = checkoutJson.checkoutUrl;
    } catch {
      toast.error("Network error. Try again.");
    }
  };

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 ${
        compact ? "max-w-lg md:max-w-none mx-auto" : "gap-gutter"
      }`}
    >
      {PRICING_PLANS.map((plan) => (
        <div
          key={plan.id}
          className={`relative flex flex-col rounded-2xl sm:rounded-3xl bg-[#111827] text-white border ${
            plan.highlighted
              ? "border-[#25D366] shadow-xl md:scale-[1.02] z-10"
              : "border-[#1f2937]"
          } ${compact ? "p-5 sm:p-6" : "p-6 sm:p-8"}`}
        >
          {plan.highlighted ? (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#25D366] text-white text-[9px] sm:text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Most Popular
            </div>
          ) : null}

          <div className={`mb-5 sm:mb-6 ${plan.highlighted ? "pt-2" : ""}`}>
            <h3 className="text-lg sm:text-xl font-bold mb-1">{plan.name}</h3>
            <p className="text-xs sm:text-sm text-[#9ca3af]">{plan.tagline}</p>
          </div>

          <div className="mb-6 sm:mb-8">
            {plan.price ? (
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-sm text-[#9ca3af]">per month</span>
              </div>
            ) : (
              <div>
                <p className="text-xl sm:text-2xl font-bold text-[#25D366] leading-snug">
                  Custom pricing
                </p>
                <p className="text-xs sm:text-sm text-[#9ca3af] mt-2">
                  {plan.priceNote}
                </p>
              </div>
            )}
          </div>

          <div className="mb-5 sm:mb-6">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#6b7280] mb-3">
              Connections
            </p>
            <ul className="space-y-2.5 sm:space-y-3">
              {plan.connections.map((item) => (
                <li key={item.text} className="flex items-start gap-2 text-sm">
                  <CheckIcon included={true} />
                  <span className="flex-1 min-w-0 text-[#e5e7eb]">{item.text}</span>
                  {item.badge ? (
                    <span
                      className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        plan.id === "enterprise"
                          ? "bg-[#3b82f6]/20 text-[#93c5fd]"
                          : "bg-[#25D366]/15 text-[#86efac]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6 sm:mb-8 flex-1">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#6b7280] mb-3">
              Features
            </p>
            <ul className="space-y-2.5 sm:space-y-3">
              {plan.features.map((item) => (
                <li
                  key={item.text}
                  className={`flex items-start gap-2 text-sm ${
                    item.included ? "text-[#e5e7eb]" : "text-[#6b7280]"
                  }`}
                >
                  <CheckIcon included={item.included} />
                  <span className={item.bold && item.included ? "font-semibold" : ""}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {plan.ctaVariant === "primary" ? (
            <button
              type="button"
              onClick={() => void handleBuy(plan.id)}
              className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm sm:text-base font-bold transition-colors"
            >
              {plan.cta}
            </button>
          ) : plan.ctaVariant === "contact" ? (
            <button
              type="button"
              onClick={() => void handleBuy(plan.id)}
              className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-[#374151] text-white text-sm sm:text-base font-semibold hover:bg-[#1f2937] transition-colors"
            >
              {plan.cta}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleBuy(plan.id)}
              className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-[#374151] text-white text-sm sm:text-base font-semibold hover:bg-[#1f2937] transition-colors"
            >
              {plan.cta}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
