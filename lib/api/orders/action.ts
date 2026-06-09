/** Handler for /api/completed-orders/action */
import { NextResponse } from "next/server";
import { Op } from "sequelize";
import { CompletedOrder } from "@/lib/models";
import { requireDashboardAuth } from "@/lib/dashboard-business";
import {
  isValidOrderStatus,
  normalizeOrderStatus,
  type OrderStatus,
} from "@/lib/order-requirements";
import {
  actionTypeForOwnerStatusChange,
  ownerRespondToCancellation,
  transitionOrderGroup,
} from "@/lib/order-management";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const gate = await requireDashboardAuth(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: {
    orderGroupId?: string;
    lineIds?: number[];
    status?: string;
    accept?: boolean;
    cancellationAction?: "approve" | "reject";
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderGroupId = body.orderGroupId?.trim();
  const lineIds = Array.isArray(body.lineIds)
    ? body.lineIds.filter((id) => Number.isInteger(id) && id > 0)
    : [];

  if (!orderGroupId && lineIds.length === 0) {
    return NextResponse.json(
      { error: "orderGroupId or lineIds required" },
      { status: 400 }
    );
  }

  const cancellationAction = body.cancellationAction;
  if (cancellationAction === "approve" || cancellationAction === "reject") {
    if (!orderGroupId) {
      return NextResponse.json(
        { error: "orderGroupId is required for cancellation actions" },
        { status: 400 }
      );
    }
    try {
      const result = await ownerRespondToCancellation({
        businessId: gate.business.id,
        orderGroupId,
        approve: cancellationAction === "approve",
        ownerUserId: gate.userId,
        lineIds: lineIds.length ? lineIds : undefined,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.message },
          { status: result.status ?? 400 }
        );
      }
      return NextResponse.json({
        ok: true,
        message: result.message,
        updated: result.lineIds.length,
        status: result.newStatus,
        orderIds: result.lineIds,
        previousStatus: result.previousStatus,
      });
    } catch (error) {
      console.error("[api/completed-orders/action PATCH cancellation]", error);
      return NextResponse.json(
        { error: "Failed to process cancellation request" },
        { status: 500 }
      );
    }
  }

  const accept = body.accept === true;
  let status = body.status?.trim();
  if (accept) status = "accepted";

  if (status && !isValidOrderStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (!status && !accept) {
    return NextResponse.json(
      { error: "status, accept, or cancellationAction required" },
      { status: 400 }
    );
  }

  const nextStatus = (status ?? "accepted") as OrderStatus;

  try {
    const businessId = gate.business.id;

    let rows = await CompletedOrder.findAll({
      where: {
        businessId,
        id: { [Op.in]: lineIds },
        status: { [Op.ne]: "deleted" },
      },
    });

    if (!rows.length && orderGroupId) {
      rows = await CompletedOrder.findAll({
        where: {
          businessId,
          orderGroupId,
          status: { [Op.ne]: "deleted" },
        },
      });
    }

    if (!rows.length) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const resolvedGroupId = orderGroupId ?? rows[0]?.orderGroupId?.trim();

    if (!resolvedGroupId) {
      const [affected] = await CompletedOrder.update(
        { status: nextStatus },
        {
          where: {
            businessId,
            id: { [Op.in]: rows.map((r) => r.id) },
          },
        }
      );
      if (!affected) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        message:
          nextStatus === "deleted"
            ? "Order deleted."
            : "Order updated.",
        updated: affected,
        status: nextStatus,
        orderIds: rows.map((r) => r.id),
        previousStatus: normalizeOrderStatus(rows[0]?.status),
      });
    }

    const previousStatus = normalizeOrderStatus(rows[0]?.status);
    const actionType = actionTypeForOwnerStatusChange(
      previousStatus,
      nextStatus,
      accept
    );
    const result = await transitionOrderGroup({
      businessId,
      orderGroupId: resolvedGroupId,
      lineIds: rows.map((r) => r.id),
      newStatus: nextStatus,
      actionType,
      performedBy: "owner",
      performedByUserId: gate.userId,
      notifyCustomer: false,
      notifyOwnerEmail: false,
      notes: accept ? "Order accepted from dashboard." : undefined,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.status ?? 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: result.message,
      updated: result.lineIds.length,
      status: result.newStatus,
      orderIds: result.lineIds,
      previousStatus: result.previousStatus,
    });
  } catch (error) {
    console.error("[api/completed-orders/action PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
