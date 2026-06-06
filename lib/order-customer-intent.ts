const CANCEL_ORDER_RE =
  /\b(?:cancel(?:led|lation)?|cancel\s+kar(?:o|na|do)?|order\s+cancel|mera\s+order\s+cancel|delete\s+(?:my\s+)?order|order\s+delete|order\s+hatao|order\s+nahi\s+chahiye|don't\s+want\s+(?:the\s+)?order|do\s+not\s+want\s+(?:the\s+)?order)\b/i;

const UPDATE_ORDER_RE =
  /\b(?:change|update|modify|edit|badlo|badal|change\s+kar|update\s+kar)\s+(?:my\s+)?order\b|\b(?:order\s+(?:change|update|modify|edit))\b/i;

export function customerRequestsOrderCancel(userText: string): boolean {
  const t = userText.trim();
  if (t.length < 4) return false;
  if (/\b(?:how\s+to|can\s+i)\s+cancel\b/i.test(t) && !/\b(?:please|pls|kar|do)\b/i.test(t)) {
    return false;
  }
  return CANCEL_ORDER_RE.test(t);
}

export function customerRequestsOrderUpdate(userText: string): boolean {
  const t = userText.trim();
  if (t.length < 4) return false;
  return UPDATE_ORDER_RE.test(t);
}

/** When customer "yes/ok" counts as confirming a pending order DB update. */
export function resolveOrderUpdateConfirmedForDb(params: {
  rawReply: string;
  userText: string;
  hasPendingOrder: boolean;
  hasOrderPayload: boolean;
  isCustomerConfirmation: (text: string) => boolean;
}): boolean {
  if (params.rawReply.includes("[[ORDER_UPDATE_CONFIRMED]]")) return true;
  if (!params.hasPendingOrder || !params.hasOrderPayload) return false;
  return params.isCustomerConfirmation(params.userText);
}
