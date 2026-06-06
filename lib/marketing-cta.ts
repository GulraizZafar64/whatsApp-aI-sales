import { whatsappChatUrl } from "@/lib/support-whatsapp";

/** Interactive product demo page. */
export const DEMO_PAGE_HREF = "/demo";

export const MARKETING_WHATSAPP = {
  expert: whatsappChatUrl(
    "Hi! I'd like to talk to an expert about WhatsApp AI Sales."
  ),
  support: whatsappChatUrl("Hi! I need help with WhatsApp AI Sales (support)."),
  sales: whatsappChatUrl(
    "Hi! I'm interested in WhatsApp AI Sales — pricing / enterprise."
  ),
  general: whatsappChatUrl("Hi! I'd like to get in touch."),
} as const;
