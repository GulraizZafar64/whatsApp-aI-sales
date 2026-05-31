import { META_WABA_GRANULAR_SCOPES } from "@/lib/meta-permissions";
import { metaGraphUrl } from "@/lib/meta-graph-version";

type GranularScope = { scope?: string; target_ids?: string[] };

type DebugTokenData = {
  granular_scopes?: GranularScope[];
  user_id?: string;
};

type GraphList<T> = { data?: T[]; error?: { message?: string } };

async function graphGet<T>(
  path: string,
  accessToken: string
): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${metaGraphUrl(path)}${sep}access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  return res.json() as Promise<T>;
}

function wabaIdsFromGranularScopes(debug: DebugTokenData): string[] {
  const ids = new Set<string>();
  for (const scopeName of META_WABA_GRANULAR_SCOPES) {
    const scope = debug.granular_scopes?.find((s) => s.scope === scopeName);
    for (const id of scope?.target_ids ?? []) {
      if (id) ids.add(String(id));
    }
  }
  return [...ids];
}

function collectWabaFromBusinessesPayload(data: GraphList<{
  owned_whatsapp_business_accounts?: GraphList<{ id?: string }>;
  client_whatsapp_business_accounts?: GraphList<{ id?: string }>;
}>): string[] {
  const ids = new Set<string>();
  for (const biz of data.data ?? []) {
    for (const w of biz.owned_whatsapp_business_accounts?.data ?? []) {
      if (w.id) ids.add(String(w.id));
    }
    for (const w of biz.client_whatsapp_business_accounts?.data ?? []) {
      if (w.id) ids.add(String(w.id));
    }
  }
  return [...ids];
}

/** Discover WABA ids from debug_token granular scopes + Graph fallbacks + env. */
export async function discoverWhatsAppBusinessAccountIds(params: {
  userAccessToken: string;
  debugData: DebugTokenData;
}): Promise<{ wabaIds: string[]; source: string }> {
  const fromGranular = wabaIdsFromGranularScopes(params.debugData);
  if (fromGranular.length) {
    return { wabaIds: fromGranular, source: "granular_scopes" };
  }

  const token = params.userAccessToken;

  const me = await graphGet<{
    whatsapp_business_accounts?: GraphList<{ id?: string }>;
    error?: { message?: string };
  }>("me?fields=whatsapp_business_accounts{id,name}", token);

  const fromMe: string[] = [];
  for (const w of me.whatsapp_business_accounts?.data ?? []) {
    if (w.id) fromMe.push(String(w.id));
  }
  if (fromMe.length) {
    return { wabaIds: fromMe, source: "me.whatsapp_business_accounts" };
  }

  const businesses = await graphGet<GraphList<{
    owned_whatsapp_business_accounts?: GraphList<{ id?: string }>;
    client_whatsapp_business_accounts?: GraphList<{ id?: string }>;
  }>>(
    "me/businesses?fields=owned_whatsapp_business_accounts{id},client_whatsapp_business_accounts{id}",
    token
  );
  const fromBiz = collectWabaFromBusinessesPayload(businesses);
  if (fromBiz.length) {
    return { wabaIds: fromBiz, source: "me.businesses" };
  }

  const userId = params.debugData.user_id?.trim();
  if (userId) {
    const userBiz = await graphGet<GraphList<{
      owned_whatsapp_business_accounts?: GraphList<{ id?: string }>;
      client_whatsapp_business_accounts?: GraphList<{ id?: string }>;
    }>>(
      `${userId}/businesses?fields=owned_whatsapp_business_accounts{id},client_whatsapp_business_accounts{id}`,
      token
    );
    const fromUserBiz = collectWabaFromBusinessesPayload(userBiz);
    if (fromUserBiz.length) {
      return { wabaIds: fromUserBiz, source: "user.businesses" };
    }
  }

  return { wabaIds: [], source: "none" };
}

export type DiscoveredPhoneNumber = {
  id: string;
  display_phone_number?: string;
};

/** List phone numbers on a WABA using the logged-in user's access token. */
export async function fetchPhoneNumbersForWaba(params: {
  wabaId: string;
  userAccessToken: string;
}): Promise<DiscoveredPhoneNumber[]> {
  const data = await graphGet<GraphList<DiscoveredPhoneNumber>>(
    `${params.wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`,
    params.userAccessToken
  );
  return data.data ?? [];
}
