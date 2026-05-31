import { getMetaAppId, getMetaAppSecret } from "@/lib/meta-app-credentials";
import { metaGraphUrl } from "@/lib/meta-graph-version";

/**
 * Exchange a short-lived Facebook Login token for a long-lived user token (~60 days).
 * https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
 */
export async function exchangeMetaLongLivedToken(
  shortLivedToken: string
): Promise<{ token: string; expiresIn?: number } | { error: string }> {
  const appId = getMetaAppId();
  const appSecret = getMetaAppSecret();
  if (!appId || !appSecret) {
    return {
      error:
        "Server missing FACEBOOK_APP_ID / FACEBOOK_APP_SECRET (or NEXT_PUBLIC_META_APP_ID / META_APP_SECRET)",
    };
  }

  const url = new URL(metaGraphUrl("oauth/access_token"));
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken.trim());

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!res.ok || !data.access_token) {
    console.error(
      "[meta-token-exchange] failed",
      res.status,
      JSON.stringify(data, null, 2)
    );
    return {
      error:
        data.error?.message ??
        "Could not exchange token for long-lived access. Try signing in again.",
    };
  }

  return { token: data.access_token, expiresIn: data.expires_in };
}
