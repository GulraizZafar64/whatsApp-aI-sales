import { NextResponse } from "next/server";
import { requireDashboardBusiness } from "@/lib/dashboard-business";
import { isKnownCountryName } from "@/lib/countries";
import {
  isBusinessProfileComplete,
  isValidBusinessType,
} from "@/lib/business-type";
import { isAnthropicConfiguredFromEnv } from "@/lib/claude-env";
import {
  businessWebhookVerifyToken,
  generateWebhookVerifyToken,
} from "@/lib/webhook-verify-token";

export async function GET(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const b = gate.business;
  if (!businessWebhookVerifyToken(b)) {
    await b.update({ webhookVerifyToken: generateWebhookVerifyToken() });
    await b.reload();
  }
  const hasAnthropicApiKey =
    Boolean(b.anthropicApiKey?.trim()) || isAnthropicConfiguredFromEnv();
  return NextResponse.json({
    businessType: b.businessType,
    businessName: b.businessName,
    country: b.country,
    whatsappNumber: b.whatsappNumber,
    webhookVerifyToken: businessWebhookVerifyToken(b),
    profileComplete: isBusinessProfileComplete(b),
    hasAnthropicApiKey,
  });
}

export async function PATCH(request: Request) {
  const gate = await requireDashboardBusiness(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: {
    businessType?: unknown;
    businessName?: unknown;
    country?: unknown;
    anthropicApiKey?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: {
    businessType?: string;
    businessName?: string;
    country?: string;
    anthropicApiKey?: string | null;
  } = {};

  if (body.businessName !== undefined) {
    const name =
      typeof body.businessName === "string" ? body.businessName.trim() : "";
    if (!name || name.length > 255) {
      return NextResponse.json(
        { error: "businessName is required (max 255 characters)." },
        { status: 400 }
      );
    }
    updates.businessName = name;
  }

  if (body.businessType !== undefined) {
    const raw =
      typeof body.businessType === "string" ? body.businessType.trim() : "";
    if (!isValidBusinessType(raw)) {
      return NextResponse.json(
        {
          error:
            "businessType must be a supported type (see signup business type list).",
        },
        { status: 400 }
      );
    }
    updates.businessType = raw;
  }

  if (body.country !== undefined) {
    const raw = typeof body.country === "string" ? body.country.trim() : "";
    if (!raw || !isKnownCountryName(raw)) {
      return NextResponse.json(
        { error: "Please select a valid country from the list." },
        { status: 400 }
      );
    }
    updates.country = raw;
  }

  if ("anthropicApiKey" in body) {
    const g = body.anthropicApiKey;
    if (g === null || g === "") {
      updates.anthropicApiKey = null;
    } else if (typeof g === "string") {
      const t = g.trim();
      updates.anthropicApiKey = t || null;
    } else {
      return NextResponse.json(
        { error: "anthropicApiKey must be a string or null" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      {
        error:
          "Send businessName, businessType, country, and/or anthropicApiKey to update.",
      },
      { status: 400 }
    );
  }

  try {
    await gate.business.update(updates);
    await gate.business.reload();
    const b = gate.business;
    const hasAnthropicApiKey =
      Boolean(b.anthropicApiKey?.trim()) || isAnthropicConfiguredFromEnv();
    return NextResponse.json({
      ok: true,
      businessType: b.businessType,
      businessName: b.businessName,
      country: b.country,
      whatsappNumber: b.whatsappNumber,
      profileComplete: isBusinessProfileComplete(b),
      hasAnthropicApiKey,
    });
  } catch (error) {
    console.error("[api/business/profile PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
