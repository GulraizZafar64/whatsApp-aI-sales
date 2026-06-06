import type { ConversationTurn } from "@/lib/claude-generate";
import type { CustomerPhotoIntent } from "@/lib/claude-customer-intent";

type CatalogProduct = {
  id: number;
  productName: string;
  productDescription?: string | null;
};

/** Common Roman Urdu / English words → product name tokens to match. */
const PRODUCT_WORD_ALIASES: Record<string, string[]> = {
  shirt: [
    "shirt",
    "shirts",
    "shite",
    "shrit",
    "shrt",
    "tshirt",
    "t-shirt",
    "tee",
    "kameez",
    "kurta",
  ],
  pant: ["pant", "pants", "trouser", "trousers", "shalwar"],
  jogger: ["jogger", "joggers"],
  trousers: ["pant", "pants", "trouser", "trousers"],
  shalwar: ["shalwar", "shalwar", "pant", "pants"],
  dress: ["dress", "frock"],
  shoe: ["shoe", "shoes", "joota", "jootay"],
  bra: ["bra", "bras"],
  black: ["black", "kala"],
};

export type WhatsAppConversationStage =
  | "default"
  | "order_just_confirmed"
  | "delivery_address_received"
  | "post_purchase_close";

export const USER_CLOSING_RE =
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

const CATALOG_BROWSE_URDU =
  /(?:کیا ہے|کیا کچھ|مصنوعات|فہرست|کیٹلاگ|دکھائیں سب|سب دکھاؤ)/;

/** Size labels in descriptions — must not match a product without a name/category anchor. */
const SIZE_VARIANT_WORDS = new Set([
  "small",
  "sm",
  "medium",
  "med",
  "large",
  "lg",
  "xl",
  "xxl",
  "xxxl",
  "xs",
  "xxs",
  "one",
  "size",
  "sizes",
  "s",
  "m",
  "l",
]);

const WEAK_DESCRIPTION_TOKENS = new Set([
  ...SIZE_VARIANT_WORDS,
  "price",
  "prices",
  "available",
  "stock",
  "color",
  "colors",
  "new",
  "best",
  "free",
  "delivery",
  "order",
  "pcs",
  "piece",
  "pieces",
  "rs",
  "pkr",
]);

function isWeakCatalogToken(token: string): boolean {
  const w = token.toLowerCase();
  return WEAK_DESCRIPTION_TOKENS.has(w) || w.length < 3;
}

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

function searchTokensForProduct(p: {
  productName: string;
  productDescription?: string | null;
}): string[] {
  const tokens = new Set<string>();
  const name = p.productName.trim().toLowerCase();
  if (name) tokens.add(name);
  for (const w of name.split(/[\s\-_/]+/).filter((x) => x.length >= 2)) {
    tokens.add(w);
  }
  const desc = p.productDescription?.trim().toLowerCase() ?? "";
  for (const w of desc.split(/[\s\-_/.,]+/).filter((x) => x.length >= 3)) {
    if (isWeakCatalogToken(w)) continue;
    tokens.add(w);
  }
  for (const t of tokens) {
    const aliases = PRODUCT_WORD_ALIASES[t];
    if (aliases) for (const a of aliases) tokens.add(a);
  }
  const head = name.split(/[\s\-_/]+/).filter(Boolean).pop();
  if (head && head.length >= 3) {
    tokens.add(head);
    const headAliases = PRODUCT_WORD_ALIASES[head];
    if (headAliases) for (const a of headAliases) tokens.add(a);
  }
  return [...tokens];
}

function userMessageHasProductAnchor(
  t: string,
  p: { productName: string; productDescription?: string | null }
): boolean {
  const name = p.productName.trim().toLowerCase();
  if (name.length >= 2 && t.includes(name)) return true;

  for (const w of name.split(/[\s\-_/]+/).filter((x) => x.length >= 3)) {
    if (!isWeakCatalogToken(w) && tokenAppearsInText(w, t)) return true;
  }

  const productTokens = searchTokensForProduct(p);
  for (const [category, aliases] of Object.entries(PRODUCT_WORD_ALIASES)) {
    const userSaidCategory =
      tokenAppearsInText(category, t) ||
      aliases.some((a) => a.length >= 3 && tokenAppearsInText(a, t));
    if (!userSaidCategory) continue;
    if (
      aliases.some((a) => productTokens.includes(a) || name.includes(a)) ||
      name.includes(category) ||
      productTokens.includes(category)
    ) {
      return true;
    }
  }
  return false;
}

function productMentionedInText(
  p: { id: number; productName: string; productDescription?: string | null },
  raw: string,
  t: string
): boolean {
  const name = p.productName.trim().toLowerCase();
  if (name.length >= 2 && (raw.includes(name) || t.includes(name))) {
    return true;
  }
  const words = wordsFromText(t);
  const tokens = searchTokensForProduct(p);
  const matched: string[] = [];
  for (const token of tokens) {
    if (token.length < 3) continue;
    if (tokenAppearsInText(token, t)) matched.push(token);
    else if (words.some((word) => tokenMatchesWordFuzzy(token, word))) {
      matched.push(token);
    }
  }
  if (matched.length === 0) return false;

  const strong = matched.filter((tok) => !isWeakCatalogToken(tok));
  if (strong.length > 0) return true;

  return userMessageHasProductAnchor(t, p);
}

