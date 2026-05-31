import { NextResponse } from "next/server";
import { matchWebhookVerifyToken } from "@/lib/webhook-verify-match";
import { processWhatsAppWebhookBody } from "@/lib/whatsapp-webhook-handler";

export const dynamic = "force-dynamic";

const RAW_BODY_LOG_MAX = 48_000;

function logIncomingWebhookRequest(request: Request, rawBody: string): void {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const bodyForLog =
    rawBody.length <= RAW_BODY_LOG_MAX
      ? rawBody
      : `${rawBody.slice(0, RAW_BODY_LOG_MAX)}… [${rawBody.length - RAW_BODY_LOG_MAX} more chars]`;

  console.log(
    "[whatsapp-webhook] incoming",
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        headers,
        body: bodyForLog,
      },
      null,
      2
    )
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token?.trim() && challenge) {
    const { business, source } = await matchWebhookVerifyToken(token);
    if (source !== "no_match" && source !== "empty") {
      console.log(
        "WEBHOOK_VERIFIED",
        source,
        business
          ? `business #${business.id} ${business.whatsappNumber ?? business.phoneNumberId}`
          : "(legacy/env token — no business row)"
      );
      return new Response(challenge, { status: 200 });
    }
    console.warn(
      "[whatsapp-webhook] verify failed: hub.verify_token does not match any business in DB or WHATSAPP_VERIFY_TOKEN in .env"
    );
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  logIncomingWebhookRequest(request, rawBody);

  let body: { object?: string; entry?: unknown[] };
  try {
    body = rawBody ? (JSON.parse(rawBody) as typeof body) : {};
  } catch (error) {
    console.error("[whatsapp-webhook] invalid JSON body:", error);
    return new NextResponse(null, { status: 200 });
  }

  void processWhatsAppWebhookBody(
    body as Parameters<typeof processWhatsAppWebhookBody>[0]
  ).catch((error) => {
    console.error("[whatsapp-webhook] async processing error:", error);
  });

  return new NextResponse(null, { status: 200 });
}
