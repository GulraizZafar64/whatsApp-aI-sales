/** Handler for /api/billing/checkout */
import { NextResponse } from "next/server";
import {
  getCheckoutUrl,
  getEnterpriseWhatsAppUrl,
} from "@/lib/billing";
import { requireDashboardUserForCheckout } from "@/lib/dashboard-business";
import { isBusinessProfileComplete } from "@/lib/business-type";
import {
  createWhopCheckoutSession,
  planIdFromCheckoutUrl,
} from "@/lib/whop-api";
import { getBillingReturnUrl } from "@/lib/app-url";
import { signCheckoutReturnToken } from "@/lib/checkout-return-token";
import { markCheckoutPending } from "@/lib/whop-billing-sync";

type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; status: number; error: string };

async function resolveCheckoutUrl(
  request: Request,
  plan: string
): Promise<CheckoutResult> {
  if (plan === "enterprise") {
    return { ok: true, url: getEnterpriseWhatsAppUrl() };
  }

  if (plan !== "starter" && plan !== "pro") {
    return { ok: false, status: 400, error: "Invalid plan." };
  }

  const gate = await requireDashboardUserForCheckout(request);
  if (!gate.ok) {
    return {
      ok: false,
      status: gate.status === 401 ? 401 : gate.status,
      error: gate.error,
    };
  }

  if (!gate.business || !isBusinessProfileComplete(gate.business)) {
    return {
      ok: false,
      status: 403,
      error: "Complete your business details before subscribing.",
    };
  }

  const staticCheckoutUrl = getCheckoutUrl(plan);
  if (!staticCheckoutUrl) {
    return {
      ok: false,
      status: 500,
      error: "Checkout URL is not configured.",
    };
  }

  const planId = planIdFromCheckoutUrl(staticCheckoutUrl);
  await markCheckoutPending(gate.business, plan);

  const checkoutToken = signCheckoutReturnToken({
    businessId: gate.business.id,
    userId: gate.userId,
    plan,
  });
  const returnUrl = getBillingReturnUrl(checkoutToken, request);

  if (planId && process.env.WHOP_API_KEY?.trim() && returnUrl) {
    const session = await createWhopCheckoutSession({
      planId,
      businessId: gate.business.id,
      plan,
      returnUrl,
    });
    if ("purchaseUrl" in session) {
      console.log("[billing/checkout] Whop session created", {
        businessId: gate.business.id,
        plan,
        returnUrl,
      });
      return { ok: true, url: session.purchaseUrl };
    }
    console.warn("[billing/checkout] Whop session failed:", session.error);
  } else if (!returnUrl) {
    console.warn(
      "[billing/checkout] APP_URL must be a public https URL (e.g. ngrok) for Whop checkout metadata"
    );
  }

  return {
    ok: false,
    status: 500,
    error:
      "Checkout is not configured. Set APP_URL to your public https URL (e.g. ngrok tunnel) and restart the server.",
  };
}

/** Browser navigation without auth header — prefer POST from the pricing page. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const plan = (url.searchParams.get("plan") ?? "").trim().toLowerCase();
  const result = await resolveCheckoutUrl(request, plan);

  if (!result.ok) {
    if (result.status === 401) {
      return NextResponse.redirect(
        new URL("/sign-in?next=/pricing", request.url)
      );
    }
    if (result.status === 403) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.redirect(result.url);
}

export async function POST(request: Request) {
  let body: { plan?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const plan = (body.plan ?? "").trim().toLowerCase();
  const result = await resolveCheckoutUrl(request, plan);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ checkoutUrl: result.url });
}