/** Categories the customer named (shirt, shoe, etc.) — used to drop wrong catalog matches. */
export function categoriesMentionedInUserText(text: string): string[] {
  const t = text.trim().toLowerCase();
  const found: string[] = [];
  for (const [category, aliases] of Object.entries(PRODUCT_WORD_ALIASES)) {
    if (
      tokenAppearsInText(category, t) ||
      aliases.some((a) => a.length >= 3 && tokenAppearsInText(a, t))
    ) {
      found.push(category);
    }
  }
  return found;
}

function productMatchesUserCategories(
  p: { productName: string; productDescription?: string | null },
  categories: string[]
): boolean {
  const name = p.productName.trim().toLowerCase();
  const tokens = searchTokensForProduct(p);
  return categories.some((category) => {
    const aliases = PRODUCT_WORD_ALIASES[category] ?? [category];
    return (
      name.includes(category) ||
      aliases.some((a) => name.includes(a) || tokens.includes(a)) ||
      tokens.includes(category)
    );
  });
}

function filterMatchesByUserCategories(
  matched: number[],
  text: string,
  products: CatalogProduct[]
): number[] {
  const categories = categoriesMentionedInUserText(text);
  if (!categories.length) return matched;
  const filtered = matched.filter((id) => {
    const p = products.find((x) => x.id === id);
    return p && productMatchesUserCategories(p, categories);
  });
  return filtered.length ? filtered : matched;
}

/** Product IDs whose names appear in `text` (longest names first). */
export function findProductIdsMentionedInText(
  text: string,
  products: CatalogProduct[]
): number[] {
  const raw = text.trim();
  const t = raw.toLowerCase();
  const ranked = [...products].sort(
    (a, b) => b.productName.length - a.productName.length
  );

  const matched: number[] = [];
  for (const p of ranked) {
    if (productMentionedInText(p, raw, t)) {
      matched.push(p.id);
    }
  }
  const unique = [...new Set(matched)];
  return filterMatchesByUserCategories(unique, raw, products);
}

function productIdsFromImageCaptionsInText(
  text: string,
  products: CatalogProduct[]
): number[] {
  const ids = new Set<number>();
  const re = /\[Image\]\s*([^\n]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const caption = m[1].replace(/\s+#\d+\s*$/i, "").trim();
    if (!caption) continue;
    for (const id of findProductIdsMentionedInText(caption, products)) {
      ids.add(id);
    }
  }
  return [...ids];
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
    for (const id of productIdsFromImageCaptionsInText(text, products)) {
      sent.add(id);
    }
    for (const p of products) {
      if (text.includes(`[Image] ${p.productName}`)) {
        sent.add(p.id);
      }
    }
  }
  return sent;
}

