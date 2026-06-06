/** Handler for /api/products */
import { NextResponse } from "next/server";
import { Product } from "@/lib/models";
import { requireDashboardBusiness } from "@/lib/dashboard-business";
import { productToDto } from "@/lib/product-serialize";
import {
  normalizeColors,
  normalizeImages,
  validateProductImages,
} from "@/lib/product-payload";

type CreateBody = {
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

export async function GET(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const rows = await Product.findAll({
      where: { businessId: gate.business.id },
      order: [["id", "DESC"]],
    });
    return NextResponse.json({
      products: rows.map(productToDto),
      businessType: gate.business.businessType ?? null,
    });
  } catch (error) {
    console.error("[api/products GET]", error);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const productName =
    typeof body.productName === "string" ? body.productName.trim() : "";
  if (!productName) {
    return NextResponse.json(
      { error: "productName is required" },
      { status: 400 }
    );
  }

  const priceRaw = body.price;
  const priceNum =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string"
        ? Number.parseFloat(priceRaw)
        : NaN;
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  const qty =
    typeof body.quantity === "number" && Number.isFinite(body.quantity)
      ? Math.max(0, Math.floor(body.quantity))
      : typeof body.quantity === "string"
        ? Math.max(0, Math.floor(Number.parseInt(body.quantity, 10) || 0))
        : 0;

  const discountEnabled = Boolean(body.discountEnabled);
  let discountValue: number | null = null;
  if (discountEnabled && body.discountValue != null && body.discountValue !== "") {
    const dv =
      typeof body.discountValue === "number"
        ? body.discountValue
        : Number.parseFloat(String(body.discountValue));
    if (!Number.isFinite(dv) || dv < 0) {
      return NextResponse.json({ error: "Invalid discount value" }, { status: 400 });
    }
    discountValue = dv;
  }

  const discountIsPercent =
    body.discountIsPercent !== undefined ? Boolean(body.discountIsPercent) : true;
  if (discountEnabled && discountValue != null) {
    if (discountIsPercent && discountValue > 100) {
      return NextResponse.json(
        { error: "Percent discount cannot exceed 100" },
        { status: 400 }
      );
    }
  }

  let bargainingLow: number | null = null;
  if (body.bargainingLowAmount != null && body.bargainingLowAmount !== "") {
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
    bargainingLow = b;
    if (bargainingLow > priceNum) {
      return NextResponse.json(
        { error: "Bargaining floor cannot be greater than list price" },
        { status: 400 }
      );
    }
  }

  const colors = normalizeColors(body.colors);
  const images = normalizeImages(body.images);

  if (colors.length === 0) {
    return NextResponse.json(
      { error: "At least one color or variant label is required." },
      { status: 400 }
    );
  }

  const imgErr = validateProductImages(images);
  if (imgErr) {
    return NextResponse.json({ error: imgErr }, { status: 400 });
  }

  try {
    const row = await Product.create({
      businessId: gate.business.id,
      productName,
      productDescription:
        typeof body.productDescription === "string"
          ? body.productDescription.trim() || null
          : null,
      price: priceNum.toFixed(2),
      quantity: qty,
      subtractOnOrder: Boolean(body.subtractOnOrder),
      discountEnabled,
      discountValue:
        discountEnabled && discountValue != null
          ? discountValue.toFixed(2)
          : null,
      discountIsPercent,
      discountValidDate:
        discountEnabled &&
        typeof body.discountValidDate === "string" &&
        body.discountValidDate.trim()
          ? body.discountValidDate.trim().slice(0, 10)
          : null,
      brandName:
        typeof body.brandName === "string" && body.brandName.trim()
          ? body.brandName.trim()
          : null,
      colorsJson: JSON.stringify(colors),
      imagesJson: JSON.stringify(images),
      bargainingLowAmount:
        bargainingLow != null ? bargainingLow.toFixed(2) : null,
    });

    return NextResponse.json({ product: productToDto(row) });
  } catch (error) {
    console.error("[api/products POST]", error);
    return NextResponse.json(
      { error: "Failed to save product" },
      { status: 500 }
    );
  }
}
