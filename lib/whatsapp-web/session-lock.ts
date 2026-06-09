import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const LOCK_FILE = ".server-wa.lock";
const GLOBAL_BOOT_LOCK = ".wa-boot-restore.lock";
const CHROMIUM_PID_FILE = ".chromium.pid";
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

/** True when another live Node process holds the global boot-restore lock. */
export async function isGlobalWaBootLockHeldByAlivePeer(
  authDataPath: string
): Promise<boolean> {
  const lockPath = path.join(authDataPath, GLOBAL_BOOT_LOCK);
  try {
    const raw = await fs.readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw) as { pid?: number; startedAt?: number };
    const pid = parsed.pid ?? 0;
    if (pid <= 0 || pid === process.pid) return false;
    const age = Date.now() - (parsed.startedAt ?? 0);
    if (age > GLOBAL_BOOT_LOCK_MAX_MS) return false;
    return isProcessAlive(pid);
  } catch {
    return false;
  }
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

/** Drop `.server-wa.lock` when the owning PID is no longer running. */
export async function clearStaleWaProcessLockIfDead(
  sessionDir: string
): Promise<boolean> {
  const lockPath = path.join(sessionDir, LOCK_FILE);
  try {
    const raw = await fs.readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw) as { pid?: number; startedAt?: number };
    const pid = parsed.pid ?? 0;
    if (pid > 0 && !isProcessAlive(pid)) {
      await fs.rm(lockPath, { force: true }).catch(() => {});
      return true;
    }
  } catch {
    /* no lock or unreadable */
  }
  return false;
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
    await clearStaleWaProcessLockIfDead(sessionDir);
    const release = await tryAcquireLockFile(lockPath, LOCK_MAX_AGE_MS);
    if (release) return release;
    await waitMs(400);
  }

  return null;
}

/** Delete Chromium singleton locks under `Default/` before boot restore. */
export async function releaseChromiumDefaultProfileLocks(
  sessionDir: string
): Promise<void> {
  const defaultDir = path.join(sessionDir, "Default");
  const names = ["SingletonLock", "SingletonSocket", "SingletonCookie"];
  for (const name of names) {
    await fs.rm(path.join(defaultDir, name), {
      force: true,
      recursive: true,
    }).catch(() => {});
  }
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
  await removeChromiumSingletonLocksRecursive(sessionDir);
}

