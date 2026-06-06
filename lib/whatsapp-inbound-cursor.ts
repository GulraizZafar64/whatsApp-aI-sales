import { ensureDb } from "@/lib/sequelize";
import { WhatsAppMessage } from "@/lib/models";

const INBOUND_GRACE_MS = 3_000;

/** At startup/reconnect, ignore WhatsApp messages older than this (ms). */
export const STARTUP_STALE_MAX_AGE_MS = 60_000;

export function messageTimestampMs(
  msg: import("whatsapp-web.js").Message
): number | null {
  const raw = msg.timestamp as unknown;
  if (raw instanceof Date) {
    const ms = raw.getTime();
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  }
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw > 1e12 ? raw : raw * 1000;
  }
  if (typeof raw === "string") {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) {
      return n > 1e12 ? n : n * 1000;
    }
  }
  return null;
}

/** Cutoff for accepting inbound auto-replies after server boot / session restore. */
export async function computeInboundSinceMs(
  businessId: number,
  serverBootTimeMs: number
): Promise<number> {
  await ensureDb();
  const lastIncoming = await WhatsAppMessage.findOne({
    where: { businessId, direction: "incoming" },
    order: [["createdAt", "DESC"]],
    attributes: ["createdAt"],
  });
  const lastDbMs = lastIncoming?.createdAt?.getTime() ?? 0;
  const startupFloor = serverBootTimeMs - STARTUP_STALE_MAX_AGE_MS;
  return Math.max(startupFloor, lastDbMs, serverBootTimeMs - INBOUND_GRACE_MS);
}

export function isStaleInboundMessage(
  msg: import("whatsapp-web.js").Message,
  inboundSinceMs: number,
  options?: { strictNoTimestamp?: boolean }
): boolean {
  const msgMs = messageTimestampMs(msg);
  if (msgMs == null) {
    return options?.strictNoTimestamp ?? true;
  }
  if (msgMs < inboundSinceMs - INBOUND_GRACE_MS) {
    return true;
  }
  const ageMs = Date.now() - msgMs;
  if (ageMs > STARTUP_STALE_MAX_AGE_MS * 10) {
    return true;
  }
  return false;
}

export async function inboundWaMessageAlreadySaved(
  businessId: number,
  waMessageKey: string
): Promise<boolean> {
  const key = waMessageKey.trim();
  if (!key) return false;
  await ensureDb();
  const row = await WhatsAppMessage.findOne({
    where: { businessId, waMessageKey: key },
    attributes: ["id"],
  });
  return Boolean(row);
}
