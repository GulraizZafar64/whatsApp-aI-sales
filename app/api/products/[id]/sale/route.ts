import { NextResponse } from "next/server";
import { Product, CompletedOrder } from "@/lib/models";
import { requireDashboardBusiness } from "@/lib/dashboard-business";
import { productToDto } from "@/lib/product-serialize";
import { getSequelize } from "@/lib/sequelize";

type Params = { params: Promise<{ id: string }> };

/**
 * Mark a catalog line as sold: logs a completed order and optionally decrements stock.
 */
export async function POST(request: Request, ctx: Params) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id: idRaw } = await ctx.params;
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let qty = 1;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      qty?: number;
    };
    if (body.qty != null) {
      const q = Math.floor(Number(body.qty));
      if (Number.isFinite(q) && q > 0) qty = Math.min(q, 10_000);
    }
  } catch {
    /* default qty */
  }

  const sequelize = getSequelize();
  const t = await sequelize.transaction();

  try {
    const row = await Product.findOne({
      where: { id, businessId: gate.business.id },
      transaction: t,
    });
    if (!row) {
      await t.rollback();
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (row.subtractOnOrder && row.quantity < qty) {
      await t.rollback();
      return NextResponse.json(
        { error: "Not enough stock for this quantity." },
        { status: 400 }
      );
    }

    const unit = Number.parseFloat(String(row.price)) || 0;
    const lineTotal = (unit * qty).toFixed(2);

    if (row.subtractOnOrder) {
      const next = Math.max(0, row.quantity - qty);
      await row.update({ quantity: next }, { transaction: t });
    }

    const order = await CompletedOrder.create(
      {
        businessId: gate.business.id,
        productId: row.id,
        productName: row.productName,
        quantitySold: qty,
        unitPrice: unit.toFixed(2),
        lineTotal,
      },
      { transaction: t }
    );

    await t.commit();
    await row.reload();
    return NextResponse.json({
      product: productToDto(row),
      order: {
        id: order.id,
        productName: order.productName,
        quantitySold: order.quantitySold,
        lineTotal: String(order.lineTotal),
        createdAt:
          (order.get("createdAt") as Date | undefined)?.toISOString() ?? null,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("[api/products sale POST]", error);
    return NextResponse.json(
      { error: "Failed to record sale" },
      { status: 500 }
    );
  }
}