export function isCatalogBrowseIntent(text: string): boolean {
  const t = text.trim();
  return CATALOG_BROWSE_RE.test(t) || CATALOG_BROWSE_URDU.test(t);
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

const ORDER_OR_PRICE_IN_ADDRESS_RE =
  /\b(total|subtotal|qty|quantity|rupees?|rs\.?|pkr|usd|\$|price|shirt|pant|pants|order|confirm|shoes|jogger|joggers|cost|rate|kitna|kya|hai|ha|size|sizes|small|medium|large|extra|xl|xxl)\b/i;

const PRODUCT_INQUIRY_RE =
  /\b(?:do you have|have you got|got any|any\s+\w|show me|what do you sell|available in|in stock)\b/i;

function hasAddressMarkers(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (
    /\b\d{1,5}\s+\w+\s+(street|st\.?|road|rd\.?|avenue|ave\.?|lane|block|house|flat|apt)\b/i.test(
      t
    )
  ) {
    return true;
  }
  if (
    /\b(house|flat|apt|apartment|block|street|road|phase|sector|society|colony|town|city|address|postal|zip|pin\s*code|deliver\s+to)\b/i.test(
      t
    )
  ) {
    return true;
  }
  if ((t.match(/,/g) || []).length >= 2) return true;
  if (/\b(phone|mob|mobile|contact|whatsapp)\s*[:\-]?\s*\+?\d{7,}/i.test(t)) {
    return true;
  }
  if (/\+\d{10,15}\b/.test(t)) return true;
  if (/\b(?:#|no\.?|plot|house)\s*\d+/i.test(t) && t.length >= 10) return true;
  return false;
}

function isClearlyNotDeliveryAddress(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.includes("?")) return true;
  if (PRODUCT_INQUIRY_RE.test(t)) return true;
  if (isCatalogBrowseIntent(t)) return true;
  if (isOrderLikeUserMessage(t) && !hasAddressMarkers(t)) return true;
  if (ORDER_OR_PRICE_IN_ADDRESS_RE.test(t) && !hasAddressMarkers(t)) return true;
  return false;
}

function assistantTextFromTurn(h: ConversationTurn): string {
  return typeof h.content === "string"
    ? h.content
    : h.content
        .filter((b) => b.type === "text")
        .map((b) => ("text" in b ? b.text : ""))
        .join("\n");
}

/** User messages sent after the most recent assistant request for a delivery address. */
function userMessagesAfterAddressRequest(
  history: ConversationTurn[],
  userText: string
): string[] {
  let lastAddressAskIdx = -1;
  for (let i = 0; i < history.length; i++) {
    const h = history[i]!;
    if (h.role !== "assistant") continue;
    if (ADDRESS_ASK_RE.test(assistantTextFromTurn(h))) {
      lastAddressAskIdx = i;
    }
  }
  if (lastAddressAskIdx < 0) return [];

  const after = history
    .slice(lastAddressAskIdx + 1)
    .filter((h) => h.role === "user")
    .map((h) => (typeof h.content === "string" ? h.content.trim() : ""))
    .filter(Boolean);

  const current = userText.trim();
  return current ? [...after, current] : after;
}

export function looksLikeDeliveryAddress(
  text: string,
  options?: { assistantAskedForAddress?: boolean }
): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  if (/^\[image\]/i.test(t)) return false;
  if (isClearlyNotDeliveryAddress(t)) return false;

  if (hasAddressMarkers(t)) return true;

  // Long free-form address without explicit markers (e.g. full street paragraph).
  if (t.length >= 60 && /^[a-z0-9\s,.\-#'"/]+$/i.test(t)) return true;

  void options;
  return false;
}

/** Most recent user message that looks like a delivery address. */
export function findDeliveryAddressInConversation(
  history: ConversationTurn[],
  userText: string,
  assistantAskedForAddress: boolean
): string | null {
  const msgs = assistantAskedForAddress
    ? userMessagesAfterAddressRequest(history, userText)
    : userMessageTexts(history, userText);

  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]!;
    if (looksLikeDeliveryAddress(m, { assistantAskedForAddress })) {
      return m.trim().slice(0, 2000);
    }
  }
  return null;
}

/** Parse delivery address from the assistant confirmation / update summary. */
export function extractDeliveryAddressFromAssistantText(
  text: string
): string | null {
  const patterns = [
    /(?:delivery\s*address|deliver(?:y)?\s*to|shipping\s*address|address|pata)\s*[:\-*]\s*([^\n]+)/i,
    /(?:new\s+address|naya\s+pata|updated\s+address|address\s+update)\s*[:\-*]?\s*([^\n]+)/i,
    /(?:address\s+(?:is|will\s+be|updated\s+to|yeh|ye|ho\s*ga))\s*[:\-*]?\s*([^\n]+)/i,
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    const addr = m?.[1]?.trim();
    if (addr && addr.length >= 6) return addr.slice(0, 2000);
  }
  return null;
}

/** Build cart lines from AI confirmation text when [[ORDER:]] footers are missing. */
export function orderIntentsFromAssistantConfirmation(
  visibleText: string,
  products: CatalogProduct[],
  defaultUnitPrice: (productId: number) => number
): WhatsAppOrderIntentLine[] {
  const lines: WhatsAppOrderIntentLine[] = [];
  const seen = new Set<number>();

  for (const rawLine of visibleText.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.length < 4) continue;

    const bullet = /^[-•*]\s*/.exec(line);
    const body = bullet ? line.slice(bullet[0].length) : line;

    const qtyMatch = /^(\d+)\s+(.+)$/.exec(body);
    if (!qtyMatch) continue;

    const quantity = Math.max(1, Math.min(10_000, Number.parseInt(qtyMatch[1], 10)));
    let desc = qtyMatch[2]!.trim();

    // Strip price suffix but discard parsed price — always use catalog price
    const priceMatch = /(?:=|:)\s*([\d.]+)\s*(?:rupees?|rs\.?|pkr)?\s*$/i.exec(desc);
    if (priceMatch) {
      desc = desc.slice(0, priceMatch.index).trim();
    }

    const ids = findProductIdsMentionedInText(desc, products);
    if (ids.length !== 1) continue;
    const productId = ids[0]!;
    if (seen.has(productId)) continue;
    seen.add(productId);

    const unitPrice = defaultUnitPrice(productId);
    lines.push({ productId, quantity, unitPrice });
  }

  return lines;
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

function parseQtyWord(raw: string): number | null {
  const w = raw.toLowerCase();
  if (/^\d{1,4}$/.test(w)) {
    const q = Number.parseInt(w, 10);
    return Number.isFinite(q) && q > 0 ? q : null;
  }
  const map: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    ek: 1,
    ak: 1,
    aik: 1,
  };
  return map[w] ?? null;
}

