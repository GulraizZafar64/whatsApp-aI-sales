import path from "path";
import QRCode from "qrcode";
import {
  buildWhatsAppWebClientConfig,
  ensureWhatsAppAuthStorage,
  ensureWebVersionCacheDir,
  getWhatsAppAuthPath,
} from "@/lib/whatsapp-web/config";
import { ensureDb } from "@/lib/sequelize";
import { Business } from "@/lib/models";
import {
  enforceBusinessAccess,
  isAiReplyAllowedByBilling,
  isWhatsAppSessionAllowed,
  resolveBusinessAccess,
} from "@/lib/billing";
import { saveIncomingWhatsAppMessage } from "@/lib/whatsapp-webhook-save";
import { tryAutoReplyInboundWhatsApp } from "@/lib/whatsapp-inbound-ai";
import {
  acquireGlobalWaBootLock,
  acquireWaProcessLock,
  clearChromiumPid,
  clearStaleWaProcessLockIfDead,
  hasPersistedWhatsAppSession,
  killAllWhatsAppChromiumUnderAuthPath,
  killProcessTree,
  prepareAllWhatsAppSessionsForBoot,
  prepareWhatsAppSessionDir,
  releaseChromiumDefaultProfileLocks,
  sessionDirForBusiness,
  isGlobalWaBootLockHeldByAlivePeer,
  waitForGlobalWaBootLockRelease,
  writeChromiumPid,
  writeSessionReadyMarker,
} from "@/lib/whatsapp-web/session-lock";
import { resolveInboundSenderWaId } from "@/lib/wa-contact-id";
import {
  assertWhatsAppPhoneAvailable,
  persistWhatsAppNumberBinding,
} from "@/lib/whatsapp-phone-claim";
import { shouldSkipInboundWhatsAppWebMessage } from "@/lib/whatsapp-inbound-filter";
import {
  computeInboundSinceMs,
  inboundWaMessageAlreadySaved,
  isStaleInboundMessage,
} from "@/lib/whatsapp-inbound-cursor";

export type WaConnectionStatus =
  | "disconnected"
  | "connecting"
  | "qr"
  | "authenticated"
  | "ready"
  | "auth_failure";

type RuntimeClient = {
  businessId: number;
  status: WaConnectionStatus;
  qrDataUrl: string | null;
  phoneNumber: string | null;
  initializing: boolean;
  initError: string | null;
  client: import("whatsapp-web.js").Client | null;
  handledMessageIds: Set<string>;
  releaseProcessLock: (() => Promise<void>) | null;
  /** Ignore inbound auto-replies for messages received before this time. */
  inboundSinceMs: number;
  /** When true, inbound without a timestamp is treated as stale (session restore). */
  strictInboundTimestamp: boolean;
  inboundListenerAttached: boolean;
  /** Restore watchdog — retry if `ready` never follows `authenticated`. */
  authenticatedWatchdog: ReturnType<typeof setTimeout> | null;
  restoreWatchdogTriggered: boolean;
};

const runtime = new Map<number, RuntimeClient>();
const startPromises = new Map<
  number,
  Promise<{
    status: WaConnectionStatus;
    qrDataUrl: string | null;
    error?: string;
  }>
>();
const AUTH_DATA_PATH = getWhatsAppAuthPath();

/** User explicitly disconnected from dashboard — persist disconnected in DB. */
const intentionalDisconnectIds = new Set<number>();

let restorePromise: Promise<void> | null = null;
let restoreCompleted = false;
let shutdownHooksRegistered = false;
const reconnectTimers = new Map<number, ReturnType<typeof setTimeout>>();
/** Businesses with an active start job (includes init retries). */
const startingBusinessIds = new Set<number>();
/** Skip disconnected→reconnect while we intentionally tear down Chromium for a retry. */
const skipDisconnectReconnectIds = new Set<number>();
const serverBootTimeMs = Date.now();

/** Per-business restore jobs — prevents duplicate concurrent silent restores. */
const restoreInProgress = new Set<number>();

const RESTORE_FAILED_MSG = "Session expired, please scan QR again.";
const RESTORE_AUTHENTICATED_WATCHDOG_MS = 60_000;

export function isBusinessRestoreInProgress(businessId: number): boolean {
  return restoreInProgress.has(businessId);
}

function formatInitError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

function isRetryableBrowserInitError(message: string): boolean {
  return (
    isBrowserAlreadyRunningError(message) ||
    /detached|target closed|protocol error|execution context|navigation/i.test(
      message
    ) ||
    /ebusy|eacces|profile.*in use|user data dir|lockfile|resource temporarily unavailable|econnreset|socket hang up/i.test(
      message
    )
  );
}

function maxInitAttempts(silentRestore: boolean): number {
  if (!silentRestore) return 2;
  return 8;
}

function initRetryBackoffMs(
  silentRestore: boolean,
  attempt: number,
  browserAlreadyRunning: boolean
): number {
  if (!silentRestore) return 800;
  const base = process.platform === "win32" ? 2800 : 1600;
  const mult = browserAlreadyRunning ? 3 : 1.25;
  return Math.round(base * (attempt + 1) * mult);
}

function isLogoutDisconnect(reason: unknown): boolean {
  const r = String(reason ?? "").toUpperCase();
  return r === "LOGOUT" || r.includes("LOGOUT");
}

function getMessageId(msg: import("whatsapp-web.js").Message): string {
  const id = msg.id as { _serialized?: string } | undefined;
  return id?._serialized ?? `${msg.from}-${msg.timestamp}-${msg.body?.slice(0, 20) ?? ""}`;
}

