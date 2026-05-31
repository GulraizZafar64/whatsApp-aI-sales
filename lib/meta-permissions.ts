/** OAuth scopes approved via Meta App Review. */
export const META_FB_LOGIN_SCOPES = [
  "whatsapp_business_management",
  "whatsapp_business_messaging",
  "whatsapp_business_manage_events",
  "manage_app_solution",
  "public_profile",
] as const;

export type MetaFbLoginScope = (typeof META_FB_LOGIN_SCOPES)[number];

export function metaFbLoginScopeString(): string {
  return META_FB_LOGIN_SCOPES.join(",");
}

/** Granular scopes that may carry WABA target_ids on debug_token. */
export const META_WABA_GRANULAR_SCOPES = [
  "whatsapp_business_management",
  "whatsapp_business_messaging",
  "whatsapp_business_manage_events",
] as const;

/**
 * Webhook fields to subscribe in Meta Developer → WhatsApp → Configuration.
 * `messages` is required for inbound/outbound chat; others need management/events permissions.
 */
export const META_WEBHOOK_FIELDS = {
  required: ["messages"] as const,
  recommended: [
    "account_update",
    "message_template_status_update",
    "automatic_events",
  ] as const,
};
