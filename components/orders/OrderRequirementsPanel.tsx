"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { BallLoader } from "@/components/ui/BallLoader";
import { shouldToastDashboardApiError } from "@/lib/dashboard/api-errors";
import { dashboardFetch } from "@/lib/dashboard/session";
import type { OrderRequirements } from "@/lib/order-requirements";

export function OrderRequirementsPanel() {
  const { bootstrapped, needsSetup } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [req, setReq] = useState<OrderRequirements>({
    requireAddress: true,
    requireDeliveryCharges: false,
    deliveryChargeAmount: null,
    requireOrderPayment: false,
  });

  const load = useCallback(async () => {
    if (!bootstrapped || needsSetup) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await dashboardFetch("/api/business/order-requirements", {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg =
          typeof json.error === "string" ? json.error : "Could not load settings.";
        if (shouldToastDashboardApiError(errMsg)) toast.error(errMsg);
        return;
      }
      const r = (json as { requirements?: OrderRequirements }).requirements;
      if (r) setReq(r);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }, [bootstrapped, needsSetup]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      const res = await dashboardFetch("/api/business/order-requirements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof json.error === "string" ? json.error : "Could not save."
        );
        return;
      }
      toast.success("Checkout settings saved.");
      const r = (json as { requirements?: OrderRequirements }).requirements;
      if (r) setReq(r);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-[#f0f2f5]">
        <BallLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto bg-[#f0f2f5] p-4 sm:p-6">
      <div className="max-w-lg w-full mx-auto rounded-xl border border-black/10 bg-white shadow-sm p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#111b21]">
            What to collect from customer
          </h2>
          <p className="text-sm text-[#667781] mt-1">
            Orders appear in the Orders tab only after the customer completes the
            steps you enable. They must say they want to order first.
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={req.requireAddress}
            onChange={(e) =>
              setReq((r) => ({ ...r, requireAddress: e.target.checked }))
            }
          />
          <span>
            <span className="font-semibold text-[#111b21]">Delivery address</span>
            <span className="block text-xs text-[#667781]">
              Order is logged after they send their full address.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={req.requireDeliveryCharges}
            onChange={(e) =>
              setReq((r) => ({
                ...r,
                requireDeliveryCharges: e.target.checked,
              }))
            }
          />
          <span>
            <span className="font-semibold text-[#111b21]">
              Delivery charges payment
            </span>
            <span className="block text-xs text-[#667781]">
              Customer pays delivery fee and sends a payment screenshot.
            </span>
          </span>
        </label>

        {req.requireDeliveryCharges ? (
          <div className="pl-7">
            <label className="block text-xs font-semibold text-[#54656f] mb-1">
              Delivery charge amount (optional, for AI to quote)
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
              placeholder="e.g. 150"
              value={req.deliveryChargeAmount ?? ""}
              onChange={(e) =>
                setReq((r) => ({
                  ...r,
                  deliveryChargeAmount: e.target.value.trim() || null,
                }))
              }
            />
          </div>
        ) : null}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={req.requireOrderPayment}
            onChange={(e) =>
              setReq((r) => ({
                ...r,
                requireOrderPayment: e.target.checked,
              }))
            }
          />
          <span>
            <span className="font-semibold text-[#111b21]">Order payment</span>
            <span className="block text-xs text-[#667781]">
              Customer sends order payment screenshot; owner reviews before
              accepting.
            </span>
          </span>
        </label>

        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="w-full rounded-lg bg-[#075E54] text-white font-bold py-2.5 text-sm hover:bg-[#064e47] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
