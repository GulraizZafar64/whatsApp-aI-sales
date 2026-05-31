import { upsertBusinessFromMetaConnect } from "@/lib/business-lookup";
import { businessWebhookVerifyToken } from "@/lib/webhook-verify-token";
import { getMetaAppId } from "@/lib/meta-app-credentials";
import {
  fetchMetaDebugToken,
  granularScopeTargetIds,
  messagingScopeLinked,
  summarizeGrantedScopes,
} from "@/lib/meta-debug-token";
import { exchangeMetaLongLivedToken } from "@/lib/meta-token-exchange";
import { pickPrimaryPhoneNumber } from "@/lib/meta-phone-select";
import {
  discoverWhatsAppBusinessAccountIds,
  fetchPhoneNumbersForWaba,
  type DiscoveredPhoneNumber,
} from "@/lib/meta-waba-discovery";
import { subscribeAllWabas } from "@/lib/meta-waba-subscribe";
import { ensureDb } from "@/lib/sequelize";
import { Business } from "@/lib/models";

const MESSAGING_NOT_LINKED = {
  success: false as const,
  error: "whatsapp_messaging_not_linked" as const,
  message:
    "Please reconnect and select your WhatsApp number when prompted.",
};

export type FacebookAuthSuccess = {
  success: true;
  accessToken: string;
  phoneNumberId: string;
  whatsappNumber?: string;
  businessAccountId: string;
  businessId: number;
  webhookVerifyToken: string;
  registeredPhones: {
    businessId: number;
    phoneNumberId: string;
    whatsappNumber?: string;
    businessAccountId: string;
    webhookVerifyToken: string;
  }[];
  wabaSubscribed: boolean;
  wabaSubscribeError?: string;
  wabaSubscribeHint?: string;
  wabaSubscriptions: Awaited<ReturnType<typeof subscribeAllWabas>>;
  tokenExpiresIn?: number;
  message: string;
};

export type FacebookAuthFailure = {
  success: false;
  error: string;
  message?: string;
  meta_debug?: unknown;
  hint?: string;
};

