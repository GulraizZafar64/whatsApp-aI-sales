import { randomUUID } from "crypto";
import { Op } from "sequelize";
import type { Business } from "@/lib/models";
import { CompletedOrder, CustomerOrderSession } from "@/lib/models";
import {
  getOrderGroupStatus,
  latestPendingOrderGroupId,
  shouldSkipOrderCheckoutForMessage,
  fetchCustomerOrderSummaries,
} from "@/lib/customer-order-status";
import {
  parseOrderRequirements,
  type OrderRequirements,
  type OrderStatus,
} from "@/lib/order-requirements";
import {
  customerCommittedToOrderInThread,
  extractDeliveryAddressFromAssistantText,
  findDeliveryAddressInConversation,
  findProductIdsMentionedInText,
  isOrderModificationMessage,
  isOrderCartReplacementMessage,
  isOrderItemRemovalMessage,
  isOrderUpdateRequest,
  isOrderCartSwapMessage,
  isCustomerOrderUpdateConfirmation,
  extractAddressFromOrderUpdateMessage,
  findLatestAddressForOrderUpdate,
  extractAddressFromCombinedOrderMessage,
  productIdsToSwapOut,
  productIdsToSwapIn,
  looksLikeDeliveryAddress,
  productIdsToRemoveFromOrder,
  quantityForProductInText,
  type WhatsAppConversationStage,
} from "@/lib/whatsapp-catalog-match";
import type { ConversationTurn } from "@/lib/claude-generate";
import { ORDER_JSON_AI_HINT } from "@/lib/claude-generate";
import {
  placeWhatsAppCompletedOrders,
  syncPendingOrderGroup,
  type WhatsAppOrderIntent,
} from "@/lib/whatsapp-place-order";
import { resetCustomerCheckoutSession } from "@/lib/customer-order-session-reset";
import { notifyNewOrUpdatedOrder } from "@/lib/order-management";
import { cancelPendingFollowUps } from "@/lib/whatsapp-follow-up";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-send";

export { resetCustomerCheckoutSession };

const MAX_PROOF_CHARS = 400_000;

const PAYMENT_IMAGE_HINT_RE =
  /\b(payment|paid|pay|screenshot|ss|receipt|transfer|jazz\s*cash|easypaisa|bank|txn|transaction|bhej|bhejo|proof)\b/i;

export type CheckoutCartLine = {
  productId: number;
  quantity: number;
  unitPrice: number;
  lineLabel?: string;
};

export function businessOrderRequirements(
  business: Business
): OrderRequirements {
  return parseOrderRequirements(business.orderRequirements);
}

function truncateProof(dataUrl: string | null | undefined): string | null {
  if (!dataUrl?.trim()) return null;
  const t = dataUrl.trim();
  if (t.length <= MAX_PROOF_CHARS) return t;
  return t.slice(0, MAX_PROOF_CHARS);
}

