import { getWhopEnvironment } from "@/lib/billing";

export function getWhopApiBaseUrl(): string {
  return getWhopEnvironment() === "production"
    ? "https://api.whop.com/api/v1"
    : "https://sandbox-api.whop.com/api/v1";
}

export function planIdFromCheckoutUrl(url: string): string | null {
  const match = url.match(/plan_[A-Za-z0-9]+/);
  return match?.[0] ?? null;
}

export async function createWhopCheckoutSession(params: {
  planId: string;
  businessId: number;
  plan: "starter" | "pro";
  returnUrl: string;
}): Promise<{ purchaseUrl: string } | { error: string }> {
  const apiKey = process.env.WHOP_API_KEY?.trim();
  if (!apiKey) {
    return { error: "WHOP_API_KEY is not configured." };
  }

  const res = await fetch(`${getWhopApiBaseUrl()}/checkout_configurations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: params.planId,
      mode: "payment",
      metadata: {
        businessId: String(params.businessId),
        business_id: String(params.businessId),
        plan: params.plan,
      },
      redirect_url: params.returnUrl,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    purchase_url?: string;
    error?: { message?: string };
    message?: string;
  };

  if (!res.ok) {
    const msg =
      json.error?.message ??
      json.message ??
      `Whop checkout API failed (${res.status})`;
    return { error: msg };
  }

  const purchaseUrl = json.purchase_url?.trim();
  if (!purchaseUrl) {
    return { error: "Whop did not return a checkout URL." };
  }

  return { purchaseUrl };
}

export async function fetchWhopMembershipPeriodEnd(
  membershipId: string
): Promise<Date | null> {
  const apiKey = process.env.WHOP_API_KEY?.trim();
  if (!apiKey || !membershipId.trim()) return null;

  const res = await fetch(
    `${getWhopApiBaseUrl()}/memberships/${encodeURIComponent(membershipId)}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    }
  );
  if (!res.ok) return null;

  const json = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!json) return null;

  return extractPeriodEndFromWhopData(json);
}

export function extractPeriodEndFromWhopData(
  data: Record<string, unknown>
): Date | null {
  const keys = [
    "renewal_period_end",
    "expires_at",
    "valid_until",
    "renews_at",
    "renewal_date",
  ];
  for (const key of keys) {
    const raw = data[key];
    if (typeof raw === "string" || typeof raw === "number") {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

export function defaultMonthlyPeriodEnd(from = new Date()): Date {
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

export async function cancelWhopMembership(
  membershipId: string,
  mode: "at_period_end" | "immediate" = "at_period_end"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.WHOP_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "WHOP_API_KEY is not configured." };

  const res = await fetch(
    `${getWhopApiBaseUrl()}/memberships/${encodeURIComponent(membershipId)}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancellation_mode: mode }),
    }
  );

  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    message?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      error:
        json.error?.message ??
        json.message ??
        `Whop cancel failed (${res.status})`,
    };
  }

  return { ok: true };
}