function isBrowserAlreadyRunningError(message: string): boolean {
  return /browser is already running/i.test(message);
}

function clearAuthenticatedWatchdog(r: RuntimeClient): void {
  if (r.authenticatedWatchdog) {
    clearTimeout(r.authenticatedWatchdog);
    r.authenticatedWatchdog = null;
  }
}

async function markRestoreFailed(businessId: number): Promise<void> {
  const r = runtime.get(businessId);
  if (r) {
    clearAuthenticatedWatchdog(r);
    r.status = "disconnected";
    r.initializing = false;
    r.initError = RESTORE_FAILED_MSG;
    r.restoreWatchdogTriggered = false;
  }
  await persistBusinessWaState(businessId, {
    waStatus: "restore_failed",
    waQrDataUrl: null,
  });
  console.warn("[whatsapp-web] restore failed — scan QR again", businessId);
}

async function handleRestoreAttemptsExhausted(
  businessId: number,
  reason: string
): Promise<void> {
  console.warn(
    "[whatsapp-web] restore retries exhausted",
    businessId,
    reason.slice(0, 120)
  );
  await destroyClient(businessId, { suppressDisconnectReconnect: true });
  await markRestoreFailed(businessId);
}

function startAuthenticatedWatchdog(
  businessId: number,
  attempt: number,
  sessionDir: string
): void {
  const r = runtime.get(businessId);
  if (!r) return;
  clearAuthenticatedWatchdog(r);
  r.authenticatedWatchdog = setTimeout(() => {
    r.authenticatedWatchdog = null;
    void handleAuthenticatedWatchdog(businessId, attempt, sessionDir);
  }, RESTORE_AUTHENTICATED_WATCHDOG_MS);
}

async function handleAuthenticatedWatchdog(
  businessId: number,
  attempt: number,
  sessionDir: string
): Promise<void> {
  const r = runtime.get(businessId);
  if (!r || r.status === "ready" || r.status !== "authenticated") return;

  console.warn(
    "[whatsapp-web] authenticated watchdog — ready not received in 60s, retrying",
    businessId
  );

  if (attempt + 1 >= maxInitAttempts(true)) {
    await handleRestoreAttemptsExhausted(
      businessId,
      "authenticated watchdog timeout"
    );
    return;
  }

  r.restoreWatchdogTriggered = true;
  r.initializing = false;
  skipDisconnectReconnectIds.add(businessId);

  if (r.client) {
    try {
      await r.client.destroy();
    } catch {
      /* ignore */
    }
    r.client = null;
  }

  await releaseChromiumDefaultProfileLocks(sessionDir);
  await prepareWhatsAppSessionDir(sessionDir, { boot: true, force: true });
  await sleep(process.platform === "win32" ? 3000 : 1500);

  void runStartWhatsAppClient(businessId, { restore: true }, attempt + 1).catch(
    (err) => {
      console.error("[whatsapp-web] watchdog restore retry failed", businessId, err);
    }
  );
}

async function waitForSilentRestoreCompletion(
  businessId: number,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = runtime.get(businessId);
    if (!r) return;
    if (
      r.status === "ready" ||
      r.status === "qr" ||
      r.status === "auth_failure"
    ) {
      return;
    }
    if (r.restoreWatchdogTriggered) return;
    await sleep(400);
  }
}

async function persistBusinessWaState(
  businessId: number,
  patch: Partial<{
    waStatus: string;
    waQrDataUrl: string | null;
    whatsappNumber: string | null;
    waConnectedAt: Date | null;
  }>
): Promise<void> {
  await ensureDb();
  const row = await Business.findByPk(businessId);
  if (!row) return;
  const dbPatch: Record<string, unknown> = { ...patch };
  if (patch.waStatus === "authenticated") {
    dbPatch.waStatus = "qr";
  }
  await row.update(dbPatch);
}

async function loadPersistedWaState(businessId: number): Promise<{
  status: WaConnectionStatus;
  qrDataUrl: string | null;
  phoneNumber: string | null;
}> {
  await ensureDb();
  const row = await Business.findByPk(businessId);
  const status = (row?.waStatus ?? "disconnected") as WaConnectionStatus;
  return {
    status,
    qrDataUrl: row?.waQrDataUrl ?? null,
    phoneNumber: row?.whatsappNumber ?? null,
  };
}

function getOrCreateRuntime(businessId: number): RuntimeClient {
  let r = runtime.get(businessId);
  if (!r) {
    r = {
      businessId,
      status: "disconnected",
      qrDataUrl: null,
      phoneNumber: null,
      initializing: false,
      initError: null,
      client: null,
      handledMessageIds: new Set(),
      releaseProcessLock: null,
      inboundSinceMs: serverBootTimeMs,
      strictInboundTimestamp: true,
      inboundListenerAttached: false,
      authenticatedWatchdog: null,
      restoreWatchdogTriggered: false,
    };
    runtime.set(businessId, r);
  }
  return r;
}

export function getWhatsAppRuntimeStatus(businessId: number): {
  status: WaConnectionStatus;
  qrDataUrl: string | null;
  phoneNumber: string | null;
  initError: string | null;
} {
  const r = runtime.get(businessId);
  return {
    status: r?.status ?? "disconnected",
    qrDataUrl: r?.qrDataUrl ?? null,
    phoneNumber: r?.phoneNumber ?? null,
    initError: r?.initError ?? null,
  };
}

export function getWhatsAppRestoreState(): {
  completed: boolean;
  inProgress: boolean;
} {
  return {
    completed: restoreCompleted,
    inProgress: restorePromise != null && !restoreCompleted,
  };
}

