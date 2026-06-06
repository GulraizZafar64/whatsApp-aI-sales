"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { BallLoader } from "@/components/ui/BallLoader";
import { shouldToastDashboardApiError } from "@/lib/dashboard/api-errors";
import { dashboardFetch } from "@/lib/dashboard/session";
import { formatChatPhone } from "@/lib/inbox";

type OrderStatus =
  | "pending"
  | "accepted"
  | "cancellation_requested"
  | "cancelled"
  | "dispatched"
  | "complete"
  | "rejected"
  | "deleted";

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
  status?: OrderStatus;
  orderGroupId?: string | null;
  hasOrderPaymentProof?: boolean;
  hasDeliveryPaymentProof?: boolean;
  createdAt: string | null;
};

type OrderGroup = {
  key: string;
  orderGroupId: string | null;
  customerWaId: string | null;
  customerName: string | null;
  deliveryNote: string | null;
  orderSource: string;
  status: OrderStatus;
  createdAt: string | null;
  lines: OrderRow[];
  totalBill: number;
  hasOrderPaymentProof: boolean;
  hasDeliveryPaymentProof: boolean;
};

type Props = {
  refreshSignal?: number;
};

const GROUP_WINDOW_MS = 5 * 60 * 1000;

function parseMoney(s: string): number {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function rowStatus(row: OrderRow): OrderStatus {
  const s = row.status;
  if (
    s === "pending" ||
    s === "accepted" ||
    s === "cancellation_requested" ||
    s === "cancelled" ||
    s === "dispatched" ||
    s === "complete" ||
    s === "rejected" ||
    s === "deleted"
  ) {
    return s;
  }
  return "pending";
}

function groupOrders(rows: OrderRow[]): OrderGroup[] {
  const sorted = [...rows].sort((a, b) => b.id - a.id);
  const groups: OrderGroup[] = [];

  for (const row of sorted) {
    const groupId = row.orderGroupId?.trim();
    const t = row.createdAt ? new Date(row.createdAt).getTime() : 0;
    const prev = groups[groups.length - 1];
    const sameGroup =
      groupId &&
      prev?.orderGroupId === groupId;
    const sameCustomer =
      (row.customerWaId ?? "") === (prev?.customerWaId ?? "") &&
      (row.deliveryNote?.trim() ?? "") === (prev?.deliveryNote?.trim() ?? "");
    const prevT = prev?.createdAt ? new Date(prev.createdAt).getTime() : 0;
    const closeInTime =
      prev && t > 0 && prevT > 0 && Math.abs(t - prevT) <= GROUP_WINDOW_MS;

    if (prev && (sameGroup || (!groupId && sameCustomer && closeInTime))) {
      prev.lines.push(row);
      prev.totalBill += parseMoney(row.lineTotal);
      const lineStatus = rowStatus(row);
      const rank = (s: OrderStatus) =>
        ({
          pending: 0,
          cancellation_requested: 1,
          accepted: 2,
          dispatched: 3,
          complete: 4,
          cancelled: -2,
          rejected: -2,
          deleted: -3,
        })[s];
      if (rank(lineStatus) > rank(prev.status)) prev.status = lineStatus;
      if (t > prevT) prev.createdAt = row.createdAt;
      prev.hasOrderPaymentProof =
        prev.hasOrderPaymentProof || Boolean(row.hasOrderPaymentProof);
      prev.hasDeliveryPaymentProof =
        prev.hasDeliveryPaymentProof || Boolean(row.hasDeliveryPaymentProof);
    } else {
      groups.push({
        key: groupId ? `grp-${groupId}` : `g-${row.id}`,
        orderGroupId: groupId ?? null,
        customerWaId: row.customerWaId ?? null,
        customerName: row.customerName ?? null,
        deliveryNote: row.deliveryNote ?? null,
        orderSource: row.orderSource ?? "manual",
        status: rowStatus(row),
        createdAt: row.createdAt,
        lines: [row],
        totalBill: parseMoney(row.lineTotal),
        hasOrderPaymentProof: Boolean(row.hasOrderPaymentProof),
        hasDeliveryPaymentProof: Boolean(row.hasDeliveryPaymentProof),
      });
    }
  }

  return groups;
}

function statusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "cancellation_requested":
      return "User Wants to Cancel";
    case "cancelled":
      return "Cancelled";
    case "dispatched":
      return "Dispatched";
    case "complete":
      return "Complete";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

function statusClass(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-900";
    case "accepted":
      return "bg-sky-100 text-sky-900";
    case "cancellation_requested":
      return "bg-orange-100 text-orange-900";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "dispatched":
      return "bg-violet-100 text-violet-900";
    case "complete":
      return "bg-emerald-100 text-emerald-900";
    case "rejected":
      return "bg-rose-100 text-rose-900";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function productSummary(lines: OrderRow[]): string {
  if (lines.length === 1) return lines[0]!.productName;
  const names = lines.map((l) => l.productName).join(", ");
  if (names.length <= 48) return names;
  return `${lines.length} items`;
}

type StatusFilter = "all" | OrderStatus;

export function CompletedOrdersPanel({ refreshSignal = 0 }: Props) {
  const { bootstrapped, needsSetup } = useDashboard();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailGroup, setDetailGroup] = useState<OrderGroup | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const groups = useMemo(() => {
    const all = groupOrders(orders);
    if (statusFilter === "all") return all;
    return all.filter((g) => g.status === statusFilter);
  }, [orders, statusFilter]);

  async function patchOrder(
    group: OrderGroup,
    body: {
      status?: OrderStatus;
      accept?: boolean;
      cancellationAction?: "approve" | "reject";
    }
  ) {
    const key = group.key;
    const lineIds = group.lines.map((l) => l.id);
    const nextStatus: OrderStatus = body.accept
      ? "accepted"
      : (body.status ?? group.status);

    setActionBusy(key);
    try {
      const res = await dashboardFetch("/api/completed-orders/action", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderGroupId: group.orderGroupId ?? undefined,
          lineIds,
          ...body,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof json.error === "string" ? json.error : "Could not update order."
        );
        return;
      }

      const applied =
        (json as { status?: string }).status === nextStatus
          ? nextStatus
          : ((json as { status?: string }).status as OrderStatus) || nextStatus;

      setOrders((prev) =>
        applied === "deleted"
          ? prev.filter((row) => !lineIds.includes(row.id))
          : prev.map((row) =>
              lineIds.includes(row.id) ? { ...row, status: applied } : row
            )
      );
      if (detailGroup?.key === group.key) {
        if (applied === "deleted") {
          setDetailGroup(null);
        } else {
          setDetailGroup({
            ...detailGroup,
            status: applied,
            lines: detailGroup.lines.map((line) => ({
              ...line,
              status: applied,
            })),
          });
        }
      }

      const jsonMessage =
        typeof (json as { message?: string }).message === "string"
          ? (json as { message: string }).message
          : null;
      const msg =
        jsonMessage ??
        (body.cancellationAction === "approve"
          ? "Cancellation approved — customer notified."
          : body.cancellationAction === "reject"
            ? "Cancellation rejected — customer notified."
            : body.accept
              ? "Order accepted — customer notified."
              : body.status === "dispatched"
                ? "Order dispatched — customer notified."
                : "Order updated.");
      toast.success(msg);
      void load();
    } catch {
      toast.error("Network error.");
    } finally {
      setActionBusy(null);
    }
  }

  const load = useCallback(async () => {
    if (!bootstrapped || needsSetup) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await dashboardFetch("/api/completed-orders", {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg =
          typeof json.error === "string" ? json.error : "Could not load orders.";
        if (shouldToastDashboardApiError(errMsg)) {
          toast.error(errMsg);
        }
        setOrders([]);
        return;
      }
      setOrders(
        ((json as { orders?: OrderRow[] }).orders ?? []).filter(
          (row) => rowStatus(row) !== "deleted"
        )
      );
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }, [bootstrapped, needsSetup]);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-[#f0f2f5]">
        <BallLoader size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col bg-[#f0f2f5] p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", "All"],
                ["pending", "Pending"],
                ["accepted", "Accepted"],
                ["cancellation_requested", "Cancel Needs"],
                ["cancelled", "Cancelled"],
                ["dispatched", "Dispatched"],
                ["complete", "Complete"],
                ["rejected", "Rejected"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatusFilter(id)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  statusFilter === id
                    ? "bg-[#075E54] text-white"
                    : "bg-white text-[#54656f] border border-black/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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
                    Status
                  </th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-[#667781] align-top"
                    >
                      No orders yet. They appear when a customer completes checkout on
                      WhatsApp (configure in{" "}
                      <strong className="text-[#111b21]">Checkout settings</strong> in the
                      sidebar).
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
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${statusClass(g.status)}`}
                          >
                            {statusLabel(g.status)}
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
                          <div className="flex flex-col gap-1 items-start">
                            {g.status === "pending" ? (
                              <button
                                type="button"
                                disabled={actionBusy === g.key}
                                onClick={() => void patchOrder(g, { accept: true })}
                                className="text-xs font-bold text-[#128C7E] hover:underline whitespace-nowrap disabled:opacity-50"
                              >
                                Accept order
                              </button>
                            ) : null}
                            {g.status === "cancellation_requested" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={actionBusy === g.key}
                                  onClick={() =>
                                    void patchOrder(g, {
                                      cancellationAction: "approve",
                                    })
                                  }
                                  className="text-xs font-bold text-red-700 hover:underline whitespace-nowrap disabled:opacity-50"
                                >
                                  Approve cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={actionBusy === g.key}
                                  onClick={() =>
                                    void patchOrder(g, {
                                      cancellationAction: "reject",
                                    })
                                  }
                                  className="text-xs font-bold text-[#54656f] hover:underline whitespace-nowrap disabled:opacity-50"
                                >
                                  Reject cancel
                                </button>
                              </>
                            ) : null}
                            {g.status === "accepted" ? (
                              <button
                                type="button"
                                disabled={actionBusy === g.key}
                                onClick={() =>
                                  void patchOrder(g, { status: "dispatched" })
                                }
                                className="text-xs font-bold text-violet-700 hover:underline whitespace-nowrap disabled:opacity-50"
                              >
                                Mark dispatched
                              </button>
                            ) : null}
                            {g.status !== "complete" ? (
                              <button
                                type="button"
                                disabled={actionBusy === g.key}
                                onClick={() =>
                                  void patchOrder(g, { status: "complete" })
                                }
                                className="text-xs font-bold text-[#075E54] hover:underline whitespace-nowrap disabled:opacity-50"
                              >
                                Mark complete
                              </button>
                            ) : null}
                            {g.status !== "pending" ? (
                              <button
                                type="button"
                                disabled={actionBusy === g.key}
                                onClick={() =>
                                  void patchOrder(g, { status: "pending" })
                                }
                                className="text-xs text-[#54656f] hover:underline whitespace-nowrap disabled:opacity-50"
                              >
                                Mark pending
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={actionBusy === g.key}
                              onClick={() =>
                                void patchOrder(g, { status: "deleted" })
                              }
                              className="text-xs font-bold text-red-600 hover:underline whitespace-nowrap disabled:opacity-50"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setDetailGroup(g)}
                              className="text-xs font-bold text-[#075E54] hover:underline whitespace-nowrap"
                            >
                              View detail
                            </button>
                          </div>
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
            busy={actionBusy === detailGroup.key}
            onPatch={(body) => void patchOrder(detailGroup, body)}
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
  onPatch,
  busy,
}: {
  group: OrderGroup;
  onClose: () => void;
  onPatch: (body: {
    status?: OrderStatus;
    accept?: boolean;
    cancellationAction?: "approve" | "reject";
  }) => void;
  busy: boolean;
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
            {group.customerWaId ? (
              <p className="font-mono text-[#54656f] text-xs mt-0.5">
                {phone || group.customerWaId.trim()}
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase text-[#667781]">
              Status
            </p>
            <span
              className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-bold ${statusClass(group.status)}`}
            >
              {statusLabel(group.status)}
            </span>
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

          {group.hasOrderPaymentProof || group.hasDeliveryPaymentProof ? (
            <div>
              <p className="text-[10px] font-bold uppercase text-[#667781]">
                Payment proof
              </p>
              <p className="text-xs text-[#54656f]">
                {group.hasOrderPaymentProof ? "Order payment screenshot saved. " : ""}
                {group.hasDeliveryPaymentProof
                  ? "Delivery payment screenshot saved."
                  : ""}
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

        <div className="px-4 py-3 border-t border-black/8 space-y-2">
          <div className="flex flex-wrap gap-2">
            {group.status === "pending" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onPatch({ accept: true })}
                className="flex-1 min-w-[120px] py-2 rounded-lg bg-[#128C7E] text-white text-xs font-bold disabled:opacity-60"
              >
                Accept order
              </button>
            ) : null}
            {group.status === "cancellation_requested" ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onPatch({ cancellationAction: "approve" })}
                  className="flex-1 min-w-[120px] py-2 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-60"
                >
                  Approve cancellation
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onPatch({ cancellationAction: "reject" })}
                  className="flex-1 min-w-[120px] py-2 rounded-lg border border-black/15 text-[#111b21] text-xs font-bold disabled:opacity-60"
                >
                  Reject cancellation
                </button>
              </>
            ) : null}
            {group.status === "accepted" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onPatch({ status: "dispatched" })}
                className="flex-1 min-w-[120px] py-2 rounded-lg bg-violet-700 text-white text-xs font-bold disabled:opacity-60"
              >
                Mark dispatched
              </button>
            ) : null}
            {group.status !== "complete" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onPatch({ status: "complete" })}
                className="flex-1 min-w-[120px] py-2 rounded-lg bg-[#075E54] text-white text-xs font-bold disabled:opacity-60"
              >
                Mark complete
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-lg border border-black/15 text-[#111b21] text-sm font-bold hover:bg-[#f0f2f5]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