export async function markBusinessesNeedReconnectByWaba(
  wabaIds: string[]
): Promise<void> {
  const ids = [...new Set(wabaIds.map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) return;
  await ensureDb();
  await Business.update(
    { needsReconnect: true },
    { where: { businessAccountId: ids } }
  );
}

export async function handleFacebookAuth(
  shortLivedToken: string
): Promise<FacebookAuthSuccess | FacebookAuthFailure> {
  if (!shortLivedToken?.trim()) {
    return { success: false, error: "Missing access token" };
  }

  if (!getMetaAppId()) {
    return {
      success: false,
      error: "Server missing FACEBOOK_APP_ID or NEXT_PUBLIC_META_APP_ID",
    };
  }

  const exchanged = await exchangeMetaLongLivedToken(shortLivedToken);
  if ("error" in exchanged) {
    return { success: false, error: exchanged.error };
  }
  const accessToken = exchanged.token;

  const debug = await fetchMetaDebugToken(accessToken);
  if (!debug.ok) {
    return {
      success: false,
      error: debug.error,
      meta_debug: debug.raw,
    };
  }

  const debugData = debug.data;

  console.log(
    "[meta-auth-facebook] granted scopes",
    JSON.stringify(summarizeGrantedScopes(debugData), null, 2)
  );

  const managementWabaIds = granularScopeTargetIds(
    debugData,
    "whatsapp_business_management"
  );

  if (!messagingScopeLinked(debugData)) {
    console.warn(
      "[meta-auth-facebook] whatsapp_business_messaging has no target_ids",
      JSON.stringify(debugData.granular_scopes, null, 2)
    );
    if (managementWabaIds.length) {
      await markBusinessesNeedReconnectByWaba(managementWabaIds);
    }
    return {
      ...MESSAGING_NOT_LINKED,
      meta_debug: debug.raw,
    };
  }

  let wabaIds = managementWabaIds;
  let wabaSource = "granular_scopes.management";

  if (!wabaIds.length) {
    const discovered = await discoverWhatsAppBusinessAccountIds({
      userAccessToken: accessToken,
      debugData,
    });
    wabaIds = discovered.wabaIds;
    wabaSource = discovered.source;
  }

  console.log("[meta-auth-facebook] WABA ids:", wabaSource, wabaIds);

  if (!wabaIds.length) {
    return {
      success: false,
      error: "no_waba",
      message:
        "No WhatsApp Business Account was shared. Link a WABA in Meta Developer Console → WhatsApp → API Setup, then sign in again.",
      meta_debug: debug.raw,
    };
  }

  const metaUserId =
    typeof debugData.user_id === "string" ? debugData.user_id : undefined;

  const allPhones: { phone: DiscoveredPhoneNumber; wabaId: string }[] = [];
  for (const wabaId of wabaIds) {
    const phones = await fetchPhoneNumbersForWaba({
      wabaId,
      userAccessToken: accessToken,
    });
    for (const phone of phones) {
      allPhones.push({ phone, wabaId });
    }
  }

  if (!allPhones.length) {
    return {
      success: false,
      error: "no_phone_numbers",
      message: "No phone numbers found for your WhatsApp Business Account(s).",
    };
  }

  console.log(
    "[meta-auth-facebook] subscribing WABAs with fresh long-lived token",
    wabaIds
  );
  const wabaSubscriptions = await subscribeAllWabas({
    wabaIds,
    userAccessToken: accessToken,
    metaAppId: getMetaAppId(),
  });
  const allWabasSubscribed = wabaSubscriptions.every((s) => s.ok);
  const firstSubscribeError = wabaSubscriptions.find((s) => !s.ok);

  const registeredPhones: FacebookAuthSuccess["registeredPhones"] = [];

  for (const { phone, wabaId } of allPhones) {
    const business = await upsertBusinessFromMetaConnect({
      accessToken,
      phoneNumberId: String(phone.id),
      businessAccountId: wabaId,
      whatsappNumber: phone.display_phone_number,
      userId: metaUserId,
      needsReconnect: false,
    });
    registeredPhones.push({
      businessId: business.id,
      phoneNumberId: String(phone.id),
      whatsappNumber: phone.display_phone_number,
      businessAccountId: wabaId,
      webhookVerifyToken: businessWebhookVerifyToken(business),
    });
    console.log(
      "[meta-auth-facebook] saved business",
      business.id,
      "phone_number_id",
      phone.id,
      "waba",
      wabaId
    );
  }

  const primary = pickPrimaryPhoneNumber(allPhones.map((e) => e.phone));
  const primaryId = primary
    ? String(primary.id)
    : registeredPhones[0]!.phoneNumberId;
  const primaryRow =
    registeredPhones.find((r) => r.phoneNumberId === primaryId) ??
    registeredPhones[0]!;

  return {
    success: true,
    accessToken,
    phoneNumberId: primaryRow.phoneNumberId,
    whatsappNumber: primaryRow.whatsappNumber,
    businessAccountId: primaryRow.businessAccountId,
    businessId: primaryRow.businessId,
    webhookVerifyToken: primaryRow.webhookVerifyToken,
    registeredPhones,
    wabaSubscribed: allWabasSubscribed,
    wabaSubscribeError: firstSubscribeError?.error,
    wabaSubscribeHint: firstSubscribeError?.hint,
    wabaSubscriptions,
    tokenExpiresIn: exchanged.expiresIn,
    message: allWabasSubscribed
      ? registeredPhones.length > 1
        ? `Connected ${registeredPhones.length} numbers. Webhooks subscribed.`
        : "Connected. Token saved and webhooks subscribed."
      : (firstSubscribeError?.error ??
        "Account saved but webhook subscription failed."),
  };
}
