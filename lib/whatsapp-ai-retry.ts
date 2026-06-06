import { normalizeWaDigits } from "@/lib/phone-normalize";

/** Backoff delays per retry attempt (ms): ~30s, 2min, 5min. */
export const AI_REPLY_RETRY_DELAYS_MS = [30_000, 120_000, 300_000] as const;

export type AiReplyRetryParams = {
  businessId: number;
  contactWaId: string;
  whatsappChatId?: string;
  userText: string;
  senderName?: string;
  messageType?: string;
  whatsappMediaId?: string;
  isCustomerAudio?: boolean;
  isCustomerImage?: boolean;
  webImageMime?: string;
  /** 0-based retry attempt (0 = first retry after initial failure). */
  retryAttempt?: number;
};

type PendingRetry = {
  params: AiReplyRetryParams;
  timeoutId: ReturnType<typeof setTimeout>;
};

const pendingRetries = new Map<string, PendingRetry>();

function retryKey(businessId: number, normWaId: string): string {
  return `${businessId}:${normWaId}`;
}

export function cancelPendingAiReplyRetry(
  businessId: number,
  contactWaId: string
): void {
  const norm = normalizeWaDigits(contactWaId.trim());
  if (!norm) return;
  const k = retryKey(businessId, norm);
  const entry = pendingRetries.get(k);
  if (!entry) return;
  clearTimeout(entry.timeoutId);
  pendingRetries.delete(k);
  console.log("[whatsapp-ai-retry] cancelled", k);
}

export function clearPendingAiReplyRetry(
  businessId: number,
  contactWaId: string
): void {
  cancelPendingAiReplyRetry(businessId, contactWaId);
}

function delayForAttempt(attempt: number): number {
  const idx = Math.min(attempt, AI_REPLY_RETRY_DELAYS_MS.length - 1);
  return AI_REPLY_RETRY_DELAYS_MS[idx] ?? AI_REPLY_RETRY_DELAYS_MS[0]!;
}

/** Schedule exponential-backoff retry; replaces any existing retry for this customer. */
export function scheduleAiReplyRetry(
  params: AiReplyRetryParams,
  attempt = params.retryAttempt ?? 0
): void {
  const norm = normalizeWaDigits(params.contactWaId.trim());
  if (!norm) return;

  if (attempt >= AI_REPLY_RETRY_DELAYS_MS.length) {
    console.warn("[whatsapp-ai-retry] max retries exhausted", params.businessId, norm);
    return;
  }

  cancelPendingAiReplyRetry(params.businessId, params.contactWaId);

  const delayMs = delayForAttempt(attempt);
  const k = retryKey(params.businessId, norm);
  const nextParams: AiReplyRetryParams = { ...params, retryAttempt: attempt + 1 };

  const timeoutId = setTimeout(() => {
    pendingRetries.delete(k);
    console.log("[whatsapp-ai-retry] retrying now", k, "attempt", attempt + 1);
    void import("@/lib/whatsapp-inbound-ai")
      .then(({ tryAutoReplyInboundWhatsApp }) =>
        tryAutoReplyInboundWhatsApp({
          ...nextParams,
          isRetryAttempt: true,
        })
      )
      .catch((err) => {
        console.error("[whatsapp-ai-retry] retry invoke failed:", err);
      });
  }, delayMs);

  pendingRetries.set(k, { params: nextParams, timeoutId });
  console.log(
    "[whatsapp-ai-retry] scheduled in",
    Math.round(delayMs / 1000),
    "s",
    k,
    "attempt",
    attempt + 1
  );
}

/** @deprecated Use AI_REPLY_RETRY_DELAYS_MS */
export const AI_REPLY_RETRY_DELAY_MS = AI_REPLY_RETRY_DELAYS_MS[1]!;
