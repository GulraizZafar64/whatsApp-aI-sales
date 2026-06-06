/** Handler for /api/business/setup */
import { NextResponse } from "next/server";
import { signAuthToken } from "@/lib/auth/jwt";
import { createBusinessForUser } from "@/lib/business-lookup";
import { trialStartPayload } from "@/lib/business-billing";
import { requireDashboardUser } from "@/lib/dashboard-business";
import { isKnownCountryName } from "@/lib/countries";
import { isValidBusinessType } from "@/lib/business-type";
import { isValidCurrency, normalizeCurrency } from "@/lib/currency";

export async function POST(request: Request) {
  const gate = await requireDashboardUser(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: {
    businessName?: string;
    businessType?: string;
    country?: string;
    currency?: string;
    whatsappNumber?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const businessName =
    typeof body.businessName === "string" ? body.businessName.trim() : "";
  const businessType =
    typeof body.businessType === "string" ? body.businessType.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";
  const currencyRaw =
    typeof body.currency === "string" ? body.currency.trim() : "";
  const whatsappNumber =
    typeof body.whatsappNumber === "string" ? body.whatsappNumber.trim() : "";

  if (!businessName || businessName.length > 255) {
    return NextResponse.json(
      { error: "businessName is required (max 255 characters)." },
      { status: 400 }
    );
  }
  if (!isValidBusinessType(businessType)) {
    return NextResponse.json({ error: "Invalid business type." }, { status: 400 });
  }
  if (!country || !isKnownCountryName(country)) {
    return NextResponse.json(
      { error: "Please select a valid country." },
      { status: 400 }
    );
  }
  if (!currencyRaw || !isValidCurrency(currencyRaw)) {
    return NextResponse.json(
      { error: "Please select a valid currency." },
      { status: 400 }
    );
  }

  try {
    const business = await createBusinessForUser({
      ownerUserId: gate.userId,
      businessName,
      businessType,
      country,
      currency: normalizeCurrency(currencyRaw),
      whatsappNumber: whatsappNumber || null,
    });

    if (!business.billingStatus && !business.periodEndsAt) {
      await business.update(trialStartPayload());
      await business.reload();
    }

    const token = signAuthToken({
      userId: gate.userId,
      businessId: business.id,
    });

    return NextResponse.json({
      ok: true,
      token,
      businessId: business.id,
    });
  } catch (error) {
    console.error("[api/business/setup]", error);
    return NextResponse.json({ error: "Setup failed." }, { status: 500 });
  }
}
