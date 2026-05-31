import type { ConversationTurn } from "@/lib/claude-generate";

type CatalogProduct = { id: number; productName: string };

export type WhatsAppConversationStage =
  | "default"
  | "order_just_confirmed"
  | "delivery_address_received"
  | "post_purchase_close";

const USER_CLOSING_RE =
  /\b(bye|goodbye|thanks|thank you|that's all|that is all|i'?m done|all done|see you|no more|nothing else|ok thanks|thank u)\b/i;

const USER_ORDER_COMMIT_RE =
  /\b(confirm|confirmed|i(?:'ll| will) (?:take|buy)|order(?:ed)?|send it|place(?:d)? (?:the )?order|yes please|paid|delivery address)\b/i;

const CATALOG_BROWSE_RE =
  /\b(catalog|what do you (?:have|sell)|show me|your products?|menu|options|available items?|list (?:of )?products)\b/i;

const DISCOUNT_ASK_RE =
  /\b(discount|cheaper|cheaper price|lower price|reduce|less|best price|better price|too expensive|too much|too high|can you do|bargain(?:ing)?|negotiat(?:e|ing)?|lowest(?:\s+price)?|final\s+price|last\s+price|best\s+offer|any\s+deal|price\s+drop|make\s+it\s+\d|kam\s+kar|sasta)\b/gi;

const BARGAIN_COUNTER_OFFER_RE =
  /^(?:\s*(?:rs\.?|pkr|usd|\$|€|dh|aed)\s*)?\d{2,7}(?:[.,]\d{1,2})?\s*(?:rs\.?|pkr|usd|\$|€|dh|aed)?\s*\??\s*$|^(?:can\s+you\s+)?(?:do|give|make)\s*(?:it\s+)?(?:for\s+)?\d{2,7}/i;

const ADDRESS_ASK_RE =
  /\b(address|delivery address|where (?:should|to) (?:we )?deliver|shipping address|send (?:it )?to|deliver to)\b/i;

const PHOTO_ASK_RE =
  /\b(?:photo|photos|picture|pictures|image|images|pic|pics|send (?:me )?(?:the )?(?:a )?photo|show (?:me )?(?:the )?(?:a )?photo|see (?:the )?product)\b/i;

function tokenAppearsInText(token: string, textLower: string): boolean {
  if (token.length < 3) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(
    textLower
  );
}

function wordsFromText(textLower: string): string[] {
  return textLower.match(/\b[a-z]{3,}\b/g) ?? [];
}

/** Allow small typos (bryani → biryani) when matching product tokens. */
function tokenMatchesWordFuzzy(token: string, word: string): boolean {
  if (token.length < 4 || word.length < 4) return token === word;
  if (token === word) return true;
  if (word.includes(token) || token.includes(word)) return true;
  const maxDist = token.length >= 6 || word.length >= 6 ? 2 : 1;
  return levenshtein(token, word) <= maxDist;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const cur = Math.min(
        row[j]! + 1,
        row[j - 1]! + 1,
        prev + cost
      );
      prev = row[j]!;
      row[j] = cur;
    }
  }
  return row[n]!;
}

/** Product IDs whose names appear in `text` (longest names first). */
export function findProductIdsMentionedInText(
  text: string,
  products: CatalogProduct[]
): number[] {
  const t = text.toLowerCase();
  const ranked = [...products]
    .map((p) => ({
      id: p.id,
      name: p.productName.trim().toLowerCase(),
    }))
    .filter((p) => p.name.length >= 2)
    .sort((a, b) => b.name.length - a.name.length);

  const matched: number[] = [];
  for (const p of ranked) {
    if (t.includes(p.name)) {
      matched.push(p.id);
      continue;
    }
    const tokens = p.name.split(/[\s\-_/]+/).filter((w) => w.length >= 3);
    const words = wordsFromText(t);
    if (
      tokens.some(
        (w) =>
          tokenAppearsInText(w, t) ||
          words.some((word) => tokenMatchesWordFuzzy(w, word))
      )
    ) {
      matched.push(p.id);
    }
  }
  return [...new Set(matched)];
}

