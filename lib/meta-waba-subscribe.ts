import { META_GRAPH_VERSION, metaGraphUrl } from "@/lib/meta-graph-version";

export type WabaSubscribeResult = {
  wabaId: string;
  ok: boolean;
  error?: string;
  metaCode?: number;
  hint?: string;
  attempts?: number;
};

type GraphErrorBody = {
  success?: boolean;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
    fbtrace_id?: string;
  };
};

const MAX_SUBSCRIBE_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function graphErrorText(data: GraphErrorBody): string {
  const e = data.error;
  if (!e) return "Unknown Meta API error";
  const parts = [e.error_user_title, e.error_user_msg, e.message].filter(Boolean);
  const base = parts.length ? parts.join(" — ") : "Meta API error";
  const code =
    e.code != null
      ? ` [code ${e.code}${e.error_subcode != null ? `/${e.error_subcode}` : ""}]`
      : "";
  const trace = e.fbtrace_id ? ` (fbtrace_id: ${e.fbtrace_id})` : "";
  return `${base}${code}${trace}`;
}

function shouldRetrySubscribe(metaCode?: number, status?: number): boolean {
  if (status != null && status >= 500) return true;
  if (metaCode == null) return false;
  return metaCode === 4 || metaCode === 17 || metaCode === 32 || metaCode === 613;
}

function logMetaApiCall(params: {
  label: string;
  method: string;
  url: string;
  wabaId: string;
  status: number;
  statusText: string;
  body: unknown;
  attempt?: number;
}): void {
  const prefix = `[meta-waba-subscribe] ${params.label}`;
  const payload = {
    graphVersion: META_GRAPH_VERSION,
    method: params.method,
    wabaId: params.wabaId,
    url: params.url,
    httpStatus: params.status,
    httpStatusText: params.statusText,
    attempt: params.attempt,
    response: params.body,
  };
  if (params.status >= 400 || (params.body as GraphErrorBody)?.success === false) {
    console.error(prefix, JSON.stringify(payload, null, 2));
  } else {
    console.log(prefix, JSON.stringify(payload, null, 2));
  }
}

/** User-facing fix hints from common subscribed_apps failures (Meta / community). */
export function wabaSubscribeHint(metaCode?: number, message?: string): string {
  const m = (message ?? "").toLowerCase();
  if (metaCode === 10 || m.includes("does not have permission")) {
    return (
      "Ensure Meta App Review granted Advanced Access for whatsapp_business_management, " +
      "whatsapp_business_messaging, whatsapp_business_manage_events, and manage_app_solution. " +
      `Or subscribe once manually: Graph API Explorer → POST /{WABA-ID}/subscribed_apps (${META_GRAPH_VERSION}) with your user token.`
    );
  }
  if (metaCode === 100 || m.includes("before override")) {
    return (
      "In Meta Developer → WhatsApp → Configuration, click Verify and save on the webhook first, then sign in again."
    );
  }
  if (metaCode === 190 || metaCode === 102 || m.includes("expired") || m.includes("invalid oauth")) {
    return "Access token expired or invalid — sign in with Facebook again.";
  }
  if (m.includes("unsupported post") || m.includes("unknown path")) {
    return "Check business_account_id is the WABA ID (WhatsApp Business Account), not phone_number_id.";
  }
  return (
    "In Meta Developer → WhatsApp → Configuration: set callback URL, verify token, subscribe to messages " +
    "(and automatic_events if using CTWA ads). " +
    `Then Graph API Explorer: POST ${META_GRAPH_VERSION}/{{WABA-ID}}/subscribed_apps with the same user token.`
  );
}

/** GET …/{waba-id}/subscribed_apps — see if this app is already subscribed. */
export async function listSubscribedApps(params: {
  wabaId: string;
  accessToken: string;
}): Promise<
  | { ok: true; appIds: string[]; raw: unknown }
  | { ok: false; error: string; metaCode?: number; raw: unknown }
