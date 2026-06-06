/**
 * Public HTTPS base URL for Whop redirect_url (required by Whop API).
 *
 * Set APP_URL in .env to your ngrok URL (same host as Whop webhook, no path):
 *   APP_URL=https://abc123.ngrok-free.app
 *
 * Or open the site via ngrok — we detect x-forwarded-host / host automatically.
 */
export function getAppBaseUrlFromEnv(): string | null {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.WHOP_REDIRECT_BASE_URL?.trim() ||
    process.env.NGROK_URL?.trim();
  if (!raw) return null;
  return normalizeBaseUrl(raw);
}

function normalizeBaseUrl(raw: string): string | null {
  const trimmed = raw.replace(/\/$/, "");
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) {
    try {
      const u = new URL(trimmed);
      if (
        u.hostname.endsWith(".ngrok-free.app") ||
        u.hostname.endsWith(".ngrok.io") ||
        u.hostname.endsWith(".ngrok.app")
      ) {
        return `https://${u.host}`;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/** Prefer env; fall back to ngrok/https host from the incoming request. */
export function resolveAppBaseUrl(request?: Request): string | null {
  const fromEnv = getAppBaseUrlFromEnv();
  if (fromEnv) return fromEnv;
  if (!request) return null;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const host = (forwardedHost ?? hostHeader ?? "").split(",")[0]?.trim();
  if (!host) return null;

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isNgrok =
    host.includes("ngrok-free.app") ||
    host.includes("ngrok.io") ||
    host.includes("ngrok.app");

  let proto = forwardedProto?.split(",")[0]?.trim();
  if (!proto && isNgrok) proto = "https";
  if (!proto) {
    try {
      proto = new URL(request.url).protocol.replace(":", "");
    } catch {
      return null;
    }
  }

  if (proto !== "https") return null;
  return `https://${host}`;
}

export function getBillingReturnUrl(
  checkoutToken: string,
  request?: Request
): string | null {
  const base = resolveAppBaseUrl(request);
  if (!base) return null;
  return `${base}/api/billing/return?token=${encodeURIComponent(checkoutToken)}`;
}
