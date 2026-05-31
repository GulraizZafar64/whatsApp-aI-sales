import { ensureDb } from "@/lib/sequelize";
import { Business } from "@/lib/models";
import {
  listSubscribedApps,
  subscribeAppToWaba,
} from "@/lib/meta-waba-subscribe";
import { getMetaAppId } from "@/lib/meta-app-credentials";

const META_APP_ID = getMetaAppId();

export type BusinessSubscriptionCheck = {
  businessId: number;
  phoneNumberId: string;
  wabaId: string | null;
  whatsappNumber: string | null;
  hasToken: boolean;
  subscribed: boolean;
  appIds: string[];
  error?: string;
};

export type BusinessSubscriptionFixError = {
  businessId: number;
  phoneNumberId: string;
  wabaId: string;
  whatsappNumber: string | null;
  error: string;
  metaCode?: number;
};

export async function checkAllBusinessSubscriptions(): Promise<{
  total: number;
  subscribed: number;
  notSubscribed: number;
  noToken: number;
  businesses: BusinessSubscriptionCheck[];
}> {
  await ensureDb();
  const rows = await Business.findAll({
    where: { status: "active" },
    attributes: [
      "id",
      "phoneNumberId",
      "businessAccountId",
      "whatsappToken",
      "whatsappNumber",
    ],
  });

  const businesses: BusinessSubscriptionCheck[] = [];
  let subscribed = 0;
  let notSubscribed = 0;
  let noToken = 0;

  for (const row of rows) {
    const wabaId = row.businessAccountId?.trim() ?? null;
    const token = row.whatsappToken?.trim() ?? "";

    if (!wabaId) {
      businesses.push({
        businessId: row.id,
        phoneNumberId: row.phoneNumberId,
        wabaId: null,
        whatsappNumber: row.whatsappNumber,
        hasToken: Boolean(token),
        subscribed: false,
        appIds: [],
        error: "missing business_account_id (WABA id)",
      });
      notSubscribed += 1;
      continue;
    }

    if (!token) {
      noToken += 1;
      businesses.push({
        businessId: row.id,
        phoneNumberId: row.phoneNumberId,
        wabaId,
        whatsappNumber: row.whatsappNumber,
        hasToken: false,
        subscribed: false,
        appIds: [],
        error: "missing whatsapp_token",
      });
      continue;
    }

    const listed = await listSubscribedApps({ wabaId, accessToken: token });
    if (!listed.ok) {
      notSubscribed += 1;
      businesses.push({
        businessId: row.id,
        phoneNumberId: row.phoneNumberId,
        wabaId,
        whatsappNumber: row.whatsappNumber,
        hasToken: true,
        subscribed: false,
        appIds: [],
        error: listed.error,
      });
      continue;
    }

    const isSubscribed = META_APP_ID
      ? listed.appIds.includes(META_APP_ID)
      : listed.appIds.length > 0;

    if (isSubscribed) subscribed += 1;
    else notSubscribed += 1;

    businesses.push({
      businessId: row.id,
      phoneNumberId: row.phoneNumberId,
      wabaId,
      whatsappNumber: row.whatsappNumber,
      hasToken: true,
      subscribed: isSubscribed,
      appIds: listed.appIds,
    });
  }

  return {
    total: rows.length,
    subscribed,
    notSubscribed,
    noToken,
    businesses,
  };
}

export async function fixAllBusinessSubscriptions(): Promise<{
  total: number;
  success: number;
  failed: number;
  errors: BusinessSubscriptionFixError[];
  results: {
    businessId: number;
    phoneNumberId: string;
    wabaId: string;
    ok: boolean;
  }[];
}> {
  await ensureDb();
  const rows = await Business.findAll({
    where: { status: "active" },
    attributes: [
      "id",
      "phoneNumberId",
      "businessAccountId",
      "whatsappToken",
      "whatsappNumber",
    ],
  });

  const errors: BusinessSubscriptionFixError[] = [];
  const results: {
    businessId: number;
    phoneNumberId: string;
    wabaId: string;
    ok: boolean;
  }[] = [];
  let success = 0;
  let failed = 0;

  const subscribedWabas = new Set<string>();

  for (const row of rows) {
    const wabaId = row.businessAccountId?.trim();
    const token = row.whatsappToken?.trim();

    if (!wabaId) {
      failed += 1;
      errors.push({
        businessId: row.id,
        phoneNumberId: row.phoneNumberId,
        wabaId: "",
        whatsappNumber: row.whatsappNumber,
        error: "missing business_account_id",
      });
      continue;
    }

    if (!token) {
      failed += 1;
      errors.push({
        businessId: row.id,
        phoneNumberId: row.phoneNumberId,
        wabaId,
        whatsappNumber: row.whatsappNumber,
        error: "missing whatsapp_token",
      });
      continue;
    }

    let ok = subscribedWabas.has(wabaId);
    if (!ok) {
      const sub = await subscribeAppToWaba({
        wabaId,
        userAccessToken: token,
        metaAppId: META_APP_ID,
      });
      ok = sub.ok;
      if (sub.ok) {
        subscribedWabas.add(wabaId);
        console.log(
          "[admin/fix-all-subscriptions] subscribed WABA",
          wabaId,
          "for business",
          row.id
        );
      } else {
        console.error(
          "[admin/fix-all-subscriptions] failed",
          "business",
          row.id,
          "waba",
          wabaId,
          sub.error,
          sub.raw ?? ""
        );
        errors.push({
          businessId: row.id,
          phoneNumberId: row.phoneNumberId,
          wabaId,
          whatsappNumber: row.whatsappNumber,
          error: sub.error,
          metaCode: sub.metaCode,
        });
      }
    } else {
      ok = true;
    }

    results.push({
      businessId: row.id,
      phoneNumberId: row.phoneNumberId,
      wabaId,
      ok,
    });

    if (ok) success += 1;
    else failed += 1;
  }

  return {
    total: rows.length,
    success,
    failed,
    errors,
    results,
  };
}
