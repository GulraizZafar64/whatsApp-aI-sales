/** Meta app id/secret — supports FACEBOOK_* or legacy NEXT_PUBLIC_META_* / META_APP_SECRET. */
export function getMetaAppId(): string {
  return (
    process.env.FACEBOOK_APP_ID?.trim() ||
    process.env.NEXT_PUBLIC_META_APP_ID?.trim() ||
    ""
  );
}

export function getMetaAppSecret(): string {
  return (
    process.env.FACEBOOK_APP_SECRET?.trim() ||
    process.env.META_APP_SECRET?.trim() ||
    ""
  );
}

export function getMetaAppAccessToken(): string | null {
  const id = getMetaAppId();
  const secret = getMetaAppSecret();
  if (!id || !secret) return null;
  return `${id}|${secret}`;
}