/** Start background restore if needed — never blocks HTTP handlers. */
export function kickoffWhatsAppRestoreIfNeeded(businessId?: number): void {
  if (businessId !== undefined && restoreInProgress.has(businessId)) return;
  if (restoreCompleted || restorePromise) return;
  void ensureWhatsAppRestoreStarted();
}

/**
 * Call once at server boot — creates session folders and registers clean shutdown.
 * Returns false when another live process is restoring (skip kill + restore in this worker).
 */
export async function initWhatsAppSessionStorage(): Promise<boolean> {
  await ensureWhatsAppAuthStorage();
  registerWhatsAppShutdownHandlers();

  if (await isGlobalWaBootLockHeldByAlivePeer(AUTH_DATA_PATH)) {
    console.log(
      "[whatsapp-web] another process is restoring WhatsApp — skipping chrome cleanup in this worker"
    );
    return false;
  }

  await killAllWhatsAppChromiumUnderAuthPath(AUTH_DATA_PATH);
  return true;
}

/** Close Chromium cleanly on server stop so the session profile is not corrupted. */
export function registerWhatsAppShutdownHandlers(): void {
  if (shutdownHooksRegistered) return;
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  shutdownHooksRegistered = true;

  const graceful = (signal: string) => {
    void (async () => {
      const ids = [...runtime.keys()];
      if (ids.length === 0) return;
      console.log(`[whatsapp-web] ${signal} — closing ${ids.length} browser(s)`);
      for (const id of ids) {
        skipDisconnectReconnectIds.add(id);
        await destroyClient(id, {
          suppressDisconnectReconnect: true,
        }).catch(() => {});
      }
      await sleep(process.platform === "win32" ? 1200 : 600);
    })();
  };

  process.once("SIGINT", () => graceful("SIGINT"));
  process.once("SIGTERM", () => graceful("SIGTERM"));
  process.once("beforeExit", () => {
    for (const id of runtime.keys()) {
      skipDisconnectReconnectIds.add(id);
      const r = runtime.get(id);
      if (!r?.client) continue;
      const sessionDir = sessionDirForBusiness(AUTH_DATA_PATH, id);
      void closeClientBrowser(r.client, sessionDir).catch(() => {});
    }
  });
}

export function isWhatsAppClientStartInFlight(businessId: number): boolean {
  return (
    startingBusinessIds.has(businessId) ||
    startPromises.has(businessId) ||
    Boolean(runtime.get(businessId)?.initializing)
  );
}