/** Product ids the customer asked to see in a photo request (current message only). */
export function productIdsFromPhotoRequest(
  userText: string,
  products: CatalogProduct[]
): number[] {
  const t = userText.trim();
  if (!t || !PHOTO_ASK_RE.test(t)) return [];

  const patterns = [
    /\b(?:send|show)\s+(?:me\s+)?(?:the\s+)?(?:a\s+)?(.+?)\s+(?:image|images|photo|photos|pic|pics)\b/i,
    /\b(?:image|images|photo|photos|pic|pics)\s+(?:of|for)\s+(.+?)(?:\s+please)?\s*$/i,
  ];
  for (const re of patterns) {
    const m = re.exec(t);
    if (m?.[1]?.trim()) {
      const ids = findProductIdsMentionedInText(m[1], products);
      if (ids.length) return ids;
    }
  }
  return findProductIdsMentionedInText(t, products);
}

export function customerWantsProductPhotos(userText: string): boolean {
  return isCatalogBrowseIntent(userText) || PHOTO_ASK_RE.test(userText.trim());
}

export function productIdsWithPhotosAlreadySent(
  history: ConversationTurn[],
  products: CatalogProduct[]
): Set<number> {
  const sent = new Set<number>();
  for (const h of history) {
    if (h.role !== "assistant") continue;
    const text =
      typeof h.content === "string"
        ? h.content
        : h.content
            .filter((b) => b.type === "text")
            .map((b) => ("text" in b ? b.text : ""))
            .join("\n");
    for (const p of products) {
      if (text.includes(`[Image] ${p.productName}`)) {
        sent.add(p.id);
      }
    }
  }
  return sent;
}

export function isCatalogBrowseIntent(text: string): boolean {
  return CATALOG_BROWSE_RE.test(text.trim());
}

function threadPlainText(history: ConversationTurn[]): string {
  return history
    .map((t) => {
      if (typeof t.content === "string") return t.content;
      return t.content
        .filter((b) => b.type === "text")
        .map((b) => ("text" in b ? b.text : ""))
        .join("\n");
    })
    .join("\n");
}

export function looksLikeDeliveryAddress(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  if (ADDRESS_ASK_RE.test(t) && t.length >= 15) return true;
  if (/\b\d{1,5}\s+\w+\s+(street|st\.?|road|rd\.?|avenue|ave\.?|lane|block|house|flat|apt)\b/i.test(t)) {
    return true;
  }
  if (/\b(deliver|address|postal|zip|pin\s*code|city|town)\b/i.test(t) && t.length >= 20) {
    return true;
  }
  if ((t.match(/,/g) || []).length >= 2 && t.length >= 22) return true;
  if (/\b(phone|mob|contact|whatsapp)\s*[:\-]?\s*\+?\d{7,}/i.test(t)) return true;
  return t.length >= 45;
}

export function assistantAskedForAddress(
  history: ConversationTurn[]
): boolean {
  const assistant = history.filter((h) => h.role === "assistant").slice(-5);
  return assistant.some((h) => {
    const text =
      typeof h.content === "string"
        ? h.content
        : h.content
            .filter((b) => b.type === "text")
            .map((b) => ("text" in b ? b.text : ""))
            .join("\n");
    return ADDRESS_ASK_RE.test(text);
  });
}

export function countCustomerDiscountRequests(
  history: ConversationTurn[],
  userText: string
): number {
  const userParts = [
    ...history.filter((h) => h.role === "user").map((h) =>
      typeof h.content === "string" ? h.content : ""
    ),
    userText,
  ].join("\n");
  const matches = userParts.match(DISCOUNT_ASK_RE);
  let count = matches?.length ?? 0;
  if (BARGAIN_COUNTER_OFFER_RE.test(userText.trim())) {
    count += 1;
  }
  return count;
}

