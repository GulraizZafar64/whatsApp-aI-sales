/** Handler for /api/billing/whop-webhook and /api/whop/webhook */
import { handleWhopWebhookPost } from "@/lib/whop-webhook";

export async function POST(request: Request) {
  return handleWhopWebhookPost(request);
}
