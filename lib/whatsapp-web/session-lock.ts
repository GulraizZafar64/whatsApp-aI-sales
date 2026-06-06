import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const LOCK_FILE = ".server-wa.lock";
const GLOBAL_BOOT_LOCK = ".wa-boot-restore.lock";
const LOCK_MAX_AGE_MS = 10 * 60 * 1000;
const GLOBAL_BOOT_LOCK_MAX_MS = 5 * 60 * 1000;

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
  lockPath: string,
  maxAgeMs: number
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
      const stale = age > maxAgeMs;
      const pidDead = pid > 0 && !isProcessAlive(pid);
      if (stale || pidDead || pid === process.pid) {
        await fs.rm(lockPath, { force: true }).catch(() => {});
        return tryAcquireLockFile(lockPath, maxAgeMs);
      }
    } catch {
      await fs.rm(lockPath, { force: true }).catch(() => {});
      return tryAcquireLockFile(lockPath, maxAgeMs);
    }
    return null;
  }
}

/** Only one Node process should run WhatsApp boot restore (Next.js may spawn multiple workers). */
export async function acquireGlobalWaBootLock(
  authDataPath: string,
  /** 0 = single attempt; do not spin until the lock frees or a second worker will restore twice. */
  maxWaitMs = 0
): Promise<(() => Promise<void>) | null> {
  await fs.mkdir(authDataPath, { recursive: true });
  const lockPath = path.join(authDataPath, GLOBAL_BOOT_LOCK);
  const deadline = Date.now() + maxWaitMs;

  do {
    const release = await tryAcquireLockFile(lockPath, GLOBAL_BOOT_LOCK_MAX_MS);
    if (release) return release;
    if (maxWaitMs <= 0) return null;
    await waitMs(500);
  } while (Date.now() < deadline);

  return null;
}

/** Wait until another process finishes boot restore. */
export async function waitForGlobalWaBootLockRelease(
  authDataPath: string,
  maxWaitMs = 90_000
): Promise<void> {
  const lockPath = path.join(authDataPath, GLOBAL_BOOT_LOCK);
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      await fs.access(lockPath);
      await waitMs(600);
    } catch {
      return;
    }
  }
}

/** One Node process per business may own the Chromium profile at a time. */
export async function acquireWaProcessLock(
  sessionDir: string,
  maxWaitMs = 15_000
): Promise<(() => Promise<void>) | null> {
  await fs.mkdir(sessionDir, { recursive: true });
  const lockPath = path.join(sessionDir, LOCK_FILE);
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const release = await tryAcquireLockFile(lockPath, LOCK_MAX_AGE_MS);
    if (release) return release;
    await waitMs(400);
  }

  return null;
}

/** Remove Chromium profile locks left after a crash (Windows/Linux). */
export async function releaseChromiumProfileLocks(
  sessionDir: string
): Promise<void> {
  const names = [
    "SingletonLock",
    "SingletonCookie",
    "SingletonSocket",
    "lockfile",
  ];
  for (const name of names) {
    await fs.rm(path.join(sessionDir, name), {
      force: true,
      recursive: true,
    }).catch(() => {});
  }
}

export function sessionDirForBusiness(
  authDataPath: string,
  businessId: number
): string {
  return path.join(authDataPath, `session-biz-${businessId}`);
}

/** True when LocalAuth session files exist (can reconnect without a new QR). */
export async function hasPersistedWhatsAppSession(
  authDataPath: string,
  businessId: number
): Promise<boolean> {
  const sessionDir = sessionDirForBusiness(authDataPath, businessId);
  try {
    await fs.access(sessionDir);
    const defaultDir = path.join(sessionDir, "Default");
    await fs.access(defaultDir);
    try {
      const idbDir = path.join(defaultDir, "IndexedDB");
      const entries = await fs.readdir(idbDir);
      if (entries.some((name) => name.includes("web.whatsapp.com"))) {
        return true;
      }
    } catch {
      /* IndexedDB path varies by Chromium version */
    }
    const localState = path.join(sessionDir, "Local State");
    await fs.access(localState);
    return true;
  } catch {
    return false;
  }
}

/** Stop headless Chrome still holding this WhatsApp session folder (Windows crash/hot reload). */
export async function killOrphanedChromiumForSession(
  sessionDir: string
): Promise<void> {
  const token = path.basename(sessionDir);
  if (!token) return;

  const pathNeedle = sessionDir.replace(/\\/g, "/");

  try {
    if (process.platform === "win32") {
      const escapedToken = token.replace(/'/g, "''");
      const escapedPath = pathNeedle.replace(/'/g, "''");
      await execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          [
            "$procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {",
            "($_.Name -eq 'chrome.exe' -or $_.Name -eq 'chromium.exe') -and (",
            `$_.CommandLine -like '*${escapedToken}*' -or $_.CommandLine -like '*${escapedPath}*'`,
            ")};",
            "foreach ($p in $procs) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }",
          ].join(" "),
        ],
        { timeout: 25_000, windowsHide: true }
      );
    } else {
      await execFileAsync("pkill", ["-f", token], { timeout: 10_000 });
    }
  } catch {
    /* no matching process */
  }
}

/** Clear stale Chromium locks before Puppeteer opens the WhatsApp profile. */
export async function prepareWhatsAppSessionDir(
  sessionDir: string,
  options?: { boot?: boolean }
): Promise<void> {
  const boot = options?.boot === true;
  const settleMs = boot ? (process.platform === "win32" ? 2500 : 900) : 400;

  for (let pass = 0; pass < (boot ? 3 : 1); pass++) {
    await killOrphanedChromiumForSession(sessionDir);
    await releaseChromiumProfileLocks(sessionDir);
    if (pass + 1 < (boot ? 3 : 1)) {
      await waitMs(settleMs);
    }
  }
  await waitMs(settleMs);
}

/** Delete saved LocalAuth session + web cache for a business. */
export async function purgePersistedWhatsAppSession(
  authDataPath: string,
  businessId: number
): Promise<void> {
  const sessionDir = sessionDirForBusiness(authDataPath, businessId);
  const cacheDir = path.join(authDataPath, "wwebjs_cache", `biz-${businessId}`);
  await fs.rm(sessionDir, { recursive: true, force: true }).catch(() => {});
  await fs.rm(cacheDir, { recursive: true, force: true }).catch(() => {});
}

const SESSION_READY_FILE = ".wa-session-ready.json";

/** Written when WhatsApp reaches ready — confirms session was saved successfully. */
export async function writeSessionReadyMarker(
  sessionDir: string,
  meta: { businessId: number; phone: string }
): Promise<void> {
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(
    path.join(sessionDir, SESSION_READY_FILE),
    JSON.stringify({
      businessId: meta.businessId,
      phone: meta.phone,
      savedAt: new Date().toISOString(),
    }),
    "utf8"
  );
}

export async function readSessionReadyMarker(
  sessionDir: string
): Promise<{ businessId: number; phone: string; savedAt: string } | null> {
  try {
    const raw = await fs.readFile(
      path.join(sessionDir, SESSION_READY_FILE),
      "utf8"
    );
    const v = JSON.parse(raw) as {
      businessId?: number;
      phone?: string;
      savedAt?: string;
    };
    if (!v.businessId || !v.phone) return null;
    return {
      businessId: v.businessId,
      phone: v.phone,
      savedAt: v.savedAt ?? "",
    };
  } catch {
    return null;
  }
}