/** Parse qty for a product name from user text (e.g. "2 zinger" → 2). */
function quantityForProductInText(
  textLower: string,
  productName: string
): number {
  const name = productName.trim().toLowerCase();
  if (!name) return 1;

  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const full = escape(name);
  let m = new RegExp(`\\b(\\d{1,4})\\s*(?:x\\s*)?(?:of\\s+)?${full}\\b`, "i").exec(
    textLower
  );
  if (m) {
    const q = Number.parseInt(m[1], 10);
    if (Number.isFinite(q) && q > 0) return Math.min(q, 10_000);
  }

  m = new RegExp(`\\b${full}\\s*[x×]\\s*(\\d{1,4})\\b`, "i").exec(textLower);
  if (m) {
    const q = Number.parseInt(m[1], 10);
    if (Number.isFinite(q) && q > 0) return Math.min(q, 10_000);
  }

  const tokens = name.split(/[\s\-_/]+/).filter((w) => w.length >= 3);
  for (const token of tokens) {
    const tok = escape(token);
    m = new RegExp(`\\b(\\d{1,4})\\s*(?:x\\s*)?[\\w\\s-]*?${tok}\\b`, "i").exec(
      textLower
    );
    if (m) {
      const q = Number.parseInt(m[1], 10);
      if (Number.isFinite(q) && q > 0) return Math.min(q, 10_000);
    }
  }

  return 1;
}

export type ThreadOrderIntent = {
  productId: number;
  quantity: number;
};

