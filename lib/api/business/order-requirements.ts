/** Handler for /api/business/order-requirements */
import { NextResponse } from "next/server";
import { requireDashboardAuth } from "@/lib/dashboard-business";
import {
  DEFAULT_ORDER_REQUIREMENTS,
  parseOrderRequirements,
  type OrderRequirements,
} from "@/lib/order-requirements";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gate = await requireDashboardAuth(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const requirements = parseOrderRequirements(
    gate.business.orderRequirements ?? DEFAULT_ORDER_REQUIREMENTS
  );
  return NextResponse.json({ requirements });
}

export async function PATCH(request: Request) {
  const gate = await requireDashboardAuth(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: Partial<OrderRequirements>;
  try {
    body = (await request.json()) as Partial<OrderRequirements>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = parseOrderRequirements(gate.business.orderRequirements);
  const next: OrderRequirements = {
    requireAddress:
      typeof body.requireAddress === "boolean"
        ? body.requireAddress
        : current.requireAddress,
    requireDeliveryCharges:
      typeof body.requireDeliveryCharges === "boolean"
        ? body.requireDeliveryCharges
        : current.requireDeliveryCharges,
    requireOrderPayment:
      typeof body.requireOrderPayment === "boolean"
        ? body.requireOrderPayment
        : current.requireOrderPayment,
    deliveryChargeAmount:
      typeof body.deliveryChargeAmount === "string"
        ? body.deliveryChargeAmount.trim() || null
        : body.deliveryChargeAmount === null
          ? null
          : current.deliveryChargeAmount,
  };

  try {
    await gate.business.update({ orderRequirements: next });
    return NextResponse.json({ ok: true, requirements: next });
  } catch (error) {
    console.error("[api/business/order-requirements PATCH]", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
