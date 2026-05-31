import { metaFbLoginScopeString } from "@/lib/meta-permissions";

/** Options passed to FB.login for WhatsApp connect (sign-in / get-started / dashboard reconnect). */
export function metaFbLoginOptions(): {
  scope: string;
  return_scopes: boolean;
  auth_type: string;
  extras: { sessionInfoVersion: string };
} {
  return {
    scope: metaFbLoginScopeString(),
    return_scopes: true,
    auth_type: "reauthorize",
    extras: {
      sessionInfoVersion: "3",
    },
  };
}
