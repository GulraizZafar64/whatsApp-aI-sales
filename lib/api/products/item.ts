/** Handler for /api/products/[id] */
import { NextResponse } from "next/server";
import { Product } from "@/lib/models";
import { requireDashboardBusiness } from "@/lib/dashboard-business";
import { productToDto } from "@/lib/product-serialize";
import {
  normalizeColors,
  normalizeImages,
  validateProductImages,
} from "@/lib/product-payload";

type Params = { params: Promise<{ id: string }> };

type PatchBody = {
  productName?: string;
  productDescription?: string | null;
  price?: string | number;
  quantity?: number;
  subtractOnOrder?: boolean;
  discountEnabled?: boolean;
  discountValue?: string | number | null;
  discountIsPercent?: boolean;
  discountValidDate?: string | null;
  brandName?: string | null;
  colors?: string[];
  images?: string[];
  bargainingLowAmount?: string | number | null;
};

export async function PATCH(request: Request, ctx: Params) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id: idRaw } = await ctx.params;
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const row = await Product.findOne({
    where: { id, businessId: gate.business.id },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updates: Partial<{
    productName: string;
    productDescription: string | null;
    price: string;
    quantity: number;
    subtractOnOrder: boolean;
    discountEnabled: boolean;
    discountValue: string | null;
    discountIsPercent: boolean;
    discountValidDate: string | null;
    brandName: string | null;
    colorsJson: string;
    imagesJson: string;
    bargainingLowAmount: string | null;
  }> = {};

  if (body.productName !== undefined) {
    const n = String(body.productName).trim();
    if (!n) {
      return NextResponse.json({ error: "productName cannot be empty" }, { status: 400 });
    }
    updates.productName = n;
  }
  if (body.productDescription !== undefined) {
    updates.productDescription =
      typeof body.productDescription === "string"
        ? body.productDescription.trim() || null
        : null;
  }
  if (body.price !== undefined) {
    const priceNum =
      typeof body.price === "number"
        ? body.price
        : Number.parseFloat(String(body.price));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }
    updates.price = priceNum.toFixed(2);
  }
  if (body.quantity !== undefined) {
    const q =
      typeof body.quantity === "number" && Number.isFinite(body.quantity)
        ? Math.max(0, Math.floor(body.quantity))
        : Math.max(0, Math.floor(Number.parseInt(String(body.quantity), 10) || 0));
    updates.quantity = q;
  }
  if (body.subtractOnOrder !== undefined) {
    updates.subtractOnOrder = Boolean(body.subtractOnOrder);
  }
  if (body.discountEnabled !== undefined) {
    updates.discountEnabled = Boolean(body.discountEnabled);
  }
  if (body.discountIsPercent !== undefined) {
    updates.discountIsPercent = Boolean(body.discountIsPercent);
  }

  const effectiveDiscount =
    body.discountEnabled !== undefined
      ? Boolean(body.discountEnabled)
      : row.discountEnabled;

  if (body.discountValue !== undefined || body.discountEnabled !== undefined) {
    if (!effectiveDiscount) {
      updates.discountValue = null;
      updates.discountValidDate = null;
    } else if (body.discountValue === null || body.discountValue === "") {
      updates.discountValue = null;
    } else {
      const dv =
        typeof body.discountValue === "number"
          ? body.discountValue
          : Number.parseFloat(String(body.discountValue));
      if (!Number.isFinite(dv) || dv < 0) {
        return NextResponse.json({ error: "Invalid discount value" }, { status: 400 });
      }
      const isPct =
        body.discountIsPercent !== undefined
          ? Boolean(body.discountIsPercent)
          : row.discountIsPercent;
      if (isPct && dv > 100) {
        return NextResponse.json(
          { error: "Percent discount cannot exceed 100" },
          { status: 400 }
        );
      }
      updates.discountValue = dv.toFixed(2);
    }
  }

  if (body.discountValidDate !== undefined) {
    if (!effectiveDiscount) {
      updates.discountValidDate = null;
    } else if (
      typeof body.discountValidDate === "string" &&
      body.discountValidDate.trim()
    ) {
      updates.discountValidDate = body.discountValidDate.trim().slice(0, 10);
    } else {
      updates.discountValidDate = null;
    }
  }

  if (body.brandName !== undefined) {
    updates.brandName =
      typeof body.brandName === "string" && body.brandName.trim()
        ? body.brandName.trim()
        : null;
  }
  if (body.colors !== undefined) {
    const nextColors = normalizeColors(body.colors);
    if (nextColors.length === 0) {
      return NextResponse.json(
        { error: "At least one color or variant label is required." },
        { status: 400 }
      );
    }
    updates.colorsJson = JSON.stringify(nextColors);
  }
  if (body.images !== undefined) {
    const nextImages = normalizeImages(body.images);
    const imgErr = validateProductImages(nextImages);
    if (imgErr) {
      return NextResponse.json({ error: imgErr }, { status: 400 });
    }
    updates.imagesJson = JSON.stringify(nextImages);
  }

  if (body.bargainingLowAmount !== undefined) {
    if (body.bargainingLowAmount === null || body.bargainingLowAmount === "") {
      updates.bargainingLowAmount = null;
    } else {
      const b =
        typeof body.bargainingLowAmount === "number"
          ? body.bargainingLowAmount
          : Number.parseFloat(String(body.bargainingLowAmount));
      if (!Number.isFinite(b) || b < 0) {
        return NextResponse.json(
          { error: "Invalid bargaining low amount" },
          { status: 400 }
        );
      }
      const listPrice = Number.parseFloat(
        String(updates.price ?? row.price)
      );
      if (b > listPrice) {
        return NextResponse.json(
          { error: "Bargaining floor cannot be greater than list price" },
          { status: 400 }
        );
      }
      updates.bargainingLowAmount = b.toFixed(2);
    }
  }

  try {
    await row.update(updates);
    await row.reload();
    return NextResponse.json({ product: productToDto(row) });
  } catch (error) {
    console.error("[api/products PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, ctx: Params) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id: idRaw } = await ctx.params;
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const n = await Product.destroy({
      where: { id, businessId: gate.business.id },
    });
    if (!n) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/products DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
