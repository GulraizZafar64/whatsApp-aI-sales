import { getMetaAppAccessToken } from "@/lib/meta-app-credentials";
import { metaGraphUrl } from "@/lib/meta-graph-version";

export type GranularScope = {
  scope?: string;
  target_ids?: string[];
};

export type DebugTokenData = {
  app_id?: string;
  type?: string;
  application?: string;
  is_valid?: boolean;
  user_id?: string;
  granular_scopes?: GranularScope[];
  scopes?: string[];
  expires_at?: number;
};

export type DebugTokenResponse = {
  data?: DebugTokenData;
  error?: { message?: string; code?: number };
};

export async function fetchMetaDebugToken(
  userAccessToken: string
): Promise<{ ok: true; data: DebugTokenData; raw: DebugTokenResponse } | { ok: false; raw: DebugTokenResponse; error: string }> {
  const appAccessToken = getMetaAppAccessToken();
  if (!appAccessToken) {
    return {
      ok: false,
      raw: {},
      error: "Server missing FACEBOOK_APP_ID / FACEBOOK_APP_SECRET (or NEXT_PUBLIC_META_APP_ID / META_APP_SECRET)",
    };
  }

  const debugUrl = new URL(metaGraphUrl("debug_token"));
  debugUrl.searchParams.set("input_token", userAccessToken.trim());
  debugUrl.searchParams.set("access_token", appAccessToken);

  const res = await fetch(debugUrl.toString());
  const raw = (await res.json()) as DebugTokenResponse;

  console.log(
    "[meta-debug-token] debug_token",
    res.status,
    JSON.stringify(raw, null, 2)
  );

  if (!res.ok || raw.error || !raw.data?.is_valid) {
    return {
      ok: false,
      raw,
      error:
        raw.error?.message ??
        "Invalid access token or token expired.",
    };
  }

  return { ok: true, data: raw.data, raw };
}

/** Target WABA ids granted for a granular scope (empty = scope present but not linked). */
export function granularScopeTargetIds(
  debug: DebugTokenData,
  scopeName: string
): string[] {
  const entry = debug.granular_scopes?.find((s) => s.scope === scopeName);
  if (!entry?.target_ids?.length) return [];
  return entry.target_ids.map((id) => String(id).trim()).filter(Boolean);
}

export function messagingScopeLinked(debug: DebugTokenData): boolean {
  return granularScopeTargetIds(debug, "whatsapp_business_messaging").length > 0;
}

export function managementScopeLinked(debug: DebugTokenData): boolean {
  return granularScopeTargetIds(debug, "whatsapp_business_management").length > 0;
}

export function eventsScopeLinked(debug: DebugTokenData): boolean {
  return (
    granularScopeTargetIds(debug, "whatsapp_business_manage_events").length > 0
  );
}

export function manageAppSolutionGranted(debug: DebugTokenData): boolean {
  return (
    debug.scopes?.includes("manage_app_solution") === true ||
    debug.granular_scopes?.some((s) => s.scope === "manage_app_solution") === true
  );
}

/** Summary of approved scopes from debug_token (for connect logs). */
export function summarizeGrantedScopes(debug: DebugTokenData): Record<string, unknown> {
  return {
    messagingLinked: messagingScopeLinked(debug),
    managementLinked: managementScopeLinked(debug),
    eventsLinked: eventsScopeLinked(debug),
    manageAppSolution: manageAppSolutionGranted(debug),
    managementWabaIds: granularScopeTargetIds(debug, "whatsapp_business_management"),
    messagingWabaIds: granularScopeTargetIds(debug, "whatsapp_business_messaging"),
    eventsWabaIds: granularScopeTargetIds(debug, "whatsapp_business_manage_events"),
  };
}
