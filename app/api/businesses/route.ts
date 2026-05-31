import { NextResponse } from "next/server";
import { isUnsetBusinessType } from "@/lib/business-type";
import { isKnownCountryName, isUnsetCountrySelection } from "@/lib/countries";
import { ensureDb } from "@/lib/sequelize";
import { Business } from "@/lib/models";

type Product = { name: string; price: string };

type SetupBody = {
  businessName?: string;
  businessType?: string;
  country?: string;
  whatsappNumber?: string;
  whatsappToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  products?: Product[];
  businessDescription?: string;
  replyTone?: string;
  userId?: string;
  status?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SetupBody;
    if (!body.phoneNumberId?.trim()) {
      return NextResponse.json(
        { error: "phoneNumberId is required" },
        { status: 400 }
      );
    }

    await ensureDb();

    const phoneNumberId = body.phoneNumberId.trim();
    const payload: Record<string, unknown> = {
      businessAccountId: body.businessAccountId?.trim() ?? null,
      whatsappToken: body.whatsappToken ?? null,
      whatsappNumber: body.whatsappNumber ?? null,
      products: body.products ?? null,
      businessDescription: body.businessDescription ?? null,
      replyTone: body.replyTone ?? null,
      userId: body.userId ?? "anonymous",
      status: body.status ?? "active",
    };

    const name =
      typeof body.businessName === "string" ? body.businessName.trim() : "";
    if (name) payload.businessName = name;

    const type =
      typeof body.businessType === "string" ? body.businessType.trim() : "";
    if (type && !isUnsetBusinessType(type)) payload.businessType = type;

    const country = typeof body.country === "string" ? body.country.trim() : "";
    if (country && !isUnsetCountrySelection(country) && isKnownCountryName(country)) {
      payload.country = country;
    }

    const [row, created] = await Business.findOrCreate({
      where: { phoneNumberId },
      defaults: { phoneNumberId, ...payload },
    });

    if (!created) {
      await row.update(payload);
    }

    await row.reload();

    return NextResponse.json({
      ok: true,
      id: row.id,
      created,
    });
  } catch (error) {
    console.error("[api/businesses POST]", error);
    return NextResponse.json(
      { error: "Failed to save business setup" },
      { status: 500 }
    );
  }
}