/** Parse qty for a product name from user text (e.g. "2 zinger", "1 shirt 1 pant"). */
export function quantityForProductInText(
  textLower: string,
  productName: string
): number {
  const name = productName.trim().toLowerCase();
  if (!name) return 1;

  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const full = escape(name);
  let m = new RegExp(
    `\\b(\\d{1,4}|one|two|three|four|five|ek|ak|aik)\\s*(?:x\\s*)?(?:of\\s+)?${full}\\b`,
    "i"
  ).exec(textLower);
  if (m) {
    const q = parseQtyWord(m[1]!);
    if (q) return Math.min(q, 10_000);
  }

  m = new RegExp(`\\b${full}\\s*[x×]\\s*(\\d{1,4})\\b`, "i").exec(textLower);
  if (m) {
    const q = Number.parseInt(m[1], 10);
    if (Number.isFinite(q) && q > 0) return Math.min(q, 10_000);
  }

  const tokens = name.split(/[\s\-_/]+/).filter((w) => w.length >= 3);
  const head = tokens.length > 0 ? tokens[tokens.length - 1]! : name;
  const searchTokens = [...new Set([...tokens, head])];

  for (const token of searchTokens) {
    const tok = escape(token);
    m = new RegExp(
      `\\b(\\d{1,4}|one|two|three|four|five|ek|ak|aik)\\s+(?:[\\w\\s-]{0,24}?\\b)?${tok}\\b`,
      "i"
    ).exec(textLower);
    if (m) {
      const q = parseQtyWord(m[1]!);
      if (q) return Math.min(q, 10_000);
    }
    for (const alias of PRODUCT_WORD_ALIASES[token] ?? []) {
      const a = escape(alias);
      m = new RegExp(
        `\\b(\\d{1,4}|one|two|ek|ak|aik)\\s+(?:[\\w\\s-]{0,20}?\\b)?${a}\\b`,
        "i"
      ).exec(textLower);
      if (m) {
        const q = parseQtyWord(m[1]!);
        if (q) return Math.min(q, 10_000);
      }
    }
  }

  return 1;
}

export type ThreadOrderIntent = {
  productId: number;
  quantity: number;
};

/**
 * Matches when customer wants to ADD items to an existing order
 * (add, one more, extra, etc.) — NOT update/change/modify requests.
 * Update/change requests are handled separately via ORDER_UPDATE_REQUEST_RE.
 */
export const ORDER_MODIFICATION_RE =
  /\b(add|aur|extra|another|one more|ek aur|aik aur|or\s+\d+|plus|include|mazeed|zyada|ziyada|\d+\s+more)\b/i;

/**
 * Matches when customer is REQUESTING to update/change their order (step 1).
 * At this point the AI should show the existing order and ask what to change.
 * The DB must NOT be updated yet.
 */
export const ORDER_UPDATE_REQUEST_RE =
  /\b(update\s*(?:my\s*)?order|change\s*(?:my\s*)?order|order\s*(?:update|change|modify|edit)|modify\s*(?:my\s*)?order|badlo\s*(?:mera\s*)?order|order\s*badlo|mera\s*order\s*(?:update|change|badlo))\b|\b(?:address|pata|delivery)\s*(?:update|change|badlo|badal|modify|edit)\b|\b(?:update|change|badlo|badal)\s*(?:address|pata|delivery)\b/i;

/** Customer wants only specific item(s), e.g. "sirf blue shirt" — replace cart, do not merge. */
const ORDER_CART_REPLACE_RE =
  /\b(?:only|just|sirf|bas|sirfa|remove|without|except|nahi\s+(?:chahiye|lena)|don't\s+want|do\s+not\s+want)\b/i;

/** Swap one product for another, e.g. "shirt ki jaga shoes". */
const ORDER_CART_SWAP_RE =
  /\b(?:ki\s+jaga|ke\s+bajaye|ke\s+badlay|badlay|instead\s+of|replace(?:\s+with)?|change\s+to)\b/i;

export function isOrderCartSwapMessage(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 6) return false;
  return ORDER_CART_SWAP_RE.test(t);
}

export function isOrderCartReplacementMessage(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 4) return false;
  if (isOrderItemRemovalMessage(t)) return false;
  return ORDER_CART_REPLACE_RE.test(t) || isOrderCartSwapMessage(t);
}

/** Product(s) the customer wants removed in a swap, e.g. "shirt" in "shirt ki jaga shoes". */
export function productIdsToSwapOut(
  text: string,
  products: CatalogProduct[]
): number[] {
  const t = text.trim();
  const patterns = [
    /\b(.+?)\s+ki\s+jaga\b/i,
    /\b(.+?)\s+ke\s+bajaye\b/i,
    /\binstead\s+of\s+(.+?)(?:\s+(?:with|and|aur|or)\b|[,.]|$)/i,
  ];
  for (const re of patterns) {
    const m = re.exec(t);
    if (m?.[1]?.trim()) {
      const ids = findProductIdsMentionedInText(m[1], products);
      if (ids.length) return ids;
    }
  }
  return [];
}