const USER_ORDERISH_RE =
  /\b(?:order|want|need|get|take|buy|give me|i(?:'ll| will) (?:have|take|get))\b/i;

function userMessageTexts(
  history: ConversationTurn[],
  userText: string
): string[] {
  return [
    ...history
      .filter((h) => h.role === "user")
      .map((h) => (typeof h.content === "string" ? h.content.trim() : ""))
      .filter(Boolean),
    userText.trim(),
  ].filter(Boolean);
}

function isOrderLikeUserMessage(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (USER_ORDER_COMMIT_RE.test(t)) return true;
  if (USER_ORDERISH_RE.test(t)) return true;
  if (/\b\d{1,4}\s+(?:x\s*)?[\w-]+/i.test(t) && /\b(?:and|&|,)\b/i.test(t)) {
    return true;
  }
  if (
    /\b(?:one|two|three|four|five|\d+)\s+[\w-]+/i.test(t) &&
    /\band\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

/** Products the customer ordered in chat (per message), with qty. */
export function orderIntentsFromConversation(params: {
  history: ConversationTurn[];
  userText: string;
  products: CatalogProduct[];
}): ThreadOrderIntent[] {
  const byProduct = new Map<number, ThreadOrderIntent>();

  for (const text of userMessageTexts(params.history, params.userText)) {
    const ids = findProductIdsMentionedInText(text, params.products);
    if (!ids.length) continue;
    const include =
      ids.length >= 2 || isOrderLikeUserMessage(text);
    if (!include) continue;

    const lower = text.toLowerCase();
    for (const productId of ids) {
      const p = params.products.find((x) => x.id === productId);
      const quantity = p
        ? quantityForProductInText(lower, p.productName)
        : 1;
      const prev = byProduct.get(productId);
      if (!prev || quantity > prev.quantity) {
        byProduct.set(productId, { productId, quantity });
      }
    }
  }

  // e.g. "biryani" then "burger" in separate messages before address
  const recentMsgs = userMessageTexts(params.history, params.userText).slice(-6);
  if (recentMsgs.length >= 2) {
    const recentBlock = recentMsgs.join("\n");
    const recentIds = findProductIdsMentionedInText(
      recentBlock,
      params.products
    );
    if (recentIds.length >= 2) {
      const lower = recentBlock.toLowerCase();
      for (const productId of recentIds) {
        if (byProduct.has(productId)) continue;
        const p = params.products.find((x) => x.id === productId);
        byProduct.set(productId, {
          productId,
          quantity: p
            ? quantityForProductInText(lower, p.productName)
            : 1,
        });
      }
    }
  }

  return [...byProduct.values()];
}

export type WhatsAppOrderIntentLine = {
  productId: number;
  quantity: number;
  unitPrice: number;
};

/** Add missing line items from the chat when the model only footer'd one product. */
export function mergeWhatsAppOrderIntents(
  fromFooters: WhatsAppOrderIntentLine[],
  fromThread: ThreadOrderIntent[],
  defaultUnitPrice: (productId: number) => number
): WhatsAppOrderIntentLine[] {
  const byId = new Map(fromFooters.map((o) => [o.productId, o]));
  for (const line of fromThread) {
    if (byId.has(line.productId)) continue;
    byId.set(line.productId, {
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: defaultUnitPrice(line.productId),
    });
  }
  return [...byId.values()];
}

/**
 * Build the full checkout cart: model footers + customer messages + AI confirmation text.
 */
export function resolveCheckoutOrderIntents(
  fromFooters: WhatsAppOrderIntentLine[],
  params: {
    visibleText: string;
    userText: string;
    history: ConversationTurn[];
    products: CatalogProduct[];
  },
  defaultUnitPrice: (productId: number) => number
): WhatsAppOrderIntentLine[] {
  const threadLines = orderIntentsFromConversation({
    history: params.history,
    userText: params.userText,
    products: params.products,
  });

  let lines = mergeWhatsAppOrderIntents(
    fromFooters,
    threadLines,
    defaultUnitPrice
  );

  if (fromFooters.length === 0 && threadLines.length > 0) {
    return lines;
  }

  const extraIds = new Set<number>();
  for (const text of userMessageTexts(params.history, params.userText)) {
    const found = findProductIdsMentionedInText(text, params.products);
    if (found.length >= 2) {
      for (const id of found) extraIds.add(id);
    }
  }
  if (fromFooters.length > 0) {
    for (const id of findProductIdsMentionedInText(
      params.visibleText,
      params.products
    )) {
      extraIds.add(id);
    }
  }

  if (extraIds.size > 0) {
    lines = mergeWhatsAppOrderIntents(
      lines,
      [...extraIds].map((productId) => {
        const fromThread = threadLines.find((t) => t.productId === productId);
        return {
          productId,
          quantity: fromThread?.quantity ?? 1,
        };
      }),
      defaultUnitPrice
    );
  }

  return lines;
}

/** Last product the customer talked about buying. */
export function primaryProductIdFromThread(
  history: ConversationTurn[],
  userText: string,
  products: CatalogProduct[]
): number | null {
  const userOnly = [
    ...history.filter((h) => h.role === "user").map((h) =>
      typeof h.content === "string" ? h.content : ""
    ),
    userText,
  ].join("\n");
  const fromUser = findProductIdsMentionedInText(userOnly, products);
  if (fromUser.length) return fromUser[fromUser.length - 1]!;

  const all = `${threadPlainText(history)}\n${userText}`;
  const fromAll = findProductIdsMentionedInText(all, products);
  return fromAll.length ? fromAll[fromAll.length - 1]! : null;
}

export function detectConversationStage(params: {
  history: ConversationTurn[];
  userText: string;
  products: CatalogProduct[];
}): WhatsAppConversationStage {
  const user = params.userText.trim();
  if (!user) return "default";

  const recent = threadPlainText(params.history.slice(-8));
  const context = `${recent}\n${user}`;

  const mentioned = findProductIdsMentionedInText(context, params.products);
  const shoppingContext =
    mentioned.length > 0 &&
    (USER_ORDER_COMMIT_RE.test(context) ||
      /\b(address|deliver|quantity|qty|color|variant|price)\b/i.test(context));

  if (
    looksLikeDeliveryAddress(user) &&
    assistantAskedForAddress(params.history) &&
    primaryProductIdFromThread(params.history, user, params.products) != null
  ) {
    return "delivery_address_received";
  }

  if (USER_CLOSING_RE.test(user) && shoppingContext) {
    return "post_purchase_close";
  }

  if (
    USER_ORDER_COMMIT_RE.test(user) &&
    findProductIdsMentionedInText(user, params.products).length > 0 &&
    !looksLikeDeliveryAddress(user)
  ) {
    return "order_just_confirmed";
  }

  return "default";
}

export function conversationStageSystemHint(
  stage: WhatsAppConversationStage,
  products: CatalogProduct[]
): string {
  const otherNames = products
    .map((p) => p.productName)
    .filter(Boolean)
    .slice(0, 8);

  switch (stage) {
    case "delivery_address_received":
      return (
        "CONVERSATION STAGE (customer sent delivery address): Thank them and confirm the order clearly. " +
        "For ONE item end with [[ORDER:productId,qty,unitPrice]]. For MULTIPLE items in the same checkout use " +
        "[[ORDERS:id,qty,unitPrice;id,qty,unitPrice]] for multiple items (semicolon between items, or comma: id,qty,price,id,qty,price). " +
        "Use the customer/promo price from the catalog, or the bargain floor if you already agreed a lower price after the customer bargained. " +
        "Also end with [[PRODUCT_IDS:]] (no photos)."
      );
    case "order_just_confirmed":
      return (
        "CONVERSATION STAGE (customer committed to buy — address still needed): Confirm product, qty, and price. " +
        "Ask for full delivery address if you do not have it yet. Do NOT say the order is in the dashboard until address is received. " +
        "End with [[PRODUCT_IDS:]] (no photos). Do NOT use [[ORDER:…]] yet."
      );
    case "post_purchase_close":
      return (
        "CONVERSATION STAGE (customer is wrapping up after shopping): Thank them warmly. " +
        "Briefly mention 1–2 OTHER items they have not bought yet" +
        (otherNames.length
          ? ` (e.g. from: ${otherNames.join(", ")})`
          : "") +
        ". Keep it light — one short upsell sentence. " +
        "Only put IDs in [[PRODUCT_IDS:…]] for those other items if you name them; never resend photos of what they already ordered."
      );
    default:
      return "";
  }
}

/**
 * Keep only product IDs that match what the customer is discussing,
 * so WhatsApp does not attach the wrong product's photos.
 */
export function sanitizeOutboundProductIds(params: {
  modelIds: number[];
  visibleText: string;
  userText: string;
  products: CatalogProduct[];
  stage: WhatsAppConversationStage;
  history?: ConversationTurn[];
}): number[] {
  const { stage, products, userText, visibleText } = params;
  const modelIds = [...new Set(params.modelIds)].filter((id) =>
    products.some((p) => p.id === id)
  );

  if (
    stage === "order_just_confirmed" ||
    stage === "delivery_address_received"
  ) {
    return [];
  }

  const inUser = findProductIdsMentionedInText(userText, products);
  const inReply = findProductIdsMentionedInText(visibleText, products);
  const alreadySent = productIdsWithPhotosAlreadySent(
    params.history ?? [],
    products
  );
  const wantsPhotos = customerWantsProductPhotos(userText);

  if (stage === "post_purchase_close") {
    const upsell = inReply.filter((id) => !alreadySent.has(id));
    if (upsell.length) return upsell.slice(0, 3);
    return modelIds.filter((id) => !inUser.includes(id) && !alreadySent.has(id)).slice(0, 3);
  }

  if (isCatalogBrowseIntent(userText)) {
    let ids = inUser.length
      ? inUser
      : modelIds.length
        ? modelIds
        : products.map((p) => p.id);
    if (!wantsPhotos) {
      ids = ids.filter((id) => !alreadySent.has(id));
    }
    return ids.slice(0, 3);
  }

  if (inUser.length === 0) {
    return [];
  }

  let ids = inUser;
  if (modelIds.length) {
    const overlap = modelIds.filter((id) => inUser.includes(id));
    if (overlap.length) ids = overlap;
  } else {
    const replyOverlap = inReply.filter((id) => inUser.includes(id));
    if (replyOverlap.length) ids = replyOverlap;
  }

  if (!wantsPhotos) {
    ids = ids.filter((id) => !alreadySent.has(id));
  }

  return ids.slice(0, 3);
}

/**
 * Server-side product IDs to send photos when the model omits [[PRODUCT_IDS:…]]
 * (common with short token limits).
 */
export function resolveOutboundProductIdsForPhotos(params: {
  modelIds: number[];
  visibleText: string;
  userText: string;
  products: CatalogProduct[];
  stage: WhatsAppConversationStage;
  history?: ConversationTurn[];
}): number[] {
  const { userText, products, history } = params;
  const wantsPhotos = customerWantsProductPhotos(userText);

  // Explicit photo/menu request: match THIS message only (never older thread items).
  if (wantsPhotos) {
    const photoIds = productIdsFromPhotoRequest(userText, products);
    if (photoIds.length) return photoIds.slice(0, 3);
    if (isCatalogBrowseIntent(userText)) {
      return products.slice(0, 3).map((p) => p.id);
    }
    return [];
  }

  const sanitized = sanitizeOutboundProductIds(params);
  if (sanitized.length > 0) return sanitized;

  // Auto-send once when the customer first names a product (this turn only).
  const alreadySent = productIdsWithPhotosAlreadySent(history ?? [], products);
  const inUser = findProductIdsMentionedInText(userText, products);
  return inUser.filter((id) => !alreadySent.has(id)).slice(0, 3);
}