function parseCart(raw: string | null): CheckoutCartLine[] {
  if (!raw?.trim()) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    const out: CheckoutCartLine[] = [];
    for (const item of v) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const productId = Number(o.productId);
      const quantity = Math.max(1, Math.floor(Number(o.quantity) || 1));
      const unitPrice = Number(o.unitPrice);
      if (
        Number.isFinite(productId) &&
        productId > 0 &&
        Number.isFinite(unitPrice) &&
        unitPrice >= 0
      ) {
        const lineLabel =
          typeof o.lineLabel === "string"
            ? o.lineLabel.trim().slice(0, 80)
            : typeof o.size === "string"
              ? o.size.trim().slice(0, 80)
              : undefined;
        out.push({
          productId,
          quantity,
          unitPrice,
          lineLabel: lineLabel || undefined,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function serializeCart(lines: CheckoutCartLine[]): string {
  return JSON.stringify(lines);
}

type CatalogLine = { id: number; productName: string };

function mergeCartForModification(
  base: CheckoutCartLine[],
  userText: string,
  products: CatalogLine[],
  incoming: CheckoutCartLine[],
  defaultUnitPrice: (productId: number) => number
): CheckoutCartLine[] {
  const map = new Map<number, CheckoutCartLine>();
  for (const line of base) {
    map.set(line.productId, { ...line });
  }

  const lower = userText.trim().toLowerCase();
  const isAdd = isOrderModificationMessage(userText);

  if (isAdd) {
    const ids = findProductIdsMentionedInText(userText, products);
    for (const productId of ids) {
      const p = products.find((x) => x.id === productId);
      const parsedQty = p ? quantityForProductInText(lower, p.productName) : 1;
      const increment = /\bmore\b/i.test(lower) ? Math.max(1, parsedQty) : parsedQty;
      const prev = map.get(productId);
      const fromIn = incoming.find((i) => i.productId === productId);
      if (prev) {
        map.set(productId, {
          productId,
          quantity: prev.quantity + increment,
          unitPrice: fromIn && fromIn.unitPrice > 0 ? fromIn.unitPrice : prev.unitPrice,
        });
      } else {
        map.set(productId, {
          productId,
          quantity: fromIn?.quantity ?? parsedQty,
          unitPrice: (fromIn && fromIn.unitPrice > 0 ? fromIn.unitPrice : defaultUnitPrice(productId)) ?? 0,
        });
      }
    }
  }

  for (const line of incoming) {
    const prev = map.get(line.productId);
    if (!prev) {
      map.set(line.productId, { ...line });
      continue;
    }
    map.set(line.productId, {
      productId: line.productId,
      quantity: Math.max(prev.quantity, line.quantity),
      unitPrice: line.unitPrice > 0 ? line.unitPrice : prev.unitPrice,
    });
  }

  return [...map.values()];
}

function mergeCart(
  existing: CheckoutCartLine[],
  incoming: CheckoutCartLine[]
): CheckoutCartLine[] {
  const map = new Map<number, CheckoutCartLine>();
  for (const line of existing) {
    map.set(line.productId, { ...line });
  }
  for (const line of incoming) {
    const prev = map.get(line.productId);
    if (!prev || line.quantity > prev.quantity) {
      map.set(line.productId, line);
    } else if (line.unitPrice > 0) {
      map.set(line.productId, { ...prev, unitPrice: line.unitPrice });
    }
  }
  return [...map.values()];
}

export function checkoutRequirementsMet(
  session: {
    committed: boolean;
    deliveryAddress: string | null;
    deliveryPaymentProof: string | null;
    orderPaymentProof: string | null;
  },
  cart: CheckoutCartLine[],
  req: OrderRequirements
): boolean {
  if (!session.committed || cart.length === 0) return false;
  if (req.requireAddress && !session.deliveryAddress?.trim()) return false;
  if (req.requireDeliveryCharges && !session.deliveryPaymentProof?.trim()) return false;
  if (req.requireOrderPayment && !session.orderPaymentProof?.trim()) return false;
  return true;
}

export function orderRequirementsSystemHint(req: OrderRequirements): string {
  const parts: string[] = [
    "ORDER CHECKOUT (owner settings — mandatory):",
    "- Only treat checkout as started when the customer clearly says they want to ORDER / confirm / buy (not just asking price).",
    "- If they already have a PENDING order and say add / one more / extra (e.g. add 1 more pant), update that same order with new quantities using [[ORDER:…]] or [[ORDERS:…]] — do NOT start a new order.",
    "- If their last order is already ACCEPTED or DISPATCHED, a new order is a separate checkout.",
    "- ORDER UPDATE (pending only): Show current order, ask what to change. Collect ALL details (size, qty, address). Do NOT save until customer confirms (yes/ok/theek hai). Then emit [[ORDER_JSON:…]] with the FINAL cart only (swap = replace old item, not add both) and [[ORDER_UPDATE_CONFIRMED]] on the last line.",
    "- SWAP: 'shirt ki jaga shoes' means REPLACE shirt with shoes — final order must have shoes only, not shirt + shoes.",
    "- If status is ACCEPTED, DISPATCHED, COMPLETE, CANCELLED, or REJECTED — do NOT update that order. Tell status and offer a NEW order.",
    "- STATUS ONLY: If customer only asks order status / mera order kya hua — answer status only. Never use [[ORDER:…]] or [[ORDERS:…]].",
  ];
  if (req.requireAddress) {
    parts.push(
      "- Ask for full delivery address before the order is logged. Do NOT use [[ORDER:…]] until address is received."
    );
  }
  if (req.requireDeliveryCharges) {
    const amt = req.deliveryChargeAmount?.trim();
    parts.push(
      amt
        ? `- After address (if needed), ask them to pay delivery charges (${amt}) and send a payment screenshot.`
        : "- After address (if needed), ask them to pay delivery charges and send a payment screenshot."
    );
  }
  if (req.requireOrderPayment) {
    parts.push(
      "- Ask for order payment and a payment screenshot before the order is finalized in the dashboard."
    );
  }
  if (!req.requireAddress && !req.requireDeliveryCharges && !req.requireOrderPayment) {
    parts.push("- When the customer commits to order, confirm items and use [[ORDER:…]] or [[ORDERS:…]].");
  } else {
    parts.push("- Until all required steps above are done, do NOT say the order is in the dashboard. End with [[PRODUCT_IDS:]] only.");
  }
  parts.push(ORDER_JSON_AI_HINT);
  return parts.join("\n");
}

/**
 * Align checkout session with the database (e.g. owner edited address in dashboard).
 * Call before AI replies about order status / update / address.
 */
export async function syncSessionFromDbOrders(
  businessId: number,
  customerWaId: string
): Promise<void> {
  const pendingGroupId = await latestPendingOrderGroupId(businessId, customerWaId);
  const [session] = await CustomerOrderSession.findOrCreate({
    where: { businessId, customerWaId },
    defaults: { businessId, customerWaId, committed: false },
  });

  if (pendingGroupId) {
    const dbAddress = await loadPendingDeliveryNote(businessId, pendingGroupId);
    const dbCart = await loadPendingCartFromDb(
      businessId,
      customerWaId,
      pendingGroupId
    );
    const patch: Record<string, unknown> = {};
    if (dbAddress && dbAddress !== session.deliveryAddress?.trim()) {
      patch.deliveryAddress = dbAddress;
    }
    if (dbCart.length) {
      patch.cartJson = serializeCart(dbCart);
      patch.orderGroupId = pendingGroupId;
      if (!session.placedAt) patch.placedAt = new Date();
    }
    if (Object.keys(patch).length > 0) {
      await session.update(patch);
      console.log("[order-checkout] session synced from DB pending order", pendingGroupId);
    }
    return;
  }

  const orders = await fetchCustomerOrderSummaries({
    businessId,
    customerWaId,
    limit: 1,
    authoritativeDbContext: true,
  });
  const addr = orders[0]?.deliveryNote?.trim();
  if (addr && addr !== session.deliveryAddress?.trim()) {
    await session.update({ deliveryAddress: addr });
    console.log("[order-checkout] session address synced from latest DB order");
  }
}

async function getOrCreateSession(
  businessId: number,
  customerWaId: string
): Promise<CustomerOrderSession> {
  /** Persisted in MySQL — survives server restarts (cartJson, deliveryAddress, etc.). */
  const [session] = await CustomerOrderSession.findOrCreate({
    where: { businessId, customerWaId },
    defaults: { businessId, customerWaId, committed: false },
  });
  return session;
}

/** Hint for AI when customer has a saved in-progress checkout after restart. */
export async function checkoutSessionRecoveryHint(
  businessId: number,
  customerWaId: string
): Promise<string | null> {
  const session = await CustomerOrderSession.findOne({
    where: { businessId, customerWaId },
  });
  if (!session || session.placedAt) return null;

  const cart = parseCart(session.cartJson);
  const address = session.deliveryAddress?.trim();
  if (!session.committed && cart.length === 0 && !address) return null;

  const parts = [
    "CHECKOUT SESSION (saved in database — continue this checkout, do not start over unless customer asks):",
  ];
  if (cart.length) {
    parts.push(
      `- Cart product IDs: ${cart.map((c) => `${c.productId}×${c.quantity}`).join(", ")}`
    );
  }
  if (address) {
    parts.push(`- Delivery address on file: ${address.slice(0, 200)}`);
  }
  if (session.committed) {
    parts.push("- Customer already committed to order — collect any missing requirements only.");
  }
  return parts.join("\n");
}

async function resetCheckoutSession(session: CustomerOrderSession): Promise<void> {
  await resetCustomerCheckoutSession({
    businessId: session.businessId,
    customerWaId: session.customerWaId,
  });
}

async function latestCustomerOrderStatus(
  businessId: number,
  customerWaId: string
): Promise<string | null> {
  const row = await CompletedOrder.findOne({
    where: { businessId, customerWaId, status: { [Op.ne]: "deleted" } },
    order: [["id", "DESC"]],
    attributes: ["status"],
  });
  return row?.status?.trim() ?? null;
}

async function loadPendingCartFromDb(
  businessId: number,
  customerWaId: string,
  orderGroupId: string
): Promise<CheckoutCartLine[]> {
  const rows = await CompletedOrder.findAll({
    where: { businessId, customerWaId, orderGroupId, status: "pending" },
  });
  return rows
    .filter((r) => r.productId != null)
    .map((r) => ({
      productId: r.productId as number,
      quantity: r.quantitySold,
      unitPrice: Number.parseFloat(String(r.unitPrice)) || 0,
    }));
}

function intentsToCart(intents: WhatsAppOrderIntent[]): CheckoutCartLine[] {
  return intents.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    lineLabel: i.lineLabel,
  }));
}

function cartToIntents(
  cart: CheckoutCartLine[],
  deliveryNote: string | null
): WhatsAppOrderIntent[] {
  return cart.map((c) => ({
    productId: c.productId,
    quantity: c.quantity,
    unitPrice: c.unitPrice,
    lineLabel: c.lineLabel,
    deliveryNote: deliveryNote ?? undefined,
  }));
}

function looksLikePaymentScreenshotMessage(userText: string): boolean {
  const t = userText.trim();
  if (!t || t === "[Image]") return true;
  if (PAYMENT_IMAGE_HINT_RE.test(t)) return true;
  return false;
}

/**
 * Only count commit from current message / recent history — not entire thread.
 * Prevents old "i want to order" from re-triggering after placement.
 */
function customerCommittedThisTurnOnly(params: {
  stage: WhatsAppConversationStage;
  userText: string;
  history: ConversationTurn[];
  alreadyPlaced: boolean;
}): boolean {
  if (params.alreadyPlaced) {
    return params.stage === "order_just_confirmed";
  }
  if (params.stage === "order_just_confirmed") return true;
  return customerCommittedToOrderInThread(
    params.history.slice(-6),
    params.userText
  );
}

async function loadPendingDeliveryNote(
  businessId: number,
  orderGroupId: string
): Promise<string> {
  const row = await CompletedOrder.findOne({
    where: { businessId, orderGroupId, status: "pending" },
    attributes: ["deliveryNote"],
  });
  return row?.deliveryNote?.trim() ?? "";
}

function resolveDeliveryAddressForCheckout(params: {
  userText: string;
  history: ConversationTurn[];
  assistantVisibleText?: string;
  sessionAddress: string | null;
  requireAddress: boolean;
  assistantAskedForAddress: boolean;
  pendingOrderUpdate?: boolean;
}): string | null {
  const { requireAddress, assistantAskedForAddress, pendingOrderUpdate } = params;

  if (pendingOrderUpdate) {
    const fromUpdateMsg = extractAddressFromOrderUpdateMessage(params.userText);
    if (fromUpdateMsg) return fromUpdateMsg;

    if (
      looksLikeDeliveryAddress(params.userText, { assistantAskedForAddress: true })
    ) {
      return params.userText.trim().slice(0, 2000);
    }

    const fromThread = findLatestAddressForOrderUpdate(
      params.history,
      params.userText
    );
    if (fromThread) return fromThread;

    if (params.assistantVisibleText) {
      const fromAi = extractDeliveryAddressFromAssistantText(
        params.assistantVisibleText
      );
      if (fromAi) return fromAi;
    }
  }

  const fromUpdateMsg = extractAddressFromOrderUpdateMessage(params.userText);
  if (fromUpdateMsg) {
    return fromUpdateMsg;
  }

  const fromCombined = extractAddressFromCombinedOrderMessage(params.userText);
  if (fromCombined) {
    return fromCombined;
  }

  const storedSessionAddress = params.sessionAddress?.trim();
  if (storedSessionAddress) {
    if (
      looksLikeDeliveryAddress(storedSessionAddress, {
        assistantAskedForAddress,
      })
    ) {
      return storedSessionAddress.slice(0, 2000);
    }
  }

  if (!requireAddress) {
    return (
      (storedSessionAddress &&
      looksLikeDeliveryAddress(storedSessionAddress, {
        assistantAskedForAddress,
      })
        ? storedSessionAddress.slice(0, 2000)
        : null) ||
      findDeliveryAddressInConversation(params.history, params.userText, assistantAskedForAddress) ||
      (params.assistantVisibleText ? extractDeliveryAddressFromAssistantText(params.assistantVisibleText) : null) ||
      (looksLikeDeliveryAddress(params.userText, { assistantAskedForAddress })
        ? params.userText.trim().slice(0, 2000)
        : null) ||
      null
    );
  }

  if (looksLikeDeliveryAddress(params.userText, { assistantAskedForAddress })) {
    return params.userText.trim().slice(0, 2000);
  }

  if (pendingOrderUpdate && params.userText.trim().length >= 8) {
    const tail = params.userText.trim();
    if (
      /\b(?:karachi|lahore|islamabad|faisalabad|rawalpindi|multan|peshawar|korangi|colony|town|block|phase|sector)\b/i.test(
        tail
      )
    ) {
      const afterOr = /\b(?:or|aur)\s+(?:address\s+)?(?:bi\s+)?(?:change\s+)?(?:kr\s*do|kar\s*do)?\s*(.+)$/i.exec(
        tail
      );
      if (afterOr?.[1]?.trim() && afterOr[1].trim().length >= 6) {
        return afterOr[1].trim().slice(0, 2000);
      }
    }
  }

  if (assistantAskedForAddress) {
    const fromThread = findDeliveryAddressInConversation(
      params.history,
      params.userText,
      assistantAskedForAddress
    );
    if (fromThread) return fromThread;
  }

  if (params.assistantVisibleText) {
    const fromAi = extractDeliveryAddressFromAssistantText(params.assistantVisibleText);
    if (fromAi) return fromAi;
  }

  return null;
}

export async function handleOrderCheckoutTurn(params: {
  business: Business;
  customerWaId: string;
  contactRawWaId: string;
  whatsappChatId?: string;
  userText: string;
  history: ConversationTurn[];
  stage: WhatsAppConversationStage;
  orderIntents: WhatsAppOrderIntent[];
  threadCart?: CheckoutCartLine[];
  products?: CatalogLine[];
  defaultUnitPrice?: (productId: number) => number;
  assistantVisibleText?: string;
  assistantAskedForAddress?: boolean;
  customerImageDataUrl?: string;
  webImageBuffer?: Buffer;
  webImageMime?: string;
  /**
   * True only when the AI emitted [[ORDER_UPDATE_CONFIRMED]] in its reply —
   * meaning the customer has seen the existing order, specified the change,
   * and explicitly confirmed it. Only then do we write the update to DB.
   */
  orderUpdateConfirmed?: boolean;
  /** Authoritative address from [[ORDER_JSON:…]] — overrides chat heuristics. */
  aiStructuredAddress?: string | null;
}): Promise<{ placed: boolean; orderGroupId?: string; updated?: boolean }> {
  if (shouldSkipOrderCheckoutForMessage(params.userText)) {
    return { placed: false };
  }

  const customerConfirmedUpdate = isCustomerOrderUpdateConfirmation(params.userText);
  const updateConfirmed =
    params.orderUpdateConfirmed === true || customerConfirmedUpdate;

  const req = businessOrderRequirements(params.business);
  const session = await getOrCreateSession(params.business.id, params.customerWaId);

  let cart = parseCart(session.cartJson);
  const alreadyPlaced = Boolean(session.placedAt);

  const isUpdateRequest = isOrderUpdateRequest(params.userText);
  const isModification = isOrderModificationMessage(params.userText);
  const isItemRemoval = isOrderItemRemovalMessage(params.userText);

  let orderIntents = params.orderIntents;
  if (
    isUpdateRequest &&
    !updateConfirmed &&
    !isModification &&
    !isItemRemoval
  ) {
    orderIntents = [];
  }

  const userCommittedThisTurn = customerCommittedThisTurnOnly({
    stage: params.stage,
    userText: params.userText,
    history: params.history,
    alreadyPlaced,
  });

  let hasModelOrderLines = orderIntents.length > 0;

  const startingNewOrder = userCommittedThisTurn || hasModelOrderLines || isModification;

  let sessionGroupId = session.orderGroupId?.trim() || null;
  let sessionGroupStatus: OrderStatus | null = null;
  if (sessionGroupId) {
    sessionGroupStatus = await getOrderGroupStatus(
      params.business.id,
      params.customerWaId,
      sessionGroupId
    );
  }

  const lastStatus = await latestCustomerOrderStatus(params.business.id, params.customerWaId);
  const sessionGroupNotPending = sessionGroupStatus != null && sessionGroupStatus !== "pending";

  if (session.placedAt && startingNewOrder && sessionGroupNotPending) {
    const prevGroupStatus = sessionGroupStatus;
    await resetCheckoutSession(session);
    cart = [];
    sessionGroupId = null;
    sessionGroupStatus = null;
    console.log("[order-checkout] new checkout — previous group was", prevGroupStatus ?? lastStatus);
  } else if (
    session.placedAt &&
    startingNewOrder &&
    !sessionGroupId &&
    lastStatus &&
    lastStatus !== "pending"
  ) {
    await resetCheckoutSession(session);
    cart = [];
    sessionGroupId = null;
    sessionGroupStatus = null;
    console.log("[order-checkout] new order after", lastStatus);
  } else if (session.placedAt && sessionGroupId) {
    const groupStatus =
      sessionGroupStatus ??
      (await getOrderGroupStatus(params.business.id, params.customerWaId, sessionGroupId));
    if (groupStatus === "pending") {
      const existing = await CompletedOrder.count({
        where: {
          businessId: params.business.id,
          customerWaId: params.customerWaId,
          orderGroupId: sessionGroupId,
          status: "pending",
        },
      });
      if (existing > 0 && !startingNewOrder && !updateConfirmed) {
        return { placed: false };
      }
    } else if (!startingNewOrder) {
      return { placed: false };
    }
  }

  if (userCommittedThisTurn || hasModelOrderLines) {
    await session.update({ committed: true });
    session.committed = true;
  }

  let pendingGroupId = session.orderGroupId?.trim() || null;
  let pendingGroupStatus: OrderStatus | null = null;
  if (pendingGroupId) {
    pendingGroupStatus = await getOrderGroupStatus(
      params.business.id,
      params.customerWaId,
      pendingGroupId
    );
  } else if (session.placedAt) {
    pendingGroupId = await latestPendingOrderGroupId(params.business.id, params.customerWaId);
    if (pendingGroupId) {
      pendingGroupStatus = await getOrderGroupStatus(
        params.business.id,
        params.customerWaId,
        pendingGroupId
      );
      if (pendingGroupStatus === "pending" && !session.orderGroupId) {
        await session.update({ orderGroupId: pendingGroupId });
        session.orderGroupId = pendingGroupId;
      }
    }
  }

  const existingPendingOrder =
    Boolean(session.placedAt && pendingGroupId && pendingGroupStatus === "pending");

  if (
    existingPendingOrder &&
    hasModelOrderLines &&
    !updateConfirmed &&
    !isModification &&
    !isItemRemoval
  ) {
    orderIntents = [];
    hasModelOrderLines = false;
  }

  const assistantAskedEarly =
    params.assistantAskedForAddress ??
    params.history.some((h) => {
      if (h.role !== "assistant") return false;
      const text =
        typeof h.content === "string"
          ? h.content
          : h.content.filter((b) => b.type === "text").map((b) => ("text" in b ? b.text : "")).join("\n");
      return /\b(address|delivery address|where (?:should|to) deliver)\b/i.test(text);
    });

  const resolvedAddressEarly = resolveDeliveryAddressForCheckout({
    userText: params.userText,
    history: params.history,
    assistantVisibleText: params.assistantVisibleText,
    sessionAddress: session.deliveryAddress,
    requireAddress: req.requireAddress,
    assistantAskedForAddress: assistantAskedEarly,
    pendingOrderUpdate: existingPendingOrder,
  });

  const dbDeliveryNote =
    pendingGroupId && pendingGroupStatus === "pending"
      ? await loadPendingDeliveryNote(params.business.id, pendingGroupId)
      : "";

  if (
    dbDeliveryNote &&
    pendingGroupStatus === "pending" &&
    session.deliveryAddress?.trim() !== dbDeliveryNote
  ) {
    await session.update({ deliveryAddress: dbDeliveryNote });
    session.deliveryAddress = dbDeliveryNote;
  }

  const structuredAddress = params.aiStructuredAddress?.trim() || null;

  const effectiveAddress =
    structuredAddress ||
    resolvedAddressEarly?.trim() ||
    (existingPendingOrder && dbDeliveryNote ? dbDeliveryNote : "") ||
    session.deliveryAddress?.trim() ||
    extractDeliveryAddressFromAssistantText(params.assistantVisibleText ?? "") ||
    "";

  const previousAddress = session.deliveryAddress?.trim() || "";
  if (effectiveAddress && effectiveAddress !== previousAddress) {
    await session.update({ deliveryAddress: effectiveAddress });
    session.deliveryAddress = effectiveAddress;
  }

  const addressChanged = Boolean(
    effectiveAddress && effectiveAddress !== dbDeliveryNote
  );

  if (session.placedAt && pendingGroupId && pendingGroupStatus === "pending") {
    const dbCart = await loadPendingCartFromDb(
      params.business.id,
      params.customerWaId,
      pendingGroupId
    );
    if (!hasModelOrderLines) {
      cart = mergeCart(dbCart, cart);
    }
  }

  if (hasModelOrderLines) {
    cart = intentsToCart(orderIntents);
  } else if (
    isOrderCartReplacementMessage(params.userText) &&
    params.products?.length &&
    params.defaultUnitPrice &&
    (!existingPendingOrder || updateConfirmed)
  ) {
    let ids = isOrderCartSwapMessage(params.userText)
      ? productIdsToSwapIn(params.userText, params.products)
      : findProductIdsMentionedInText(params.userText, params.products);
    if (ids.length > 0) {
      const lower = params.userText.toLowerCase();
      cart = ids.map((productId) => {
        const product = params.products!.find((p) => p.id === productId);
        return {
          productId,
          quantity: product
            ? quantityForProductInText(lower, product.productName)
            : 1,
          unitPrice: params.defaultUnitPrice!(productId),
        };
      });
    }
  } else if (
    params.threadCart?.length &&
    !shouldSkipOrderCheckoutForMessage(params.userText) &&
    !hasModelOrderLines
  ) {
    cart = mergeCart(cart, params.threadCart);
  }

  if (isModification && params.products?.length && params.defaultUnitPrice) {
    cart = mergeCartForModification(
      cart,
      params.userText,
      params.products,
      mergeCart([], intentsToCart(orderIntents)),
      params.defaultUnitPrice
    );
    if (params.threadCart?.length) {
      cart = mergeCartForModification(
        cart,
        params.userText,
        params.products,
        params.threadCart,
        params.defaultUnitPrice
      );
    }
  }

  if (isItemRemoval && params.products?.length) {
    const removeIds = productIdsToRemoveFromOrder(params.userText, params.products);
    if (removeIds.length) {
      cart = cart.filter((line) => !removeIds.includes(line.productId));
      console.log("[order-checkout] removed items from cart", removeIds);
    }
  }

  const cartJson = serializeCart(cart);
  if (cart.length > 0 && cartJson !== (session.cartJson ?? "")) {
    await session.update({ cartJson });
    session.cartJson = cartJson;
  }

  /**
   * Sync pending order in DB only when:
   * - Adding items (isModification) OR model emitted [[ORDER:]] (hasModelOrderLines)
   * - AND for update/change requests: ONLY when orderUpdateConfirmed=true
   *   (meaning the customer saw the existing order, stated the change, and confirmed)
   *
   * "update my order" alone (isUpdateRequest) never triggers DB write —
   * it only starts the 2-step conversation.
   */
  if (
    session.placedAt &&
    pendingGroupId &&
    pendingGroupStatus === "pending" &&
    (cart.length > 0 || effectiveAddress)
  ) {
    const canSyncCartChange =
      isModification ||
      isItemRemoval ||
      (hasModelOrderLines && updateConfirmed);

    const canSyncAddressOnly = updateConfirmed && addressChanged;

    if (canSyncCartChange || canSyncAddressOnly) {
      if (canSyncAddressOnly && !canSyncCartChange && cart.length === 0) {
        cart = await loadPendingCartFromDb(
          params.business.id,
          params.customerWaId,
          pendingGroupId
        );
      }

      const deliveryNote =
        effectiveAddress ||
        session.deliveryAddress?.trim() ||
        dbDeliveryNote ||
        null;

      if (!cart.length && !canSyncAddressOnly) {
        return { placed: false };
      }

      let didUpdate = false;

      if (cart.length > 0 && canSyncCartChange) {
        const intents = cartToIntents(cart, deliveryNote);
        const synced = await syncPendingOrderGroup({
          businessId: params.business.id,
          customerWaId: params.customerWaId,
          orderGroupId: pendingGroupId,
          intents,
          deliveryNote,
        });
        if (synced.updated > 0 || synced.created > 0) {
          console.log("[order-checkout] pending order updated", pendingGroupId, synced);
          didUpdate = true;
        }
      }

      if (addressChanged && deliveryNote && deliveryNote !== dbDeliveryNote) {
        const [affected] = await CompletedOrder.update(
          { deliveryNote },
          {
            where: {
              businessId: params.business.id,
              orderGroupId: pendingGroupId,
              status: "pending",
            },
          }
        );
        if (affected > 0) {
          console.log(
            "[order-checkout] pending order address updated",
            pendingGroupId,
            deliveryNote.slice(0, 80)
          );
          didUpdate = true;
        }
      }

      if (didUpdate) {
        await notifyNewOrUpdatedOrder({
          businessId: params.business.id,
          orderGroupId: pendingGroupId,
          actionType: "order_updated",
          customerWaId: params.customerWaId,
          contactRawWaId: params.contactRawWaId,
          whatsappChatId: params.whatsappChatId,
        });
        return { placed: true, updated: true, orderGroupId: pendingGroupId };
      }
      return { placed: false };
    }

    if (isUpdateRequest || isOrderCartSwapMessage(params.userText)) {
      console.log("[order-checkout] update/swap — waiting for customer confirmation", {
        updateConfirmed,
        hasModelOrderLines,
        cartLines: cart.length,
      });
    }
    return { placed: false };
  }

  if (
    pendingGroupStatus &&
    pendingGroupStatus !== "pending" &&
    (isModification || hasModelOrderLines)
  ) {
    await resetCheckoutSession(session);
    cart = parseCart(session.cartJson);
    if (isModification && params.products?.length && params.defaultUnitPrice) {
      cart = mergeCartForModification(
        [],
        params.userText,
        params.products,
        mergeCart([], intentsToCart(orderIntents)),
        params.defaultUnitPrice
      );
      if (params.threadCart?.length) {
        cart = mergeCartForModification(
          cart,
          params.userText,
          params.products,
          params.threadCart,
          params.defaultUnitPrice
        );
      }
    } else if (hasModelOrderLines) {
      cart = mergeCart(cart, intentsToCart(orderIntents));
    }
    pendingGroupId = null;
    pendingGroupStatus = null;
  }

  const assistantAsked =
    params.assistantAskedForAddress ??
    params.history.some((h) => {
      if (h.role !== "assistant") return false;
      const text =
        typeof h.content === "string"
          ? h.content
          : h.content.filter((b) => b.type === "text").map((b) => ("text" in b ? b.text : "")).join("\n");
      return /\b(address|delivery address|where (?:should|to) deliver)\b/i.test(text);
    });

  if (req.requireAddress && session.deliveryAddress?.trim()) {
    const storedValid = looksLikeDeliveryAddress(session.deliveryAddress, {
      assistantAskedForAddress: assistantAsked,
    });
    if (!storedValid) {
      await session.update({ deliveryAddress: null });
      session.deliveryAddress = null;
    }
  }

  const resolvedAddress = resolveDeliveryAddressForCheckout({
    userText: params.userText,
    history: params.history,
    assistantVisibleText: params.assistantVisibleText,
    sessionAddress: session.deliveryAddress,
    requireAddress: req.requireAddress,
    assistantAskedForAddress: assistantAsked,
  });

  const effectiveResolvedAddress =
    structuredAddress || resolvedAddress?.trim() || null;

  if (effectiveResolvedAddress && req.requireAddress) {
    await session.update({ deliveryAddress: effectiveResolvedAddress });
    session.deliveryAddress = effectiveResolvedAddress;
  } else if (effectiveResolvedAddress && !req.requireAddress) {
    await session.update({ deliveryAddress: effectiveResolvedAddress });
    session.deliveryAddress = effectiveResolvedAddress;
  }

  let imageDataUrl = params.customerImageDataUrl;
  if (!imageDataUrl && params.webImageBuffer?.length) {
    const mime = params.webImageMime?.trim() || "image/jpeg";
    imageDataUrl = `data:${mime};base64,${params.webImageBuffer.toString("base64")}`;
  }

  if (imageDataUrl && session.committed) {
    const proof = truncateProof(imageDataUrl);
    const paymentish = looksLikePaymentScreenshotMessage(params.userText);
    if (paymentish) {
      if (req.requireDeliveryCharges && !session.deliveryPaymentProof?.trim()) {
        await session.update({ deliveryPaymentProof: proof });
        session.deliveryPaymentProof = proof;
      } else if (req.requireOrderPayment && !session.orderPaymentProof?.trim()) {
        await session.update({ orderPaymentProof: proof });
        session.orderPaymentProof = proof;
      } else if (!req.requireDeliveryCharges && !req.requireOrderPayment) {
        // Non-payment image — no proof slot
      } else if (req.requireOrderPayment && session.deliveryPaymentProof?.trim()) {
        await session.update({ orderPaymentProof: proof });
        session.orderPaymentProof = proof;
      }
    }
  }

  const readyByRequirements = checkoutRequirementsMet(session, cart, req);
  const readyWithModelFooter =
    hasModelOrderLines &&
    cart.length > 0 &&
    session.committed &&
    (!req.requireAddress || Boolean(session.deliveryAddress?.trim()));

  if (!readyByRequirements && !readyWithModelFooter) return { placed: false };

  if (req.requireAddress && !session.deliveryAddress?.trim()) {
    console.log("[order-checkout] address required but not yet received — holding order");
    return { placed: false };
  }

  const deliveryNote =
    structuredAddress ||
    session.deliveryAddress?.trim() ||
    effectiveResolvedAddress ||
    (req.requireAddress ? null : params.userText.trim().slice(0, 2000)) ||
    null;

  const orderGroupId = randomUUID();
  const intents = cartToIntents(cart, deliveryNote);
  const orderPaymentProof = session.orderPaymentProof;
  const deliveryPaymentProof = session.deliveryPaymentProof;

  const placed = await placeWhatsAppCompletedOrders({
    businessId: params.business.id,
    customerWaId: params.customerWaId,
    deliveryNote: deliveryNote ?? undefined,
    intents,
    status: "pending",
    orderGroupId,
    orderPaymentProof,
    deliveryPaymentProof,
  });

  if (placed.createdCount === 0 && placed.duplicateCount === 0) return { placed: false };

  await session.update({
    placedAt: new Date(),
    orderGroupId,
    cartJson: serializeCart(cart),
  });

  await cancelPendingFollowUps({
    businessId: params.business.id,
    customerWaId: params.customerWaId,
  });

  const customerPlacedMessage =
    req.requireOrderPayment || req.requireDeliveryCharges
      ? "Your order is placed. The business owner will check your details — if everything is valid, your order will be sent to you."
      : "Your order was submitted successfully. The business owner will confirm shortly.";

  await notifyNewOrUpdatedOrder({
    businessId: params.business.id,
    orderGroupId,
    actionType: "order_created",
    customerWaId: params.customerWaId,
    contactRawWaId: params.contactRawWaId,
    whatsappChatId: params.whatsappChatId,
    customerMessage: customerPlacedMessage,
  });

  return { placed: true, orderGroupId };
}

export async function sendOrderAcceptedMessage(params: {
  businessId: number;
  contactRawWaId: string;
}): Promise<void> {
  await sendWhatsAppTextMessage({
    businessId: params.businessId,
    toWaId: params.contactRawWaId,
    body: "Your order is accepted.",
  });
}

export async function sendOrderDispatchedMessage(params: {
  businessId: number;
  contactRawWaId: string;
}): Promise<void> {
  await sendWhatsAppTextMessage({
    businessId: params.businessId,
    toWaId: params.contactRawWaId,
    body: "Your order has been dispatched and is on the way.",
  });
}