export function productIdsToSwapIn(
  text: string,
  products: CatalogProduct[]
): number[] {
  const t = text.trim();
  const afterSwap = [
    /\b(?:ki\s+jaga|ke\s+bajaye|instead\s+of\s+.+?)\s+(.+?)(?:\s+(?:or|aur|and)\b|[,.]|$)/i,
    /\breplace(?:\s+with)?\s+(.+?)(?:\s+(?:or|aur|and)\b|[,.]|$)/i,
  ];
  for (const re of afterSwap) {
    const m = re.exec(t);
    if (m?.[1]?.trim()) {
      const ids = findProductIdsMentionedInText(m[1], products);
      if (ids.length) return ids;
    }
  }
  const all = findProductIdsMentionedInText(t, products);
  const out = productIdsToSwapOut(t, products);
  return all.filter((id) => !out.includes(id));
}

const ADDRESS_CHANGE_RE =
  /\b(?:address|pata|location|delivery)\s*(?:bi\s+)?(?:change|update|badlo|badal|kr\s*do|kar\s*do|kr\s*den|kar\s*den)\b|\b(?:change|update|badlo|badal)\s+(?:address|pata|delivery)\b/i;

/** Customer wants to change delivery address on an existing order. */
export function customerRequestsAddressUpdate(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 4) return false;
  return ADDRESS_CHANGE_RE.test(t);
}

/** Extract delivery address from "… address karachi korangi" style one-line orders. */
export function extractAddressFromCombinedOrderMessage(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  const patterns = [
    /\baddress\s*[:\-]?\s*(.+)$/i,
    /\bpata\s*[:\-]?\s*(.+)$/i,
    /\bdeliver(?:y)?\s+(?:at|to|par|on)\s+(.+)$/i,
  ];
  for (const re of patterns) {
    const m = re.exec(t);
    const addr = m?.[1]?.trim();
    if (addr && addr.length >= 4 && !isClearlyNotDeliveryAddress(addr)) {
      return addr.slice(0, 2000);
    }
  }
  return null;
}

/** Extract new delivery address from an order-update message. */
export function extractAddressFromOrderUpdateMessage(text: string): string | null {
  const t = text.trim();
  if (!t) return null;

  const patterns = [
    /\b(?:address|pata|location)\s*(?:bi\s+)?(?:change|update|badlo|badal)\s*(?:kr\s*do|kar\s*do|karo|kr\s*den|kar\s*den)?\s*[:\-]?\s*(.+)$/i,
    /\b(?:new\s+address|naya\s+pata|mera\s+pata|yeh\s+pata|ye\s+pata)\s*[:\-]?\s*(.+)$/i,
    /\b(?:deliver|delivery)\s+(?:to|at|par|on)\s+(.+)$/i,
    /\b(?:address|pata)\s+(?:yeh|ye|hai|ha|ho\s*ga)\s*[:\-]?\s*(.+)$/i,
  ];

  if (ADDRESS_CHANGE_RE.test(t)) {
    for (const re of patterns) {
      const m = re.exec(t);
      const addr = m?.[1]?.trim();
      if (addr && addr.length >= 6) return addr.slice(0, 2000);
    }
  }

  for (const re of patterns) {
    const m = re.exec(t);
    const addr = m?.[1]?.trim();
    if (addr && addr.length >= 6) return addr.slice(0, 2000);
  }

  return null;
}

/** Latest address from user messages during a pending order update flow. */
export function findLatestAddressForOrderUpdate(
  history: ConversationTurn[],
  userText: string
): string | null {
  const msgs = userMessageTexts(history, userText);
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]!.trim();
    if (!m || m.length < 8) continue;
    if (isCustomerOrderUpdateConfirmation(m)) continue;
    if (isOrderUpdateRequest(m) && !extractAddressFromOrderUpdateMessage(m)) continue;

    const fromUpdate = extractAddressFromOrderUpdateMessage(m);
    if (fromUpdate) return fromUpdate;

    if (looksLikeDeliveryAddress(m, { assistantAskedForAddress: true })) {
      return m.slice(0, 2000);
    }
  }
  return null;
}

const ORDER_ITEM_REMOVE_RE =
  /\b(?:don'?t\s+want|do\s+not\s+want|not\s+want|no\s+need|cancel|remove|skip|without|except|nahi?\s+(?:chahiye|chiya|chiye|lena)|ni\s+(?:mujh(?:e|a|i)|chahiye|chiya|chiye)|mat\s+(?:do|le|lena)|ni\s+.*?\s+(?:chahiye|chiya|chiye|lena))\b/i;

/** Customer wants to drop item(s) from cart, e.g. "joggers ni chahiye". */
export function isOrderItemRemovalMessage(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 4) return false;
  if (!ORDER_ITEM_REMOVE_RE.test(t)) return false;
  return (
    categoriesMentionedInUserText(t).length > 0 ||
    /\b(?:jogger|joggers|shoes?|shirt|pant|pants|dress|bra|kameez)\b/i.test(t)
  );
}

