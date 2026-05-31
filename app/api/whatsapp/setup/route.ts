import { NextResponse } from "next/server";
import { ensureDb } from "@/lib/sequelize";
import { Business } from "@/lib/models";
import { businessWebhookVerifyToken } from "@/lib/webhook-verify-token";
import { META_WEBHOOK_FIELDS } from "@/lib/meta-permissions";

/** Dev helper: list registered numbers and verify tokens for Meta Console setup. */
export async function GET() {
  await ensureDb();
  const rows = await Business.findAll({
    attributes: [
      "id",
      "phoneNumberId",
      "whatsappNumber",
      "businessAccountId",
      "webhookVerifyToken",
    ],
    order: [["id", "ASC"]],
    limit: 50,
  });

  const businesses = rows.map((b) => ({
    id: b.id,
    phoneNumberId: b.phoneNumberId,
    whatsappNumber: b.whatsappNumber,
    businessAccountId: b.businessAccountId,
    webhookVerifyToken: businessWebhookVerifyToken(b) || null,
  }));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");

  return NextResponse.json({
    ok: true,
    publicAppUrl: appUrl || null,
    webhookCallbackUrl: appUrl
      ? `${appUrl}/api/whatsapp/webhook`
      : null,
    pingUrl: appUrl ? `${appUrl}/api/whatsapp/ping` : null,
    envVerifyTokenFallback:
      process.env.WHATSAPP_VERIFY_TOKEN?.trim() ||
      "whatsapp_ai_assistant_verify_token",
    businesses,
    steps: [
      "1. Run: npm run dev",
      "2. Run ngrok: ngrok http 3000",
      "3. Set NEXT_PUBLIC_APP_URL in .env to the ngrok https URL (no trailing slash)",
      "4. Meta Developer → WhatsApp → Configuration → Callback URL = webhookCallbackUrl above",
      "5. Verify token = webhookVerifyToken from your business row OR envVerifyTokenFallback",
      `6. Subscribe to webhook fields: ${META_WEBHOOK_FIELDS.required.join(", ")} (required)` +
        (META_WEBHOOK_FIELDS.recommended.length
          ? `; optional: ${META_WEBHOOK_FIELDS.recommended.join(", ")}`
          : "") +
        " → Verify and save",
      "7. Sign in again so WABA is subscribed to this app (requests all approved App Review permissions)",
      "8. Send a test message — console should show [whatsapp-webhook] POST",
    ],
  });
}