> {
  const wabaId = params.wabaId.trim();
  const url = metaGraphUrl(`${wabaId}/subscribed_apps`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${params.accessToken.trim()}` },
  });
  const data = (await res.json()) as GraphErrorBody & {
    data?: { whatsapp_business_api_data?: { id?: string } }[];
  };

  logMetaApiCall({
    label: "listSubscribedApps",
    method: "GET",
    url,
    wabaId,
    status: res.status,
    statusText: res.statusText,
    body: data,
  });

  if (!res.ok) {
    return {
      ok: false,
      error: graphErrorText(data),
      metaCode: data.error?.code,
      raw: data,
    };
  }

  const appIds =
    data.data
      ?.map((row) => row.whatsapp_business_api_data?.id)
      .filter((id): id is string => Boolean(id)) ?? [];
  return { ok: true, appIds, raw: data };
}

/**
 * Subscribe this Meta app to a WABA (uses WABA id, not phone_number_id).
 * Pass the fresh long-lived user token from login — not a stale DB copy during connect.
 * @see https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/subscribed_apps/
 */
export async function subscribeAppToWaba(params: {
  wabaId: string;
  userAccessToken: string;
  metaAppId?: string;
}): Promise<
  | { ok: true; alreadySubscribed?: boolean; attempts: number }
  | { ok: false; error: string; metaCode?: number; hint: string; attempts: number; raw?: unknown }
> {
  const wabaId = params.wabaId.trim();
  const token = params.userAccessToken.trim();
  const appId = params.metaAppId?.trim();

  if (!wabaId) {
    return {
      ok: false,
      error: "Missing WABA id (business_account_id)",
      hint: "business_account_id must be the WhatsApp Business Account ID, not phone_number_id.",
      attempts: 0,
    };
  }

  if (!token) {
    return {
      ok: false,
      error: "Missing access token",
      hint: "Sign in with Facebook again to obtain a fresh long-lived token.",
      attempts: 0,
    };
  }

  if (appId) {
    const listed = await listSubscribedApps({ wabaId, accessToken: token });
    if (listed.ok && listed.appIds.includes(appId)) {
      return { ok: true, alreadySubscribed: true, attempts: 0 };
    }
  }

  const url = metaGraphUrl(`${wabaId}/subscribed_apps`);
  let lastError = "Unknown Meta API error";
  let lastMetaCode: number | undefined;
  let lastRaw: unknown;

  for (let attempt = 1; attempt <= MAX_SUBSCRIBE_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const data = (await res.json()) as GraphErrorBody;
    lastRaw = data;

    logMetaApiCall({
      label: "subscribeAppToWaba",
      method: "POST",
      url,
      wabaId,
      status: res.status,
      statusText: res.statusText,
      body: data,
      attempt,
    });

    if (res.ok && data.success !== false) {
      return { ok: true, attempts: attempt };
    }

    lastError = graphErrorText(data);
    lastMetaCode = data.error?.code;

    if (attempt < MAX_SUBSCRIBE_ATTEMPTS && shouldRetrySubscribe(lastMetaCode, res.status)) {
      console.warn(
        "[meta-waba-subscribe] retrying subscribed_apps",
        wabaId,
        `attempt ${attempt + 1}/${MAX_SUBSCRIBE_ATTEMPTS}`,
        lastError
      );
      await sleep(RETRY_DELAY_MS * attempt);
      continue;
    }

    break;
  }

  return {
    ok: false,
    error: lastError,
    metaCode: lastMetaCode,
    hint: wabaSubscribeHint(lastMetaCode, lastError),
    attempts: MAX_SUBSCRIBE_ATTEMPTS,
    raw: lastRaw,
  };
}

/** Alias matching common naming in Meta integration guides. */
export const subscribeWABAToWebhook = subscribeAppToWaba;

/** Subscribe app to every WABA after Connect with Facebook. */
export async function subscribeAllWabas(params: {
  wabaIds: string[];
  userAccessToken: string;
  metaAppId?: string;
}): Promise<WabaSubscribeResult[]> {
  const unique = [...new Set(params.wabaIds.map((id) => id.trim()).filter(Boolean))];
  const results: WabaSubscribeResult[] = [];

  for (const wabaId of unique) {
    const sub = await subscribeAppToWaba({
      wabaId,
      userAccessToken: params.userAccessToken,
      metaAppId: params.metaAppId,
    });
    results.push({
      wabaId,
      ok: sub.ok,
      error: sub.ok ? undefined : sub.error,
      metaCode: sub.ok ? undefined : sub.metaCode,
      hint: sub.ok ? undefined : sub.hint,
      attempts: sub.attempts,
    });
    if (sub.ok) {
      console.log(
        "[whatsapp] subscribed app to WABA",
        wabaId,
        sub.alreadySubscribed ? "(already subscribed)" : "",
        sub.attempts ? `(attempts: ${sub.attempts})` : ""
      );
    } else {
      console.warn(
        "[whatsapp] WABA subscribe failed",
        wabaId,
        sub.error,
        sub.hint,
        "raw:",
        JSON.stringify(sub.raw ?? null)
      );
    }
  }

  return results;
}