export function productIdsToRemoveFromOrder(
  text: string,
  products: CatalogProduct[]
): number[] {
  const ids = findProductIdsMentionedInText(text, products);
  if (ids.length) return ids;
  const categories = categoriesMentionedInUserText(text);
  if (!categories.length) return [];
  return products
    .filter((p) => productMatchesUserCategories(p, categories))
    .map((p) => p.id);
}

const SIMPLE_GREETING_RE =
  /^(?:hi|hello|hey|hlo|hlw|salam|assalam(?:u\s*alaikum)?|aoa|good\s+(?:morning|afternoon|evening)|namaste|yo+)\.?$/i;

/** Short greeting only — not a product or order message. */
export function isSimpleGreetingMessage(text: string): boolean {
  const t = text.trim().replace(/[.!?…]+$/g, "").trim();
  if (!t || t.length > 48) return false;
  return SIMPLE_GREETING_RE.test(t);
}

/** Customer is actively ordering/updating — safe to read order intent from chat. */
export function isActiveOrderMessage(text: string): boolean {
  const t = text.trim();
  if (!t || isSimpleGreetingMessage(t)) return false;
  if (USER_CLOSING_RE.test(t)) return false;
  if (isOrderStatusInquiryOnly(t)) return false;
  return (
    isOrderLikeUserMessage(t) ||
    isOrderModificationMessage(t) ||
    isOrderCartReplacementMessage(t) ||
    isOrderCartSwapMessage(t) ||
    isOrderItemRemovalMessage(t) ||
    isOrderUpdateRequest(t)
  );
}

function isOrderStatusInquiryOnly(text: string): boolean {
  if (!/\b(?:order|status|mera\s+order|track)\b/i.test(text)) return false;
  return (
    /\b(?:status|track|mera\s+order|my\s+order|order\s+ka\s+status)\b/i.test(text) &&
    !isOrderLikeUserMessage(text) &&
    !isOrderModificationMessage(text)
  );
}

function messagesForOrderIntentScan(params: {
  history: ConversationTurn[];
  userText: string;
  products: CatalogProduct[];
}): string[] {
  const t = params.userText.trim();
  if (!t) return [];

  const idsInCurrent = findProductIdsMentionedInText(t, params.products);
  if (
    idsInCurrent.length > 0 &&
    (isOrderLikeUserMessage(t) ||
      isOrderModificationMessage(t) ||
      USER_ORDERISH_ROMAN_URDU_RE.test(t))
  ) {
    return [t];
  }

  if (!isActiveOrderMessage(t)) {
    return [t];
  }

  const userMsgs = userMessageTexts(params.history, t);
  const orderMsgs = userMsgs.filter(
    (m) =>
      isOrderLikeUserMessage(m) ||
      isOrderModificationMessage(m) ||
      isOrderCartReplacementMessage(m)
  );
  return orderMsgs.length > 0 ? orderMsgs.slice(-2) : [t];
}

const USER_ORDERISH_RE =
  /\b(?:order|want|need|get|take|buy|give me|i(?:'ll| will) (?:have|take|get))\b/i;

const USER_ORDERISH_ROMAN_URDU_RE =
  /\b(?:chahiye|chiya|chiye|lena|dena|mujhe|muja|muji|bhejo|bhej do|la do|kr do|kar do|le lo|lelo|order kar|krna|karna)\b/i;

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

/** Customer wants to ADD items to existing order (not an update/change request). */
export function isOrderModificationMessage(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 3) return false;
  // Explicitly exclude update/change requests — those are handled separately
  if (ORDER_UPDATE_REQUEST_RE.test(t)) return false;
  return ORDER_MODIFICATION_RE.test(t);
}

/**
 * Customer is requesting to update/change their existing order (step 1 of 2).
 * The AI should show the order and ask what to change — DB not updated yet.
 */
export function isOrderUpdateRequest(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 4) return false;
  return ORDER_UPDATE_REQUEST_RE.test(t);
}

/** Short yes/ok/confirm replies after the AI showed an order update summary. */
export function isCustomerOrderUpdateConfirmation(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 120) return false;
  if (isSimpleGreetingMessage(t)) return false;
  if (isOrderUpdateRequest(t) || isOrderCartSwapMessage(t)) return false;
  if (
    /^(?:yes|y(?:es|eah|ep)|ok(?:ay)?|theek(?:\s+hai)?|thik(?:\s+hai)?|haan|han|ji+\.?|hmm+\s+ok|confirm(?:ed)?|done|sahi(?:\s+hai)?|correct|go\s+ahead|proceed|sure|bilkul|agreed|accept|update(?:\s+it)?|kr(?:\s+do|do)|kar(?:\s+do|do)|krdo|kardo|update\s+kr(?:\s+do|do)|update\s+kar(?:\s+do|do))[\s.!]*$/i.test(
      t
    )
  ) {
    return true;
  }
  if (t.length <= 40 && USER_ORDER_COMMIT_RE.test(t)) return true;
  return false;
}

/** Customer explicitly said they want to order (not only browsing). */
export function customerCommittedToOrderInThread(
  history: ConversationTurn[],
  userText: string
): boolean {
  return userMessageTexts(history, userText).some(isOrderLikeUserMessage);
}