async function closeClientBrowser(
  client: import("whatsapp-web.js").Client,
  sessionDir?: string
): Promise<void> {
  const pup = client as {
    pupBrowser?: {
      close: () => Promise<void>;
      process?: () => { pid?: number; kill: (signal: string) => void } | null;
    };
  };
  const pid = pup.pupBrowser?.process?.()?.pid;
  try {
    if (pup.pupBrowser) {
      await pup.pupBrowser.close();
      try {
        const proc = pup.pupBrowser.process?.();
        if (proc) proc.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  if (pid && Number.isFinite(pid)) {
    await killProcessTree(pid).catch(() => {});
  }
  if (sessionDir) {
    await clearChromiumPid(sessionDir);
  }
  try {
    await client.destroy();
  } catch {
    /* ignore */
  }
}

async function destroyClient(
  businessId: number,
  options?: {
    suppressDisconnectReconnect?: boolean;
    keepInitializing?: boolean;
    /** Keep per-business file lock during init retries (prevents parallel Chromium launches). */
    keepProcessLock?: boolean;
  }
): Promise<void> {
  const r = runtime.get(businessId);
  if (!r) return;

  if (options?.suppressDisconnectReconnect) {
    skipDisconnectReconnectIds.add(businessId);
  }

  if (r.client) {
    await closeClientBrowser(r.client, sessionDirForBusiness(AUTH_DATA_PATH, businessId));
    r.client = null;
  }

  clearAuthenticatedWatchdog(r);

  if (r.releaseProcessLock && !options?.keepProcessLock) {
    await r.releaseProcessLock().catch(() => {});
    r.releaseProcessLock = null;
  }

  if (!options?.keepInitializing) {
    r.initializing = false;
  }
  const sessionDir = sessionDirForBusiness(AUTH_DATA_PATH, businessId);
  await prepareWhatsAppSessionDir(sessionDir, { force: true });

  if (options?.suppressDisconnectReconnect) {
    setTimeout(() => skipDisconnectReconnectIds.delete(businessId), 500);
  }
}

export async function prepareWhatsAppSession(businessId: number): Promise<void> {
  await destroyClient(businessId);
  const sessionDir = sessionDirForBusiness(AUTH_DATA_PATH, businessId);
  await prepareWhatsAppSessionDir(sessionDir);
  await sleep(500);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scheduleWhatsAppReconnect(businessId: number, delayMs = 4000): void {
  if (startingBusinessIds.has(businessId) || startPromises.has(businessId)) return;
  if (restorePromise && !restoreCompleted) return;

  const existing = reconnectTimers.get(businessId);
  if (existing) clearTimeout(existing);
  reconnectTimers.set(
    businessId,
    setTimeout(() => {
      reconnectTimers.delete(businessId);
      void (async () => {
        if (startingBusinessIds.has(businessId) || startPromises.has(businessId)) {
          return;
        }
        await ensureDb();
        const row = await Business.findByPk(businessId);
        if (!row || !resolveBusinessAccess(row).allowed) return;
        if (row.waStatus === "restore_failed") return;

        const r = runtime.get(businessId);
        if (r?.status === "ready" && r.client) return;

        const hasSession = await hasPersistedWhatsAppSession(
          AUTH_DATA_PATH,
          businessId
        );
        if (!hasSession) return;
        console.log("[whatsapp-web] reconnecting after disconnect", businessId);
        await startWhatsAppClient(businessId, { restore: true });
      })().catch((err) => {
        console.error("[whatsapp-web] reconnect failed", businessId, err);
      });
    }, delayMs)
  );
}

/** Wait until runtime client is ready (starts restore if DB/session allow). */
export async function waitForWhatsAppReady(
  businessId: number,
  timeoutMs = 120_000
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const r = runtime.get(businessId);
    if (r?.status === "ready" && r.client) return true;
    if (r?.status === "auth_failure") return false;
    if (r?.status === "qr" && r.qrDataUrl) return false;

    if (
      !startPromises.has(businessId) &&
      !r?.initializing &&
      restoreCompleted
    ) {
      await ensureDb();
      const row = await Business.findByPk(businessId);
      const hasSession = await hasPersistedWhatsAppSession(
        AUTH_DATA_PATH,
        businessId
      );
      const shouldStart =
        hasSession &&
        row &&
        row.waStatus !== "auth_failure" &&
        row.waStatus !== "disconnected" &&
        row.waStatus !== "restore_failed";
      if (shouldStart) {
        void startWhatsAppClient(businessId, { restore: true });
      }
    }

    await sleep(500);
  }

  const r = runtime.get(businessId);
  return r?.status === "ready" && Boolean(r.client);
}

async function waitForQrOrReady(
  businessId: number,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = runtime.get(businessId);
    if (!r) return;
    if (r.qrDataUrl || r.status === "ready" || r.status === "auth_failure") {
      return;
    }
    if (r.initError) return;
    await sleep(400);
  }
}

async function handleInboundWebMessage(
  businessId: number,
  msg: import("whatsapp-web.js").Message
): Promise<void> {
  const ready = await waitForWhatsAppReady(businessId, 90_000);
  if (!ready) {
    console.warn(
      "[whatsapp-web] inbound skipped — WhatsApp not ready for business",
      businessId
    );
    return;
  }

  const r = runtime.get(businessId);
  if (!r) return;

  const id = getMessageId(msg);
  if (r.handledMessageIds.has(id)) return;

  if (msg.fromMe) return;
  if (shouldSkipInboundWhatsAppWebMessage(msg)) return;

  if (
    isStaleInboundMessage(msg, r.inboundSinceMs, {
      strictNoTimestamp: r.strictInboundTimestamp,
    })
  ) {
    console.log(
      "[whatsapp-web] skip stale inbound after reconnect",
      businessId,
      id
    );
    r.handledMessageIds.add(id);
    return;
  }

  if (await inboundWaMessageAlreadySaved(businessId, id)) {
    console.log("[whatsapp-web] skip duplicate inbound", businessId, id);
    r.handledMessageIds.add(id);
    return;
  }

  r.handledMessageIds.add(id);
  if (r.handledMessageIds.size > 5000) {
    r.handledMessageIds.clear();
  }

  await ensureDb();
  const business = await Business.findByPk(businessId);
  if (!business) return;

  const access = await enforceBusinessAccess(business, business.ownerUserId);
  if (!isWhatsAppSessionAllowed(access)) return;

  const chatId = msg.from;
  if (!chatId) return;

  const contact = await msg.getContact().catch(() => null);
  const senderWaId = resolveInboundSenderWaId({
    chatId,
    contactNumber: contact?.number ?? null,
    contactIdUser:
      typeof contact?.id?.user === "string" ? contact.id.user : null,
  });
  const senderName =
    contact?.pushname?.trim() || contact?.name?.trim() || null;

  let userText = "";
  let messageType = "text";
  let isCustomerAudio = false;
  let isCustomerImage = false;
  let webAudioBuffer: Buffer | undefined;
  let webAudioMime = "audio/ogg";
  let webImageBuffer: Buffer | undefined;
  let webImageMime = "image/jpeg";

  if (msg.hasMedia) {
    const media = await msg.downloadMedia().catch(() => null);
    if (msg.type === "ptt" || msg.type === "audio") {
      messageType = "audio";
      isCustomerAudio = true;
      userText = "[Voice message]";
      if (media?.data) {
        webAudioBuffer = Buffer.from(media.data, "base64");
        webAudioMime = media.mimetype || webAudioMime;
      }
    } else if (msg.type === "image") {
      messageType = "image";
      isCustomerImage = true;
      userText = msg.body?.trim() ? `[Image] ${msg.body.trim()}` : "[Image]";
      if (media?.data) {
        webImageBuffer = Buffer.from(media.data, "base64");
        webImageMime = media.mimetype || webImageMime;
      }
    } else {
      messageType = msg.type;
      userText = msg.body?.trim() || `[${msg.type}]`;
    }
  } else {
    userText = msg.body?.trim() || "";
  }

  await saveIncomingWhatsAppMessage(
    businessId,
    {
      from: senderWaId,
      type: messageType,
      text: userText ? { body: userText } : undefined,
      audio: isCustomerAudio ? { voice: true } : undefined,
      image: isCustomerImage
        ? { caption: msg.body?.trim() || undefined }
        : undefined,
    },
    {
      senderName: senderName ?? undefined,
      whatsappChatId: chatId,
      waMessageKey: id,
    }
  );

  const skipAi = !isAiReplyAllowedByBilling(access);

  if (!skipAi) {
    void tryAutoReplyInboundWhatsApp({
      businessId,
      contactWaId: senderWaId,
      whatsappChatId: chatId,
      userText,
      senderName: senderName ?? undefined,
      messageType,
      isCustomerAudio,
      isCustomerImage,
      webAudioBuffer,
      webAudioMime,
      webImageBuffer,
      webImageMime,
      replyToMessage: msg,
    }).catch((err) => {
      console.error("[whatsapp-web] auto-reply error:", err);
    });
  }
}

async function runStartWhatsAppClient(
  businessId: number,
  options?: { force?: boolean; restore?: boolean },
  attempt = 0
): Promise<{
  status: WaConnectionStatus;
  qrDataUrl: string | null;
  error?: string;
}> {
  const r = getOrCreateRuntime(businessId);
  const sessionDir = sessionDirForBusiness(AUTH_DATA_PATH, businessId);

  await ensureDb();
  const businessRow = await Business.findByPk(businessId);
  if (businessRow) {
    const access = resolveBusinessAccess(businessRow);
    if (!isWhatsAppSessionAllowed(access)) {
      return {
        status: "disconnected",
        qrDataUrl: null,
        error: "Your trial has ended. Subscribe to connect WhatsApp.",
      };
    }
  }

  const activeSession =
    r.status === "connecting" ||
    r.status === "qr" ||
    r.status === "authenticated" ||
    r.status === "ready";

  if (
    !options?.force &&
    attempt === 0 &&
    (r.initializing || (r.client && activeSession))
  ) {
    await waitForQrOrReady(businessId, 120_000);
    return {
      status: r.status,
      qrDataUrl: r.qrDataUrl,
      error: r.initError ?? undefined,
    };
  }

  if (options?.force) {
    await prepareWhatsAppSession(businessId);
  }

  const silentRestore =
    Boolean(options?.restore) &&
    !options?.force &&
    (await hasPersistedWhatsAppSession(AUTH_DATA_PATH, businessId));

  let releaseLock = r.releaseProcessLock;
  if (!releaseLock) {
    releaseLock = await acquireWaProcessLock(
      sessionDir,
      silentRestore ? 45_000 : 15_000
    );
    if (!releaseLock) {
      const persisted = await loadPersistedWaState(businessId);
      const local = getWhatsAppRuntimeStatus(businessId);
      if (silentRestore) {
        scheduleWhatsAppReconnect(
          businessId,
          process.platform === "win32" ? 10_000 : 6000
        );
      }
      return {
        status:
          local.status !== "disconnected" ? local.status : persisted.status,
        qrDataUrl: local.qrDataUrl ?? persisted.qrDataUrl,
        error:
          local.initError ??
          "WhatsApp is starting in another server process. Wait a moment and refresh.",
      };
    }
    r.releaseProcessLock = releaseLock;
  }

  if (r.client) {
    await destroyClient(businessId, {
      keepProcessLock: true,
    });
    await sleep(600);
  }

  r.initializing = true;
  r.initError = null;
  r.status = "connecting";
  r.qrDataUrl = null;
  r.handledMessageIds.clear();
  r.inboundListenerAttached = false;
  r.strictInboundTimestamp = Boolean(options?.restore);
  r.restoreWatchdogTriggered = false;
  clearAuthenticatedWatchdog(r);

  await releaseChromiumDefaultProfileLocks(sessionDir);
  await clearStaleWaProcessLockIfDead(sessionDir);
  await prepareWhatsAppSessionDir(sessionDir, {
    boot: silentRestore && attempt === 0,
  });

  if (!silentRestore) {
    void persistBusinessWaState(businessId, {
      waStatus: "connecting",
      waQrDataUrl: null,
    });
  } else if (silentRestore && attempt === 0) {
    console.log(
      "[whatsapp-web] restoring saved session for business",
      businessId
    );
  }

  const { Client, LocalAuth } = await import("whatsapp-web.js");

  const waConfig = buildWhatsAppWebClientConfig(businessId);
  await ensureWebVersionCacheDir(businessId);

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: AUTH_DATA_PATH,
      clientId: `biz-${businessId}`,
    }),
    puppeteer: waConfig.puppeteer,
    webVersionCache: waConfig.webVersionCache,
  });

  r.client = client;

  const onWhatsAppMessage = (msg: import("whatsapp-web.js").Message) => {
    void handleInboundWebMessage(businessId, msg);
  };

  const attachInboundListener = () => {
    if (r.inboundListenerAttached) return;
    r.inboundListenerAttached = true;
    client.on("message_create", onWhatsAppMessage);
  };

  client.on("qr", async (qr) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(qr);
      r.initError = null;
      r.status = "qr";
      r.qrDataUrl = qrDataUrl;
      console.log("[whatsapp-web] QR ready for business", businessId);
      await persistBusinessWaState(businessId, {
        waStatus: "qr",
        waQrDataUrl: qrDataUrl,
      });
    } catch (err) {
      console.error("[whatsapp-web] QR encode failed:", err);
    }
  });

  client.on("authenticated", async () => {
    r.status = "authenticated";
    console.log("[whatsapp-web] authenticated", businessId);
    await persistBusinessWaState(businessId, { waStatus: "qr" });
    if (silentRestore) {
      startAuthenticatedWatchdog(businessId, attempt, sessionDir);
    }
  });

  client.on("ready", async () => {
    clearAuthenticatedWatchdog(r);
    await ensureDb();

    const wid = client.info?.wid?.user ?? "";
    const phone = wid.replace(/\D/g, "") || wid;

    if (phone) {
      const claim = await assertWhatsAppPhoneAvailable(businessId, phone);
      if (!claim.ok) {
        console.warn(
          "[whatsapp-web] rejected phone claim",
          phone,
          claim.reason,
          "business",
          claim.ownerBusinessId
        );
        intentionalDisconnectIds.add(businessId);
        r.status = "auth_failure";
        r.qrDataUrl = null;
        r.phoneNumber = null;
        r.initializing = false;
        r.initError = claim.message;
        try {
          await client.logout();
        } catch {
          /* ignore */
        }
        await destroyClient(businessId);
        await persistBusinessWaState(businessId, {
          waStatus: "auth_failure",
          waQrDataUrl: null,
          whatsappNumber: null,
        });
        return;
      }
    }

    r.status = "ready";
    r.qrDataUrl = null;
    r.phoneNumber = phone;
    r.initializing = false;
    r.inboundSinceMs = await computeInboundSinceMs(businessId, serverBootTimeMs);
    r.strictInboundTimestamp = Boolean(options?.restore);
    attachInboundListener();
    console.log(
      "[whatsapp-web] ready",
      businessId,
      phone,
      "inbound since",
      new Date(r.inboundSinceMs).toISOString()
    );

    const connectedAt = new Date();

    await persistBusinessWaState(businessId, {
      waStatus: "ready",
      waQrDataUrl: null,
      whatsappNumber: phone || null,
    });
    if (phone) {
      await persistWhatsAppNumberBinding(businessId, phone);
      const verify = await assertWhatsAppPhoneAvailable(businessId, phone);
      if (!verify.ok) {
        console.warn(
          "[whatsapp-web] binding verify failed after ready",
          phone,
          verify.reason
        );
        intentionalDisconnectIds.add(businessId);
        r.status = "auth_failure";
        r.qrDataUrl = null;
        r.phoneNumber = null;
        r.initializing = false;
        r.initError = verify.message;
        try {
          await client.logout();
        } catch {
          /* ignore */
        }
        await destroyClient(businessId);
        await persistBusinessWaState(businessId, {
          waStatus: "auth_failure",
          waQrDataUrl: null,
          whatsappNumber: null,
        });
        return;
      }
    }
    const row = await Business.findByPk(businessId);
    if (row) {
      await row.update({
        waConnectedAt: row.waConnectedAt ?? connectedAt,
      });
    }

    const sessionDir = sessionDirForBusiness(AUTH_DATA_PATH, businessId);
    await writeSessionReadyMarker(sessionDir, { businessId, phone }).catch(
      (err) => {
        console.warn("[whatsapp-web] session marker write failed", businessId, err);
      }
    );
    const browserPid = (client as {
      pupBrowser?: { process?: () => { pid?: number } | null };
    }).pupBrowser?.process?.()?.pid;
    if (browserPid && Number.isFinite(browserPid)) {
      await writeChromiumPid(sessionDir, browserPid).catch(() => {});
    }
    console.log("[whatsapp-web] session saved to disk", sessionDir);
  });

  client.on("auth_failure", async (msg) => {
    console.error("[whatsapp-web] auth_failure", businessId, msg);
    r.status = "auth_failure";
    r.qrDataUrl = null;
    r.initializing = false;
    r.initError = "WhatsApp authentication failed";
    await persistBusinessWaState(businessId, {
      waStatus: "auth_failure",
      waQrDataUrl: null,
    });
  });

  client.on("disconnected", async (reason) => {
    console.warn("[whatsapp-web] disconnected", businessId, reason);
    r.status = "disconnected";
    r.client = null;
    r.initializing = false;
    if (r.releaseProcessLock) {
      await r.releaseProcessLock().catch(() => {});
      r.releaseProcessLock = null;
    }

    if (intentionalDisconnectIds.has(businessId)) {
      intentionalDisconnectIds.delete(businessId);
      await persistBusinessWaState(businessId, {
        waStatus: "disconnected",
        waQrDataUrl: null,
      });
      return;
    }

    if (isLogoutDisconnect(reason)) {
      await persistBusinessWaState(businessId, {
        waStatus: "disconnected",
        waQrDataUrl: null,
      });
      return;
    }

    if (skipDisconnectReconnectIds.has(businessId)) {
      return;
    }

    // Server restart / browser crash — keep DB as ready so we auto-reconnect on boot.
    const row = await Business.findByPk(businessId);
    if (row?.waStatus === "ready") {
      console.log(
        "[whatsapp-web] transient disconnect; keeping ready in DB for restore",
        businessId
      );
    }

    scheduleWhatsAppReconnect(businessId);
  });

  try {
    await client.initialize();
  } catch (err: unknown) {
    const message = formatInitError(err);
    const browserBusy = isBrowserAlreadyRunningError(message);
    const retriesLeft = attempt + 1 < maxInitAttempts(silentRestore);
    if (retriesLeft && isRetryableBrowserInitError(message)) {
      const browserBusy = isBrowserAlreadyRunningError(message);
      console.warn(
        "[whatsapp-web] browser init glitch, retrying",
        businessId,
        `(attempt ${attempt + 2}/${maxInitAttempts(silentRestore)})`,
        message.slice(0, 120)
      );
      await destroyClient(businessId, {
        suppressDisconnectReconnect: true,
        keepInitializing: true,
        keepProcessLock: true,
      });
      await releaseChromiumDefaultProfileLocks(sessionDir);
      await prepareWhatsAppSessionDir(sessionDir, {
        boot: true,
        force: browserBusy,
      });
      await sleep(initRetryBackoffMs(silentRestore, attempt, browserBusy));
      return runStartWhatsAppClient(
        businessId,
        silentRestore ? { restore: true } : { force: true },
        attempt + 1
      );
    }
    if (r.qrDataUrl) {
      r.initializing = false;
      await waitForQrOrReady(businessId, 30_000);
      return {
        status: r.status,
        qrDataUrl: r.qrDataUrl,
        error: undefined,
      };
    }
    console.error("[whatsapp-web] initialize failed", businessId, message);
    r.initError = message;
    r.initializing = false;
    await destroyClient(businessId, { suppressDisconnectReconnect: true });
    if (silentRestore) {
      r.status = "disconnected";
      if (retriesLeft) {
        console.warn(
          "[whatsapp-web] restore init failed; will retry",
          businessId,
          message.slice(0, 120)
        );
        await sleep(initRetryBackoffMs(silentRestore, attempt, browserBusy));
        return runStartWhatsAppClient(
          businessId,
          { restore: true },
          attempt + 1
        );
      }
      await handleRestoreAttemptsExhausted(businessId, message);
      return {
        status: "disconnected",
        qrDataUrl: null,
        error: RESTORE_FAILED_MSG,
      };
    }
    r.status = "auth_failure";
    void persistBusinessWaState(businessId, { waStatus: "auth_failure" });
    return {
      status: r.status,
      qrDataUrl: r.qrDataUrl,
      error: message,
    };
  }

  if (silentRestore) {
    await waitForSilentRestoreCompletion(businessId, 120_000);
    const rAfterWait = runtime.get(businessId);
    if (rAfterWait?.restoreWatchdogTriggered) {
      return {
        status: rAfterWait.status,
        qrDataUrl: rAfterWait.qrDataUrl,
        error: rAfterWait.initError ?? undefined,
      };
    }
  } else {
    await waitForQrOrReady(businessId, 120_000);
  }

  const postWaitStatus = getWhatsAppRuntimeStatus(businessId).status;
  if (silentRestore && postWaitStatus === "authenticated") {
    if (attempt + 1 < maxInitAttempts(silentRestore)) {
      console.warn(
        "[whatsapp-web] stuck at authenticated after restore wait — retrying",
        businessId
      );
      clearAuthenticatedWatchdog(r);
      await destroyClient(businessId, {
        suppressDisconnectReconnect: true,
        keepProcessLock: true,
      });
      await releaseChromiumDefaultProfileLocks(sessionDir);
      await prepareWhatsAppSessionDir(sessionDir, { boot: true, force: true });
      await sleep(process.platform === "win32" ? 4000 : 2000);
      return runStartWhatsAppClient(businessId, { restore: true }, attempt + 1);
    }
    await handleRestoreAttemptsExhausted(
      businessId,
      "stuck at authenticated after restore wait"
    );
    return {
      status: "disconnected",
      qrDataUrl: null,
      error: RESTORE_FAILED_MSG,
    };
  }

  const runtimeStatus = getWhatsAppRuntimeStatus(businessId);
  r.initializing = runtimeStatus.status !== "ready";

  if (
    silentRestore &&
    runtimeStatus.status !== "ready" &&
    runtimeStatus.status !== "qr" &&
    runtimeStatus.status !== "auth_failure"
  ) {
    if (attempt + 1 >= maxInitAttempts(silentRestore)) {
      await handleRestoreAttemptsExhausted(
        businessId,
        `restore ended in ${runtimeStatus.status}`
      );
      return {
        status: "disconnected",
        qrDataUrl: null,
        error: RESTORE_FAILED_MSG,
      };
    }
    scheduleWhatsAppReconnect(
      businessId,
      process.platform === "win32" ? 8000 : 5000
    );
  }

  return {
    status: runtimeStatus.status,
    qrDataUrl: runtimeStatus.qrDataUrl,
    error: runtimeStatus.initError ?? undefined,
  };
}

