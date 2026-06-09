import { Op } from "sequelize";
import type { Business, Product } from "@/lib/models";
import { WhatsAppMessage } from "@/lib/models";
import { mergeAiInstructions, type AiInstructionsRecord } from "@/lib/ai-instructions";
import {
  fetchBusinessProductsForAi,
  catalogJsonForAiPrompt,
} from "@/lib/catalog-for-ai";
import type { ConversationTurn } from "@/lib/claude-generate";
import { detectCustomerLanguageWithAi } from "@/lib/claude-customer-intent";
import {
  detectCustomerLanguageLocal,
  MAX_THREAD_MESSAGES_FOR_AI,
} from "@/lib/customer-language-detect";

export { MAX_THREAD_MESSAGES_FOR_AI };
import type { CustomerLanguage } from "@/lib/customer-language";
import {
  checkoutSettingsLabel,
  effectiveOrderRequirements,
  type OrderRequirements,
} from "@/lib/order-requirements";
import { checkoutSessionRecoveryHint } from "@/lib/order-checkout";
import {
  customerAsksAboutExistingOrder,
  fetchCustomerOrderSummaries,
  type CustomerOrderSummary,
} from "@/lib/customer-order-status";

export type AiReplyInitialContext = {
  products: Product[];
  catalogJson: string;
  history: ConversationTurn[];
  instructions: AiInstructionsRecord;
  checkoutSettings: OrderRequirements;
  checkoutSettingsLabel: string;
  customerLang: CustomerLanguage;
  customerOrderSummaries: CustomerOrderSummary[];
  checkoutRecoveryHint: string | null;
  returningCustomer: {
    hasOrder: boolean;
    latestOrder: CustomerOrderSummary | null;
  };
  needsDbOrderContext: boolean;
};

function settleValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

/**
 * Prior turns for this contact (incoming → user, outgoing → assistant).
 * The latest inbound row is omitted — it matches `currentUserText`.
 */
export async function loadWhatsAppThreadHistory(params: {
  businessId: number;
  contactRawWaId: string;
  contactNormalizedWaId: string;
  currentUserText: string;
}): Promise<ConversationTurn[]> {
  const waIds = [
    ...new Set(
      [params.contactRawWaId, params.contactNormalizedWaId].filter(
        (v): v is string => Boolean(v?.trim())
      )
    ),
  ];
  if (!waIds.length) return [];

  const rowsDesc = await WhatsAppMessage.findAll({
    where: {
      businessId: params.businessId,
      senderWaId: { [Op.in]: waIds },
    },
    order: [["id", "DESC"]],
    limit: MAX_THREAD_MESSAGES_FOR_AI,
    attributes: ["text", "direction"],
  });

  const chronological = [...rowsDesc].reverse();
  const last = chronological[chronological.length - 1];
  const current = params.currentUserText.trim();
  if (last && last.direction === "incoming" && current) {
    const stored = last.text.trim();
    const same =
      stored === current ||
      (stored.startsWith("🎤 ") &&
        stored.slice(2).split(" (")[0]?.trim() === current);
    if (same) chronological.pop();
  }

  type Role = "user" | "assistant";
  const merged: { role: Role; text: string }[] = [];
  for (const row of chronological) {
    const text = row.text.trim();
    if (!text) continue;
    const role: Role = row.direction === "incoming" ? "user" : "assistant";
    const prev = merged[merged.length - 1];
    if (prev && prev.role === role) {
      prev.text = `${prev.text}\n\n${text}`;
    } else {
      merged.push({ role, text });
    }
  }

  while (merged.length > 0 && merged[0].role === "assistant") {
    merged.shift();
  }

  return merged.map(
    (m): ConversationTurn => ({ role: m.role, content: m.text })
  );
}

async function resolveCustomerLanguage(params: {
  apiKey: string;
  userText: string;
  history: ConversationTurn[];
}): Promise<CustomerLanguage> {
  const ai = await detectCustomerLanguageWithAi({
    apiKey: params.apiKey,
    userText: params.userText,
    history: params.history,
  });
  if (ai !== "other") return ai;

  return detectCustomerLanguageLocal({
    userText: params.userText,
    history: params.history,
  });
}

/**
 * Step 1 — parallel initial processing (Promise.allSettled).
 * Incoming message is saved by the webhook/manager before this runs.
 */
export async function loadAiReplyInitialContext(params: {
  business: Business;
  anthropicKey: string;
  contactRawWaId: string;
  contactNormalizedWaId: string;
  userText: string;
}): Promise<AiReplyInitialContext> {
  const { business, anthropicKey, userText } = params;
  const norm = params.contactNormalizedWaId;

  const returningCustomerPromise = fetchCustomerOrderSummaries({
    businessId: business.id,
    customerWaId: norm,
    limit: 1,
  }).then((orders) => ({
    hasOrder: orders.length > 0,
    latestOrder: orders[0] ?? null,
  }));

  const historyPromise = loadWhatsAppThreadHistory({
    businessId: business.id,
    contactRawWaId: params.contactRawWaId,
    contactNormalizedWaId: norm,
    currentUserText: userText,
  });

  const results = await Promise.allSettled([
    fetchBusinessProductsForAi(business.id),
    historyPromise,
    Promise.resolve(mergeAiInstructions(business.aiInstructions)),
    Promise.resolve(effectiveOrderRequirements(business)),
    returningCustomerPromise,
    checkoutSessionRecoveryHint(business.id, norm),
    historyPromise.then((history) =>
      resolveCustomerLanguage({ apiKey: anthropicKey, userText, history })
    ),
  ]);

  const products = settleValue(results[0], [] as Product[]);
  const history = settleValue(results[1], [] as ConversationTurn[]);
  const instructions = settleValue(results[2], mergeAiInstructions(null));
  const checkoutSettings = settleValue(
    results[3],
    effectiveOrderRequirements(business)
  );
  const returningCustomer = settleValue(results[4], {
    hasOrder: false,
    latestOrder: null as CustomerOrderSummary | null,
  });
  const checkoutRecoveryHint = settleValue(results[5], null as string | null);
  const customerLang = settleValue(results[6], "other" as CustomerLanguage);

  const needsDbOrderContext =
    customerAsksAboutExistingOrder(userText) ||
    returningCustomer.latestOrder?.status === "pending";

  let customerOrderSummaries: CustomerOrderSummary[] = [];
  if (needsDbOrderContext || returningCustomer.hasOrder) {
    customerOrderSummaries = await fetchCustomerOrderSummaries({
      businessId: business.id,
      customerWaId: norm,
      limit: 5,
      authoritativeDbContext: needsDbOrderContext,
    });
  }

  return {
    products,
    catalogJson: catalogJsonForAiPrompt(products, business.currency),
    history,
    instructions,
    checkoutSettings,
    checkoutSettingsLabel: checkoutSettingsLabel(checkoutSettings),
    customerLang,
    customerOrderSummaries,
    checkoutRecoveryHint,
    returningCustomer,
    needsDbOrderContext,
  };
}