/** Walk session profile tree and delete Singleton* lock files (Chromium may nest them). */
export async function removeChromiumSingletonLocksRecursive(
  dir: string,
  depth = 0
): Promise<void> {
  if (depth > 8) return;
  let entries: { name: string; isDirectory: () => boolean }[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name.startsWith("Singleton")) {
      await fs.rm(fullPath, { force: true, recursive: true }).catch(() => {});
      continue;
    }
    if (entry.isDirectory()) {
      await removeChromiumSingletonLocksRecursive(fullPath, depth + 1);
    }
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

/** Stop a Chromium process tree by PID (Windows: taskkill /T /F). */
export async function killProcessTree(pid: number): Promise<void> {
  if (!Number.isFinite(pid) || pid <= 0) return;
  try {
    if (process.platform === "win32") {
      await execFileAsync(
        "taskkill",
        ["/PID", String(pid), "/T", "/F"],
        { timeout: 15_000, windowsHide: true }
      );
    } else {
      try {
        process.kill(-pid, "SIGKILL");
      } catch {
        process.kill(pid, "SIGKILL");
      }
    }
  } catch {
    /* already exited */
  }
}

export async function writeChromiumPid(
  sessionDir: string,
  pid: number
): Promise<void> {
  if (!Number.isFinite(pid) || pid <= 0) return;
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(
    path.join(sessionDir, CHROMIUM_PID_FILE),
    String(pid),
    "utf8"
  );
}

export async function clearChromiumPid(sessionDir: string): Promise<void> {
  await fs.rm(path.join(sessionDir, CHROMIUM_PID_FILE), { force: true }).catch(
    () => {}
  );
}

/** Kill Chromium PID saved from the last successful session (if still running). */
export async function killStoredChromiumPid(
  sessionDir: string
): Promise<boolean> {
  try {
    const raw = await fs.readFile(
      path.join(sessionDir, CHROMIUM_PID_FILE),
      "utf8"
    );
    const pid = Number.parseInt(raw.trim(), 10);
    if (pid > 0 && isProcessAlive(pid)) {
      console.log("[whatsapp-web] stopping saved Chromium pid", pid);
      await killProcessTree(pid);
      await waitMs(process.platform === "win32" ? 1500 : 600);
      return true;
    }
  } catch {
    /* no pid file */
  }
  return false;
}

function sessionPathNeedles(sessionDir: string): string[] {
  const normalized = path.resolve(sessionDir);
  const forward = normalized.replace(/\\/g, "/");
  const backslash = normalized.replace(/\//g, "\\");
  const token = path.basename(sessionDir);
  const authToken = ".wwebjs_auth";
  return [...new Set([forward, backslash, token, authToken])];
}

async function killWindowsChromiumByCommandLine(
  needles: string[]
): Promise<number> {
  const escaped = needles
    .filter(Boolean)
    .map((n) => n.replace(/'/g, "''").replace(/"/g, '`"'));
  if (!escaped.length) return 0;

  const likeClauses = escaped
    .flatMap((n) => [
      `$_.CommandLine -like '*${n}*'`,
      `$_.CommandLine -like '*${n.toLowerCase()}*'`,
    ])
    .join(" -or ");

  const script = [
    "$killed = 0",
    "$names = @('chrome.exe','chromium.exe','chromedriver.exe','Google Chrome')",
    "Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {",
    "  $_.CommandLine -and ($names -contains $_.Name) -and (",
    `    ${likeClauses}`,
    "  )",
    "} | ForEach-Object {",
    "  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue",
    "  $killed++",
    "}",
    "Write-Output $killed",
  ].join("; ");

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
      ],
      { timeout: 30_000, windowsHide: true }
    );
    return Number.parseInt(String(stdout).trim(), 10) || 0;
  } catch {
    return 0;
  }
}

async function killUnixChromiumByCommandLine(needles: string[]): Promise<void> {
  for (const needle of needles) {
    if (!needle || needle.length < 4) continue;
    try {
      await execFileAsync("pkill", ["-f", needle], { timeout: 10_000 });
    } catch {
      /* none matched */
    }
  }
}

export async function killOrphanedChromiumForSession(
  sessionDir: string
): Promise<number> {
  const token = path.basename(sessionDir);
  if (!token) return 0;

  let killed = 0;
  if (await killStoredChromiumPid(sessionDir)) killed += 1;

  const needles = sessionPathNeedles(sessionDir);
  if (process.platform === "win32") {
    killed += await killWindowsChromiumByCommandLine(needles);
  } else {
    await killUnixChromiumByCommandLine(needles);
  }

  if (killed > 0) {
    console.log(
      "[whatsapp-web] closed",
      killed,
      "orphan browser process(es) for",
      token
    );
  }
  return killed;
}

/** On server boot — stop ANY Chromium still using this project's .wwebjs_auth profiles. */
export async function killAllWhatsAppChromiumUnderAuthPath(
  authDataPath: string
): Promise<void> {
  const authNeedles = sessionPathNeedles(path.resolve(authDataPath));
  if (process.platform === "win32") {
    const n = await killWindowsChromiumByCommandLine(authNeedles);
    if (n > 0) {
      console.log(
        "[whatsapp-web] boot cleanup — stopped",
        n,
        "Chromium process(es) under",
        authDataPath
      );
    }
  } else {
    await killUnixChromiumByCommandLine(authNeedles);
  }

  let names: string[];
  try {
    names = await fs.readdir(authDataPath);
  } catch {
    return;
  }

  for (const name of names.filter((n) => n.startsWith("session-biz-"))) {
    await killStoredChromiumPid(path.join(authDataPath, name));
  }
}

/** Before server boot restore — clean every saved session profile (orphan Chrome + locks). */
export async function prepareAllWhatsAppSessionsForBoot(
  authDataPath: string
): Promise<void> {
  await killAllWhatsAppChromiumUnderAuthPath(authDataPath);
  await waitMs(process.platform === "win32" ? 2000 : 800);

  let names: string[];
  try {
    names = await fs.readdir(authDataPath);
  } catch {
    return;
  }

  const sessionDirs = names
    .filter((name) => name.startsWith("session-biz-"))
    .map((name) => path.join(authDataPath, name));

  for (const sessionDir of sessionDirs) {
    await releaseChromiumDefaultProfileLocks(sessionDir);
    await prepareWhatsAppSessionDir(sessionDir, { boot: true, force: true });
  }
}

/** Clear stale Chromium locks before Puppeteer opens the WhatsApp profile. */
export async function prepareWhatsAppSessionDir(
  sessionDir: string,
  options?: { boot?: boolean; force?: boolean }
): Promise<void> {
  const boot = options?.boot === true;
  const force = options?.force === true || boot;
  const settleMs = force
    ? process.platform === "win32"
      ? 4000
      : 1500
    : boot
      ? process.platform === "win32"
        ? 3200
        : 1200
      : 500;
  const passes = force
    ? process.platform === "win32"
      ? 5
      : 4
    : boot
      ? process.platform === "win32"
        ? 4
        : 3
      : 1;

  for (let pass = 0; pass < passes; pass++) {
    await killOrphanedChromiumForSession(sessionDir);
    await releaseChromiumProfileLocks(sessionDir);
    if (pass + 1 < passes) {
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