export async function startWhatsAppClient(
  businessId: number,
  options?: { force?: boolean; restore?: boolean }
): Promise<{
  status: WaConnectionStatus;
  qrDataUrl: string | null;
  error?: string;
}> {
  if (options?.force) {
    startPromises.delete(businessId);
    startingBusinessIds.delete(businessId);
    restoreInProgress.delete(businessId);
  } else if (options?.restore) {
    if (restoreInProgress.has(businessId)) {
      const inFlight = startPromises.get(businessId);
      if (inFlight) return inFlight;
      return {
        status: "connecting",
        qrDataUrl: null,
      };
    }
    const inFlight = startPromises.get(businessId);
    if (inFlight) return inFlight;
    restoreInProgress.add(businessId);
  } else {
    const inFlight = startPromises.get(businessId);
    if (inFlight) return inFlight;
    if (startingBusinessIds.has(businessId)) {
      const pending = startPromises.get(businessId);
      if (pending) return pending;
    }
  }

  startingBusinessIds.add(businessId);
  const job = runStartWhatsAppClient(businessId, options)
    .finally(() => {
      startingBusinessIds.delete(businessId);
      if (options?.restore && !options?.force) {
        restoreInProgress.delete(businessId);
      }
      if (startPromises.get(businessId) === job) {
        startPromises.delete(businessId);
      }
    });
  startPromises.set(businessId, job);
  return job;
}

