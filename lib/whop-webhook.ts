import { NextResponse } from "next/server";
import crypto from "crypto";
import { blockBusinessAccess } from "@/lib/billing-notice";
import {
  applyPaidSubscription,
  findBusinessForWhopEvent,
  readMembershipId,
} from "@/lib/whop-billing-sync";

type WhopEvent = {
  type: string;
  data: Record<string, unknown>;
};

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseWhopEvent(raw: unknown): WhopEvent | null {
  const body = readRecord(raw);
  if (!body) return null;

  const type = String(body.type ?? body.event ?? "").trim();
  if (!type) return null;

  const data = readRecord(body.data) ?? body;
  return { type, data };
}

async function deactivateSubscription(
  business: import("@/lib/models").Business,
  reason: "renewal_failed" | "expired"
): Promise<void> {
  console.log("[whop-webhook] deactivate subscription", {
    businessId: business.id,
    reason,
  });

  await business.update({
    billingStatus: reason,
    periodEndsAt: new Date(),
  });

  const accessReason =
    reason === "renewal_failed" ? "renewal_failed" : "subscription_expired";
  await blockBusinessAccess(business, {
    allowed: false,
    state:
      reason === "renewal_failed" ? "renewal_failed" : "subscription_expired",
    reason: accessReason,
  });
}

function verifyWhopWebhook(
  rawBody: string,
  headers: Headers,
  secret: string
): boolean {
  const webhookId = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!webhookId || !timestamp || !signatureHeader) return false;

  const signedContent = `${webhookId}.${timestamp}.${rawBody}`;
  const keyBytes = Buffer.from(secret, "utf8");
  const expected = crypto
    .createHmac("sha256", keyBytes)
    .update(signedContent)
    .digest("base64");

  const signatures = signatureHeader.split(" ").map((part) => {
    const trimmed = part.trim();
    return trimmed.startsWith("v1,") ? trimmed.slice(3) : trimmed;
  });

  for (const sig of signatures) {
    try {
      const a = Buffer.from(sig, "base64");
      const b = Buffer.from(expected, "base64");
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

function isActivateEvent(type: string): boolean {
  const t = type.toLowerCase();
  return (
    t === "payment.succeeded" ||
    t === "membership.activated" ||
    t === "membership.went_valid" ||
    t === "membership.renewed" ||
    t === "invoice.paid" ||
    t === "invoice.paid_success" ||
    (t.includes("renewal") && t.includes("succeed"))
  );
}

function isDeactivateEvent(type: string): boolean {
  const t = type.toLowerCase();
  return (
    t === "payment.failed" ||
    t === "membership.deactivated" ||
    t === "membership.went_invalid"
  );
}

export async function handleWhopWebhookPost(
  request: Request
): Promise<NextResponse> {
  const rawBody = await request.text();
  const secret = process.env.WHOP_WEBHOOK_SECRET?.trim();

  if (secret) {
    const legacyHeader = request.headers.get("x-whop-webhook-secret")?.trim();
    const signatureOk = verifyWhopWebhook(rawBody, request.headers, secret);
    if (!signatureOk && legacyHeader !== secret) {
      console.warn("[whop-webhook] invalid signature");
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 401 }
      );
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    console.warn("[whop-webhook] invalid JSON body:", rawBody.slice(0, 500));
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  console.log("[whop-webhook] raw payload:", rawBody);
  console.log(
    "[whop-webhook] parsed payload:",
    JSON.stringify(parsed, null, 2)
  );

  const event = parseWhopEvent(parsed);
  if (!event) {
    console.warn("[whop-webhook] missing event type in payload");
    return NextResponse.json({ error: "Missing event type." }, { status: 400 });
  }

  console.log("[whop-webhook] event type:", event.type);

  const membershipId = readMembershipId(event.data);
  const business = await findBusinessForWhopEvent(event.data, membershipId);

  if (!business) {
    console.warn("[whop-webhook] no business match", {
      type: event.type,
      membershipId,
      metadata: event.data.metadata,
      product: readRecord(event.data.product)?.title,
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "no_business" });
  }

  console.log("[whop-webhook] matched business", {
    businessId: business.id,
    plan: business.plan,
    billingStatus: business.billingStatus,
    periodEndsAt: business.periodEndsAt,
    whopMembershipId: business.whopMembershipId,
  });

  if (isActivateEvent(event.type)) {
    await applyPaidSubscription(business, event.data, membershipId);
    return NextResponse.json({ ok: true, action: "activated" });
  }

  if (isDeactivateEvent(event.type)) {
    const failed = event.type.toLowerCase().includes("failed");
    await deactivateSubscription(business, failed ? "renewal_failed" : "expired");
    return NextResponse.json({
      ok: true,
      action: failed ? "renewal_failed" : "expired",
    });
  }

  console.log("[whop-webhook] ignored event type:", event.type);
  return NextResponse.json({ ok: true, ignored: true, type: event.type });
}
