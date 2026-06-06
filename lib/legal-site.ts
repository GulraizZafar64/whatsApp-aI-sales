/** Branding and contact placeholders for legal pages — update before production launch. */
import { MARKETING_WHATSAPP } from "@/lib/marketing-cta";
import { whatsappChatUrl } from "@/lib/support-whatsapp";

export const APP_NAME = "WhatsApp AI Sales";
export const APP_TAGLINE =
  "AI-powered WhatsApp sales assistant for product catalogs, automated replies, and order handling.";
export const LEGAL_LAST_UPDATED = "May 16, 2026";
export const OPERATOR_NAME = "WhatsApp AI Sales";

/** Support, sales, and privacy-related requests via WhatsApp only. */
export const LEGAL_WHATSAPP_SUPPORT = MARKETING_WHATSAPP.support;
export const LEGAL_WHATSAPP_PRIVACY = whatsappChatUrl(
  "Hi, I have a privacy or data request regarding WhatsApp AI Sales."
);
export const LEGAL_WHATSAPP_GENERAL = MARKETING_WHATSAPP.general;
