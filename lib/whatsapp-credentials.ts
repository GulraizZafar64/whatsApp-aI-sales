import type { Business } from "@/lib/models";

export function businessWhatsAppReady(
  business: Business | null | undefined
): boolean {
  return business?.waStatus === "ready";
}

export function resolveAnthropicApiKey(business?: Business | null): string {
  const perBusiness = business?.anthropicApiKey?.trim();
  if (perBusiness) return perBusiness;
  return (
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.CLAUDE_API_KEY?.trim() ||
    ""
  );
}
