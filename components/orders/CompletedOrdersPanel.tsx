"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { dashboardFetch } from "@/lib/dashboard/session";
import { formatChatPhone } from "@/lib/inbox";

type OrderRow = {
  id: number;
  productId: number | null;
  productName: string;
  quantitySold: number;
  unitPrice: string;
  lineTotal: string;
  orderSource?: string;
  deliveryNote?: string | null;
  customerWaId?: string | null;
  customerName?: string | null;
  createdAt: string | null;
};

type OrderGroup = {
  key: string;
  customerWaId: string | null;
  customerName: string | null;
  deliveryNote: string | null;
  orderSource: string;
  createdAt: string | null;
  lines: OrderRow[];
  totalBill: number;
};

type Props = {
  refreshSignal?: number;
};

const GROUP_WINDOW_MS = 5 * 60 * 1000;

function parseMoney(s: string): number {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function groupOrders(rows: OrderRow[]): OrderGroup[] {
  const sorted = [...rows].sort((a, b) => b.id - a.id);
  const groups: OrderGroup[] = [];

  for (const row of sorted) {
    const t = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    const prev = groups[groups.length - 1];
    const sameCustomer =
      (row.customerWaId ?? "") === (prev?.customerWaId ?? "") &&
      (row.deliveryNote?.trim() ?? "") === (prev?.deliveryNote?.trim() ?? "");
    const prevT = prev?.createdAt ? new Date(prev.createdAt).getTime() : 0;
    const closeInTime =
      prev && t > 0 && prevT > 0 && Math.abs(t - prevT) <= GROUP_WINDOW_MS;

    if (prev && sameCustomer && closeInTime) {
      prev.lines.push(row);
      prev.totalBill += parseMoney(row.lineTotal);
      if (t > prevT) prev.createdAt = row.createdAt;
    } else {
      groups.push({
        key: `g-${row.id}`,
        customerWaId: row.customerWaId ?? null,
        customerName: row.customerName ?? null,
        deliveryNote: row.deliveryNote ?? null,
        orderSource: row.orderSource ?? "manual",
        createdAt: row.createdAt,
        lines: [row],
        totalBill: parseMoney(row.lineTotal),
      });
    }
  }

  return groups;
}

function productSummary(lines: OrderRow[]): string {
  if (lines.length === 1) return lines[0]!.productName;
  const names = lines.map((l) => l.productName).join(", ");
  if (names.length <= 48) return names;
  return `${lines.length} items`;
}

export function CompletedOrdersPanel({ refreshSignal = 0 }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailGroup, setDetailGroup] = useState<OrderGroup | null>(null);

  const groups = useMemo(() => groupOrders(orders), [orders]);

  const load = useCallback(async () => {
    const phoneNumberId = localStorage.getItem("whatsappPhoneNumberId")?.trim();
    if (!phoneNumberId) {
      setLoading(false);
      toast.error("Missing phone number ID.");
      return;
    }
    setLoading(true);
    try {
      const res = await dashboardFetch("/api/completed-orders", {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof json.error === "string" ? json.error : "Could not load orders."
        );
        setOrders([]);
        return;
      }
      setOrders((json as { orders?: OrderRow[] }).orders ?? []);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-[#f0f2f5]">
        <div className="animate-spin h-10 w-10 border-4 border-[#075E54] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col bg-[#f0f2f5] p-3 sm:p-4">
        <div className="flex justify-end mb-2 shrink-0">
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-bold text-[#075E54] hover:underline"
          >
            Refresh
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto rounded-lg border border-black/10 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm text-left border-collapse">
              <thead>
                <tr className="bg-[#075E54] text-white">
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">ID</th>
                  <th className="px-3 py-2.5 font-semibold">Order</th>
                  <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">
                    Items
                  </th>
                  <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">
                    Total
                  </th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                    Source
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Delivery</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                    Completed
                  </th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-[#667781] align-top"
                    >
                      No orders yet. They appear here when a customer sends a delivery
                      address on WhatsApp, or when you use{" "}
                      <strong className="text-[#111b21]">Mark order done</strong> on a
                      product.
                    </td>
                  </tr>
                ) : (
                  groups.map((g) => {
                    const qtyTotal = g.lines.reduce(
                      (s, l) => s + l.quantitySold,
                      0
                    );
                    const leadId = g.lines[0]!.id;
                    return (
                      <tr
                        key={g.key}
                        className="border-t border-black/8 odd:bg-[#fafafa] hover:bg-[#f0f2f5]/80"
                      >
                        <td className="px-3 py-2.5 font-mono text-[#667781] tabular-nums">
                          {leadId}
                          {g.lines.length > 1 ? (
                            <span className="block text-[10px] text-[#667781]">
                              +{g.lines.length - 1}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-[#111b21] max-w-[220px]">
                          <span className="line-clamp-2">
                            {productSummary(g.lines)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {qtyTotal}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#075E54] tabular-nums">
                          {g.totalBill.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                          <span
                            className={
                              g.orderSource === "whatsapp"
                                ? "font-semibold text-[#128C7E]"
                                : "text-[#667781]"
                            }
                          >
                            {g.orderSource === "whatsapp" ? "WhatsApp" : "Manual"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[#54656f] max-w-[200px]">
                          <span className="line-clamp-2">
                            {g.deliveryNote?.trim() || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[#54656f] whitespace-nowrap text-xs">
                          {g.createdAt
                            ? new Date(g.createdAt).toLocaleString(undefined, {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => setDetailGroup(g)}
                            className="text-xs font-bold text-[#075E54] hover:underline whitespace-nowrap"
                          >
                            View order detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
        </div>

        {detailGroup ? (
          <OrderDetailModal
            group={detailGroup}
            onClose={() => setDetailGroup(null)}
          />
        ) : null}
      </div>
    </>
  );
}

function OrderDetailModal({
  group,
  onClose,
}: {
  group: OrderGroup;
  onClose: () => void;
}) {
  const phone = group.customerWaId
    ? formatChatPhone(group.customerWaId)
    : "—";
  const name =
    group.customerName?.trim() ||
    (group.customerWaId ? "WhatsApp customer" : "Manual sale");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-detail-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl border border-black/10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-black/8 bg-[#075E54] text-white rounded-t-xl">
          <div>
            <h2 id="order-detail-title" className="font-bold text-base">
                Order detail
              </h2>
              <p className="text-xs text-white/85 mt-0.5">
                {group.orderSource === "whatsapp" ? "WhatsApp" : "Manual"} ·{" "}
                {group.createdAt
                  ? new Date(group.createdAt).toLocaleString()
                  : "—"}
              </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/90 hover:text-white text-xl leading-none px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3 space-y-3 text-sm">
          <div>
            <p className="text-[10px] font-bold uppercase text-[#667781]">
              Customer
            </p>
            <p className="font-semibold text-[#111b21]">{name}</p>
            <p className="font-mono text-[#54656f] text-xs mt-0.5">{phone}</p>
          </div>

          {group.deliveryNote?.trim() ? (
            <div>
              <p className="text-[10px] font-bold uppercase text-[#667781]">
                Delivery
              </p>
              <p className="text-[#111b21] whitespace-pre-wrap">
                {group.deliveryNote.trim()}
              </p>
            </div>
          ) : null}

          <div>
            <p className="text-[10px] font-bold uppercase text-[#667781] mb-2">
              Items
            </p>
            <ul className="space-y-2">
              {group.lines.map((line) => (
                <li
                  key={line.id}
                  className="flex justify-between gap-2 rounded-lg bg-[#f0f2f5] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#111b21] truncate">
                      {line.productName}
                    </p>
                    <p className="text-xs text-[#667781]">
                      Qty {line.quantitySold} ×{" "}
                      {parseMoney(line.unitPrice).toFixed(2)}
                    </p>
                  </div>
                  <p className="font-mono font-semibold text-[#075E54] shrink-0">
                    {parseMoney(line.lineTotal).toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-black/8">
            <span className="font-bold text-[#111b21]">Total bill</span>
            <span className="font-mono text-lg font-bold text-[#075E54]">
              {group.totalBill.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-black/8">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-[#075E54] text-white text-sm font-bold hover:bg-[#054d45]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
