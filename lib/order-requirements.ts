export type OrderRequirements = {
  /** Customer must send delivery address before order appears in dashboard. */
  requireAddress: boolean;
  /** Customer must pay delivery charges and send payment screenshot. */
  requireDeliveryCharges: boolean;
  /** Fixed delivery charge amount (informational for AI / display). */
  deliveryChargeAmount: string | null;
  /** Customer must send order payment screenshot before order is logged. */
  requireOrderPayment: boolean;
};

export const DEFAULT_ORDER_REQUIREMENTS: OrderRequirements = {
  requireAddress: true,
  requireDeliveryCharges: false,
  deliveryChargeAmount: null,
  requireOrderPayment: false,
};

export function parseOrderRequirements(stored: unknown): OrderRequirements {
  const base = { ...DEFAULT_ORDER_REQUIREMENTS };
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return base;
  }
  const o = stored as Record<string, unknown>;
  if (typeof o.requireAddress === "boolean") {
    base.requireAddress = o.requireAddress;
  }
  if (typeof o.requireDeliveryCharges === "boolean") {
    base.requireDeliveryCharges = o.requireDeliveryCharges;
  }
  if (typeof o.requireOrderPayment === "boolean") {
    base.requireOrderPayment = o.requireOrderPayment;
  }
  if (typeof o.deliveryChargeAmount === "string") {
    const t = o.deliveryChargeAmount.trim();
    base.deliveryChargeAmount = t || null;
  } else if (o.deliveryChargeAmount === null) {
    base.deliveryChargeAmount = null;
  }
  return base;
}

/** Canonical order statuses stored in `completed_orders.status`. */
export type OrderStatus =
  | "pending"
  | "accepted"
  | "cancellation_requested"
  | "cancelled"
  | "dispatched"
  | "complete"
  | "rejected"
  | "deleted";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "cancellation_requested",
  "cancelled",
  "dispatched",
  "complete",
  "rejected",
  "deleted",
];

export function isValidOrderStatus(s: string): s is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(s);
}

export function normalizeOrderStatus(
  raw: string | null | undefined
): OrderStatus {
  const s = raw?.trim().toLowerCase();
  if (s && isValidOrderStatus(s)) return s;
  if (s === "completed") return "complete";
  if (s === "canceled") return "cancelled";
  return "pending";
}

export function orderStatusLabel(status: OrderStatus): string {
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
      return "Completed";
    case "rejected":
      return "Rejected";
    case "deleted":
      return "Deleted";
    default:
      return status;
  }
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return (
    status === "complete" ||
    status === "cancelled" ||
    status === "rejected" ||
    status === "deleted"
  );
}

const STATUS_RANK: Record<OrderStatus, number> = {
  pending: 0,
  cancellation_requested: 1,
  accepted: 2,
  dispatched: 3,
  complete: 4,
  cancelled: -2,
  rejected: -2,
  deleted: -3,
};

/** Highest status among all lines in one checkout group. */
export function pickGroupStatus(statuses: OrderStatus[]): OrderStatus {
  let best: OrderStatus = "pending";
  for (const s of statuses) {
    if (STATUS_RANK[s] > STATUS_RANK[best]) best = s;
  }
  return best;
}