/** Send image in the same chat as the inbound message (reuses active session). */
export async function sendWhatsAppImageReply(
  msg: import("whatsapp-web.js").Message,
  buffer: Buffer,
  mimeType: string,
  caption?: string
): Promise<boolean> {
  try {
    const { MessageMedia } = await import("whatsapp-web.js");
    const media = new MessageMedia(
      mimeType,
      buffer.toString("base64"),
      `image.${mimeType.split("/")[1] || "jpg"}`
    );
    const chat = await msg.getChat();
    await chat.sendMessage(media, {
      caption: caption?.trim() || undefined,
    });
    return true;
  } catch (err) {
    console.warn("[whatsapp-web] sendWhatsAppImageReply failed:", err);
    return false;
  }
}

/** Send reply using msg.reply when possible (matches working whatsapp-web.js pattern). */
export async function sendWhatsAppReply(
  msg: import("whatsapp-web.js").Message,
  text: string
): Promise<void> {
  const body = text.trim();
  if (!body) return;

  try {
    await msg.reply(body);
    return;
  } catch (err) {
    console.warn("[whatsapp-web] msg.reply failed:", err);
  }

  const chat = await msg.getChat();
  const quotedId = (msg.id as { _serialized?: string } | undefined)?._serialized;

  try {
    if (quotedId) {
      await chat.sendMessage(body, { quotedMessageId: quotedId });
    } else {
      await chat.sendMessage(body);
    }
  } catch {
    await chat.sendMessage(body);
  }
}

