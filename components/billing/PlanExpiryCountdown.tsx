"use client";

import { useEffect, useMemo, useState } from "react";
import type { EffectivePlan } from "@/lib/plan-limits";

type CountdownParts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

function breakdown(targetMs: number, nowMs: number): CountdownParts {
  const totalMs = Math.max(0, targetMs - nowMs);
  const expired = targetMs <= nowMs;
  const totalSec = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { totalMs, days, hours, minutes, seconds, expired };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function countdownLabel(
  plan: EffectivePlan,
  cancelAtPeriodEnd: boolean
): string {
  if (plan === "trial") return "Trial ends in";
  if (cancelAtPeriodEnd) return "Access ends in";
  return "Plan renews in";
}

export function PlanExpiryCountdown({
  periodEnd,
  plan,
  cancelAtPeriodEnd = false,
}: {
  periodEnd: string | null;
  plan: EffectivePlan;
  cancelAtPeriodEnd?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  const targetMs = useMemo(() => {
    if (!periodEnd) return null;
    const t = new Date(periodEnd).getTime();
    return Number.isFinite(t) ? t : null;
  }, [periodEnd]);

  useEffect(() => {
    if (targetMs == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (targetMs == null) {
    return (
      <p className="text-sm text-[#6b7280] mt-3">No expiry date on file.</p>
    );
  }

  const parts = breakdown(targetMs, now);
  const label = countdownLabel(plan, cancelAtPeriodEnd);

  if (parts.expired) {
    return (
      <div
        className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
        role="timer"
        aria-live="polite"
      >
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">
          {plan === "trial" ? "Trial ended" : "Plan expired"}
        </p>
        <p className="text-sm text-red-800 mt-1">
          Renew or upgrade to restore AI replies and full access.
        </p>
      </div>
    );
  }

  const showDays = parts.days > 0;
  const units: { value: string; label: string }[] = showDays
    ? [
        { value: String(parts.days), label: "Days" },
        { value: pad2(parts.hours), label: "Hours" },
        { value: pad2(parts.minutes), label: "Min" },
        { value: pad2(parts.seconds), label: "Sec" },
      ]
    : [
        { value: pad2(parts.hours), label: "Hours" },
        { value: pad2(parts.minutes), label: "Min" },
        { value: pad2(parts.seconds), label: "Sec" },
      ];

  const endFormatted = new Date(targetMs).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div
      className="mt-4 rounded-xl border border-[#075E54]/20 bg-gradient-to-br from-[#e8f5e9] to-white p-4"
      role="timer"
      aria-live="polite"
      aria-label={`${label} ${parts.days} days ${parts.hours} hours`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[#075E54]">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
        {units.map((u) => (
          <div
            key={u.label}
            className="min-w-[4.5rem] flex-1 sm:flex-none rounded-lg bg-white border border-[#075E54]/15 px-3 py-2 text-center shadow-sm"
          >
            <span className="block text-2xl sm:text-3xl font-bold tabular-nums text-[#111827] leading-none">
              {u.value}
            </span>
            <span className="block text-[10px] font-semibold uppercase text-[#6b7280] mt-1">
              {u.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#6b7280] mt-3">
        {cancelAtPeriodEnd
          ? "Ends"
          : plan === "trial"
            ? "Trial ends"
            : "Next billing"}{" "}
        · {endFormatted}
      </p>
    </div>
  );
}
