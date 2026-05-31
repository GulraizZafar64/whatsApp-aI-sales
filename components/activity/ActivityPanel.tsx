"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { COMPLETED_ORDERS_CHANGED_EVENT } from "@/lib/dashboard-events";
import { dashboardFetch } from "@/lib/dashboard/session";

type ActivityRow = {
  contactWaId: string;
  displayPhone: string;
  aiMessagesSent: number;
};

type OrderRow = {
  id: number;
  productName: string;
  quantitySold: number;
  lineTotal: string;
  createdAt: string | null;
};

type ActivityPayload = {
  ai: {
    totalMessagesSent: number;
    uniqueUsers: number;
    perUser: ActivityRow[];
  };
  manual: { totalMessagesSent: number };
  orders?: {
    recent: OrderRow[];
    outOfStockTrackedSkus: number;
  };
};

function fmtShort(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function ActivityPanel() {
  const [data, setData] = useState<ActivityPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const phoneNumberId = localStorage.getItem("whatsappPhoneNumberId")?.trim();
    if (!phoneNumberId) {
      setLoading(false);
      toast.error("Missing phone number ID.");
      return;
    }
    setLoading(true);
    try {
      const res = await dashboardFetch("/api/activity", {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof json.error === "string" ? json.error : "Could not load activity."
        );
        setData(null);
        return;
      }
      setData(json as ActivityPayload);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onOrders = () => void load();
    window.addEventListener(COMPLETED_ORDERS_CHANGED_EVENT, onOrders);
    return () =>
      window.removeEventListener(COMPLETED_ORDERS_CHANGED_EVENT, onOrders);
  }, [load]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-[#f0f2f5]">
        <div className="animate-spin h-10 w-10 border-4 border-[#075E54] border-t-transparent rounded-full" />
      </div>
    );
  }

  const ai = data?.ai ?? {
    totalMessagesSent: 0,
    uniqueUsers: 0,
    perUser: [],
  };
  const manual = data?.manual ?? { totalMessagesSent: 0 };
  const orders = data?.orders ?? { recent: [], outOfStockTrackedSkus: 0 };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-[#f0f2f5]">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#111b21]">Activity</h2>
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-bold text-[#075E54] hover:underline"
          >
            Refresh
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-black/8 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold text-[#667781] uppercase tracking-wide">
              AI replies sent
            </p>
            <p className="text-2xl font-bold text-[#075E54] tabular-nums mt-1">
              {ai.totalMessagesSent}
            </p>
          </div>
          <div className="rounded-xl border border-black/8 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold text-[#667781] uppercase tracking-wide">
              Chats with AI
            </p>
            <p className="text-2xl font-bold text-[#111b21] tabular-nums mt-1">
              {ai.uniqueUsers}
            </p>
          </div>
          <div className="rounded-xl border border-black/8 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold text-[#667781] uppercase tracking-wide">
              Manual sends
            </p>
            <p className="text-2xl font-bold text-[#111b21] tabular-nums mt-1">
              {manual.totalMessagesSent}
            </p>
          </div>
          <div className="rounded-xl border border-black/8 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold text-[#667781] uppercase tracking-wide">
              Out of stock (tracked)
            </p>
            <p className="text-2xl font-bold text-[#b45309] tabular-nums mt-1">
              {orders.outOfStockTrackedSkus}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-black/8 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-black/6 bg-[#f8f9fa] flex justify-between items-center">
            <h3 className="text-xs font-bold text-[#111b21] uppercase tracking-wide">
              Completed orders
            </h3>
            <span className="text-[10px] text-[#667781]">Orders tab</span>
          </div>
          {orders.recent.length === 0 ? (
            <p className="p-4 text-sm text-[#667781]">No completed orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-[#667781] border-b border-black/6">
                    <th className="px-4 py-2 font-semibold">Product</th>
                    <th className="px-2 py-2 font-semibold">Qty</th>
                    <th className="px-2 py-2 font-semibold">Total</th>
                    <th className="px-4 py-2 font-semibold">When</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.recent.map((o) => (
                    <tr key={o.id} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-[#111b21]">
                        {o.productName}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums">{o.quantitySold}</td>
                      <td className="px-2 py-2.5 tabular-nums font-mono">{o.lineTotal}</td>
                      <td className="px-4 py-2.5 text-[#667781] text-xs whitespace-nowrap">
                        {fmtShort(o.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-black/8 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-black/6 bg-[#f8f9fa]">
            <h3 className="text-xs font-bold text-[#111b21] uppercase tracking-wide">
              AI messages by contact
            </h3>
          </div>
          {ai.perUser.length === 0 ? (
            <p className="p-4 text-sm text-[#667781]">No AI replies logged yet.</p>
          ) : (
            <ul className="divide-y divide-black/6">
              {ai.perUser.map((r) => (
                <li
                  key={r.contactWaId}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="font-mono text-sm text-[#111b21] truncate">
                    {r.displayPhone}
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-[#075E54]">
                    {r.aiMessagesSent}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