export async function getWhatsAppClient(
  businessId: number
): Promise<import("whatsapp-web.js").Client | null> {
  const r = runtime.get(businessId);
  if (r?.status === "ready" && r.client) return r.client;
  return null;
}

export async function disconnectWhatsAppClient(
  businessId: number
): Promise<void> {
  intentionalDisconnectIds.add(businessId);
  const t = reconnectTimers.get(businessId);
  if (t) {
    clearTimeout(t);
    reconnectTimers.delete(businessId);
  }

  const r = runtime.get(businessId);
  if (r?.client) {
    try {
      await r.client.logout();
    } catch {
      /* ignore */
    }
  }

  await destroyClient(businessId);
  runtime.delete(businessId);
  startPromises.delete(businessId);
  startingBusinessIds.delete(businessId);

  // Deep purge session files so "Reload" requires a fresh scan.
  const { purgePersistedWhatsAppSession } = await import(
    "@/lib/whatsapp-web/session-lock"
  );
  await purgePersistedWhatsAppSession(AUTH_DATA_PATH, businessId);

  await persistBusinessWaState(businessId, {
    waStatus: "disconnected",
    waQrDataUrl: null,
    whatsappNumber: null,
  });
}

export async function restoreWhatsAppClients(): Promise<void> {
  await ensureDb();
  const rows = await Business.findAll({ limit: 50 });
  const toRestore: number[] = [];

  for (const b of rows) {
    if (runtime.get(b.id)?.status === "ready") continue;
    const access = resolveBusinessAccess(b);
    if (!isWhatsAppSessionAllowed(access)) continue;

    const hasSession = await hasPersistedWhatsAppSession(
      AUTH_DATA_PATH,
      b.id
    );
    // Reconnect on boot whenever session files exist (skip explicit dashboard disconnect).
    const shouldRestore =
      hasSession &&
      b.waStatus !== "disconnected" &&
      b.waStatus !== "auth_failure" &&
      b.waStatus !== "restore_failed";

    if (shouldRestore) toRestore.push(b.id);
  }

  if (toRestore.length === 0) {
    console.log("[whatsapp-web] no saved sessions to restore on startup");
    return;
  }

  console.log(
    "[whatsapp-web] restoring",
    toRestore.length,
    "WhatsApp session(s) on startup…"
  );

  await prepareAllWhatsAppSessionsForBoot(AUTH_DATA_PATH);

  // Previous dev-server Chromium may still be releasing profile locks (especially Windows).
  const bootSettleMs = process.platform === "win32" ? 5500 : 1500;
  await sleep(bootSettleMs);

  for (const businessId of toRestore) {
    if (restoreInProgress.has(businessId)) continue;
    try {
      const sessionDir = sessionDirForBusiness(AUTH_DATA_PATH, businessId);
      await releaseChromiumDefaultProfileLocks(sessionDir);
      await clearStaleWaProcessLockIfDead(sessionDir);
      await prepareWhatsAppSessionDir(sessionDir, { boot: true, force: true });
      const result = await startWhatsAppClient(businessId, { restore: true });
      if (result.status === "ready") {
        console.log("[whatsapp-web] session ready for business", businessId);
      } else if (result.status !== "connecting" && result.status !== "authenticated") {
        console.warn(
          "[whatsapp-web] session not ready after restore",
          businessId,
          result.status,
          result.error?.slice(0, 120) ?? ""
        );
      }
    } catch (err) {
      console.error(
        "[whatsapp-web] restore failed",
        businessId,
        formatInitError(err)
      );
    }
  }
}

/** Run once per server process (instrumentation on boot only). */
export function ensureWhatsAppRestoreStarted(): Promise<void> {
  if (restoreCompleted) return Promise.resolve();
  if (!restorePromise) {
    restorePromise = (async () => {
      const shouldRestore = await initWhatsAppSessionStorage();
      if (!shouldRestore) {
        await waitForGlobalWaBootLockRelease(AUTH_DATA_PATH);
        return;
      }
      const releaseGlobal = await acquireGlobalWaBootLock(AUTH_DATA_PATH);
      if (!releaseGlobal) {
        console.log(
          "[whatsapp-web] another worker is restoring WhatsApp — skipping duplicate restore"
        );
        await waitForGlobalWaBootLockRelease(AUTH_DATA_PATH);
        return;
      }
      try {
        await restoreWhatsAppClients();
      } finally {
        await releaseGlobal();
      }
    })()
      .then(() => {
        restoreCompleted = true;
        console.log("[whatsapp-web] startup restore finished");
      })
      .catch((err) => {
        restorePromise = null;
        console.error("[whatsapp-web] restoreWhatsAppClients failed:", err);
        throw err;
      });
  }
  return restorePromise;
}
