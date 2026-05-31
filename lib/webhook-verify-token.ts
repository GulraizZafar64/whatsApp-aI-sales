import { randomBytes } from "crypto";
import type { Business } from "@/lib/models";

/** Meta “Verify token” for this business’s webhook (saved at WhatsApp connect). */
export function generateWebhookVerifyToken(): string {
  return randomBytes(24).toString("hex");
}

export function businessWebhookVerifyToken(
  business: Business | null | undefined
): string {
  return business?.webhookVerifyToken?.trim() ?? "";
}