function isOrderLikeUserMessage(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (USER_ORDER_COMMIT_RE.test(t)) return true;
  if (USER_ORDERISH_RE.test(t)) return true;
  if (USER_ORDERISH_ROMAN_URDU_RE.test(t)) return true;
  if (/\b\d{1,4}\s+(?:x\s*)?[\w-]+/i.test(t) && /\b(?:and|&|,|aur)\b/i.test(t)) {
    return true;
  }
  if (
    /\b(?:one|two|three|four|five|ek|ak|aik|\d+)\s+[\w-]+/i.test(t) &&
    /\b(?:and|&|aur)\b/i.test(t)
  ) {
    return true;
  }
  if (
    /\b(?:chahiye|chiya|chiye|lena|order)\b/i.test(t) &&
    /\b(?:shirt|pant|pants|dress|shoe|bra|top|kameez|shalwar)\b/i.test(t)
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
  const scannedTexts = messagesForOrderIntentScan({
    history: params.history,
    userText: params.userText,
    products: params.products,
  });

  for (const text of scannedTexts) {
    const ids = findProductIdsMentionedInText(text, params.products);
    if (!ids.length) continue;
    const include =
      ids.length >= 2 ||
      isOrderLikeUserMessage(text) ||
      isOrderModificationMessage(text) ||
      USER_ORDERISH_ROMAN_URDU_RE.test(text);
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

  const recentMsgs = scannedTexts.slice(-6);
  if (recentMsgs.length >= 2) {
    const recentBlock = recentMsgs.join("\n");
    const recentIds = findProductIdsMentionedInText(recentBlock, params.products);
    const multiProductOrder =
      recentIds.length >= 2 &&
      (/\b(?:and|&|aur)\b/i.test(recentBlock) ||
        recentMsgs.some(
          (m) =>
            isOrderLikeUserMessage(m) &&
            findProductIdsMentionedInText(m, params.products).length >= 2
        ));
    if (multiProductOrder) {
      const lower = recentBlock.toLowerCase();
      for (const productId of recentIds) {
        if (byProduct.has(productId)) continue;
        const p = params.products.find((x) => x.id === productId);
        byProduct.set(productId, {
          productId,
          quantity: p ? quantityForProductInText(lower, p.productName) : 1,
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
  if (fromFooters.length === 0 && !isActiveOrderMessage(params.userText)) {
    return [];
  }

  if (fromFooters.length > 0) {
    return fromFooters.map((line) => ({
      ...line,
      unitPrice:
        Number.isFinite(line.unitPrice) && line.unitPrice > 0
          ? line.unitPrice
          : defaultUnitPrice(line.productId),
    }));
  }

  // Do not guess cart from chat when the model did not emit order footers/JSON.
  if (!isActiveOrderMessage(params.userText)) {
    return [];
  }

  const threadLines = orderIntentsFromConversation({
    history: params.history,
    userText: params.userText,
    products: params.products,
  });

  if (threadLines.length > 0) {
    return mergeWhatsAppOrderIntents([], threadLines, defaultUnitPrice);
  }

  const fromConfirm = orderIntentsFromAssistantConfirmation(
    params.visibleText,
    params.products,
    defaultUnitPrice
  );
  if (fromConfirm.length > 0) {
    return fromConfirm;
  }

  const pid = primaryProductIdFromThread(
    params.history,
    params.userText,
    params.products
  );
  if (pid != null) {
    return [
      {
        productId: pid,
        quantity: 1,
        unitPrice: defaultUnitPrice(pid),
      },
    ];
  }

  return [];
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

  const askedForAddress = assistantAskedForAddress(params.history);

  if (
    looksLikeDeliveryAddress(user, { assistantAskedForAddress: askedForAddress }) &&
    askedForAddress &&
    customerCommittedToOrderInThread(params.history, user) &&
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
    !looksLikeDeliveryAddress(user, { assistantAskedForAddress: askedForAddress })
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
        "End with [[ORDER_JSON:{\"items\":[{\"productId\":ID,\"qty\":1,\"unitPrice\":PRICE,\"size\":\"Large\"}],\"address\":\"full address\"}]]. " +
        "Include ONLY items they are buying now — not products from old browsing. " +
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
        (otherNames.length ? ` (e.g. from: ${otherNames.join(", ")})` : "") +
        ". Keep it light — one short upsell sentence. " +
        "Only put IDs in [[PRODUCT_IDS:…]] for those other items if you name them; never resend photos of what they already ordered."
      );
    default:
      return "";
  }
}

export function sanitizeOutboundProductIds(params: {
  modelIds: number[];
  visibleText: string;
  userText: string;
  products: CatalogProduct[];
  stage: WhatsAppConversationStage;
  history?: ConversationTurn[];
  photoIntent?: CustomerPhotoIntent | null;
}): number[] {
  const { stage, products, userText, visibleText } = params;
  const modelIds = [...new Set(params.modelIds)].filter((id) =>
    products.some((p) => p.id === id)
  );

  if (stage === "order_just_confirmed" || stage === "delivery_address_received") {
    return [];
  }

  const intent = params.photoIntent;
  const wantsPhotos = intent?.wantsPhotos ?? false;
  const showAllCatalog = intent?.showAllCatalog ?? false;
  const explicitPhoto = intent?.explicitRequest ?? false;
  const intentProductIds = (intent?.productIds ?? []).filter((id) =>
    products.some((p) => p.id === id)
  );

  const inUser = findProductIdsMentionedInText(userText, products);
  const inReply = findProductIdsMentionedInText(visibleText, products);
  const alreadySent = productIdsWithPhotosAlreadySent(params.history ?? [], products);

  if (stage === "post_purchase_close") {
    const upsell = inReply.filter((id) => !alreadySent.has(id));
    if (upsell.length) return upsell.slice(0, 3);
    return modelIds.filter((id) => !inUser.includes(id) && !alreadySent.has(id)).slice(0, 3);
  }

  if (showAllCatalog || isCatalogBrowseIntent(userText)) {
    let ids = intentProductIds.length
      ? intentProductIds
      : inUser.length
        ? inUser
        : modelIds.length
          ? modelIds
          : products.map((p) => p.id);
    if (!explicitPhoto) ids = ids.filter((id) => !alreadySent.has(id));
    return ids.slice(0, 3);
  }

  if (!wantsPhotos && inUser.length === 0) return [];

  let ids = intentProductIds.length ? intentProductIds : inUser;
  if (modelIds.length) {
    const overlap = modelIds.filter((id) => ids.includes(id));
    if (overlap.length) ids = overlap;
    else if (wantsPhotos && intentProductIds.length === 0) ids = modelIds;
  } else {
    const replyOverlap = inReply.filter((id) => ids.includes(id));
    if (replyOverlap.length) ids = replyOverlap;
  }

  if (!explicitPhoto) ids = ids.filter((id) => !alreadySent.has(id));
  return ids.slice(0, 3);
}

export function resolveOutboundProductIdsForPhotos(params: {
  modelIds: number[];
  visibleText: string;
  userText: string;
  products: CatalogProduct[];
  stage: WhatsAppConversationStage;
  history?: ConversationTurn[];
  alreadySent?: Set<number>;
  photoIntent?: CustomerPhotoIntent | null;
}): number[] {
  const { userText, products, history, stage } = params;
  const alreadySent = new Set([
    ...productIdsWithPhotosAlreadySent(history ?? [], products),
    ...(params.alreadySent ?? []),
  ]);

  if (stage === "order_just_confirmed" || stage === "delivery_address_received") {
    return [];
  }

  const intent = params.photoIntent;
  const wantsPhotos = intent?.wantsPhotos ?? false;
  const showAllCatalog = intent?.showAllCatalog ?? false;
  const explicitPhoto = intent?.explicitRequest ?? false;
  const intentProductIds = (intent?.productIds ?? []).filter((id) =>
    products.some((p) => p.id === id)
  );

  const modelIds = [...new Set(params.modelIds)].filter((id) =>
    products.some((p) => p.id === id)
  );

  const idsForIntent = (ids: number[]): number[] => {
    if (intentProductIds.length === 0) return ids;
    const overlap = ids.filter((id) => intentProductIds.includes(id));
    return overlap.length ? overlap : intentProductIds;
  };

  if (modelIds.length > 0) {
    const ids = idsForIntent(modelIds);
    if (explicitPhoto || wantsPhotos) {
      return explicitPhoto ? ids.slice(0, 3) : ids.filter((id) => !alreadySent.has(id)).slice(0, 3);
    }
    return ids.filter((id) => !alreadySent.has(id)).slice(0, 3);
  }

  if (wantsPhotos || showAllCatalog) {
    if (intentProductIds.length) {
      return explicitPhoto
        ? intentProductIds.slice(0, 3)
        : intentProductIds.filter((id) => !alreadySent.has(id)).slice(0, 3);
    }
    if (showAllCatalog || isCatalogBrowseIntent(userText)) {
      return products
        .filter((p) => explicitPhoto || !alreadySent.has(p.id))
        .slice(0, 3)
        .map((p) => p.id);
    }
  }

  if (isCatalogBrowseIntent(userText)) {
    const ids = products.filter((p) => !alreadySent.has(p.id)).slice(0, 3).map((p) => p.id);
    return ids;
  }

  if (!wantsPhotos) return [];

  let mentionedNow = intentProductIds;
  if (mentionedNow.length === 0) {
    mentionedNow = findProductIdsMentionedInText(userText, products);
  }
  if (mentionedNow.length === 0) {
    const categories = categoriesMentionedInUserText(userText);
    if (categories.length > 0) {
      mentionedNow = products
        .filter((p) => productMatchesUserCategories(p, categories))
        .map((p) => p.id);
    }
  }

  if (explicitPhoto) return mentionedNow.slice(0, 3);
  return mentionedNow.filter((id) => !alreadySent.has(id)).slice(0, 3);
}