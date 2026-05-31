import { NextResponse } from "next/server";

/** Open this URL in a browser (via ngrok) to confirm Meta can reach your server. */
export async function GET() {
  console.log("[whatsapp-ping] OK — server is reachable");
  return NextResponse.json({
    ok: true,
    message:
      "Server is running. Meta webhook URL must be: {YOUR_PUBLIC_HTTPS_URL}/api/whatsapp/webhook",
    webhookPath: "/api/whatsapp/webhook",
  });
}
