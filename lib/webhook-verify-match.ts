import { findBusinessByWebhookVerifyToken } from "@/lib/business-lookup";
import type { Business } from "@/lib/models";

const LEGACY_DEFAULT = "whatsapp_ai_assistant_verify_token";

/**
 * Match Meta `hub.verify_token` to a business row, or legacy env/default token.
 * Meta will not deliver POST webhooks until GET verification succeeds.
 */
export async function matchWebhookVerifyToken(
  verifyToken: string
): Promise<{ business: Business | null; source: string }> {
  const trimmed = verifyToken.trim();
  if (!trimmed) return { business: null, source: "empty" };

  const fromDb = await findBusinessByWebhookVerifyToken(trimmed);
  if (fromDb) return { business: fromDb, source: "database" };

  const envLegacy = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (envLegacy && trimmed === envLegacy) {
    return { business: null, source: "env" };
  }
  if (trimmed === LEGACY_DEFAULT) {
    return { business: null, source: "legacy_default" };
  }

  return { business: null, source: "no_match" };
}
