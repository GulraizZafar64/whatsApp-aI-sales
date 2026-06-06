import fs from "fs/promises";
import path from "path";
import { getWhatsAppAuthPath } from "@/lib/whatsapp-web/config";

const LOCK_DIR = "ai-customer-locks";
const LOCK_MAX_AGE_MS = 3 * 60 * 1000;

const waitMs = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function tryAcquireLockFile(
  lockPath: string
): Promise<(() => Promise<void>) | null> {
  try {
    const handle = await fs.open(lockPath, "wx");
    await handle.writeFile(
      JSON.stringify({ pid: process.pid, startedAt: Date.now() })
    );
    await handle.close();
    return async () => {
      await fs.rm(lockPath, { force: true }).catch(() => {});
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST") throw error;

    try {
      const raw = await fs.readFile(lockPath, "utf8");
      const parsed = JSON.parse(raw) as { pid?: number; startedAt?: number };
      const age = Date.now() - (parsed.startedAt ?? 0);
      const pid = parsed.pid ?? 0;
      const stale = age > LOCK_MAX_AGE_MS;
      const pidDead = pid > 0 && !isProcessAlive(pid);
      if (stale || pidDead || pid === process.pid) {
        await fs.rm(lockPath, { force: true }).catch(() => {});
        return tryAcquireLockFile(lockPath);
      }
    } catch {
      await fs.rm(lockPath, { force: true }).catch(() => {});
      return tryAcquireLockFile(lockPath);
    }
    return null;
  }
}

function lockPathForCustomer(
  businessId: number,
  customerWaId: string
): string {
  const safeId = customerWaId.replace(/[^\dA-Za-z_-]/g, "_");
  return path.join(
    getWhatsAppAuthPath(),
    LOCK_DIR,
    `biz-${businessId}-${safeId}.lock`
  );
}

/**
 * One AI reply + checkout at a time per customer — prevents double orders/replies
 * when two WhatsApp messages arrive within seconds.
 */
export async function acquireCustomerAiLock(
  businessId: number,
  customerWaId: string,
  maxWaitMs = 120_000
): Promise<(() => Promise<void>) | null> {
  const lockPath = lockPathForCustomer(businessId, customerWaId);
  await fs.mkdir(path.dirname(lockPath), { recursive: true });

  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const release = await tryAcquireLockFile(lockPath);
    if (release) return release;
    await waitMs(350);
  }

  console.warn(
    "[whatsapp-ai-lock] could not acquire lock — skipping duplicate run",
    businessId,
    customerWaId.slice(0, 8)
  );
  return null;
}

export async function withCustomerAiLock<T>(
  businessId: number,
  customerWaId: string,
  fn: () => Promise<T>,
  maxWaitMs = 120_000
): Promise<T | null> {
  const release = await acquireCustomerAiLock(
    businessId,
    customerWaId,
    maxWaitMs
  );
  if (!release) return null;
  try {
    return await fn();
  } finally {
    await release();
  }
}
