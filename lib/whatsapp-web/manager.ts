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
  hasPersistedWhatsAppSession,
  prepareWhatsAppSessionDir,
  sessionDirForBusiness,
  waitForGlobalWaBootLockRelease,
  writeSessionReadyMarker,
} from "@/lib/whatsapp-web/session-lock";
import { resolveInboundSenderWaId } from "@/lib/wa-contact-id";
import { assertWhatsAppPhoneAvailable } from "@/lib/whatsapp-phone-claim";
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
/** Skip disconnected→reconnect while we intentionally tear down Chromium for a retry. */
const skipDisconnectReconnectIds = new Set<number>();
const serverBootTimeMs = Date.now();

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
    /ebusy|eacces|profile.*in use|user data dir|lockfile|resource temporarily unavailable/i.test(
      message
    )
  );
}

function maxInitAttempts(silentRestore: boolean): number {
  return silentRestore ? 5 : 2;
}

function initRetryBackoffMs(
  silentRestore: boolean,
  attempt: number,
  browserAlreadyRunning: boolean
): number {
  if (!silentRestore) return 800;
  const base = process.platform === "win32" ? 2200 : 1400;
  const mult = browserAlreadyRunning ? 2.5 : 1;
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
export function kickoffWhatsAppRestoreIfNeeded(): void {
  if (restoreCompleted || restorePromise) return;
  void ensureWhatsAppRestoreStarted();
}

/** Call once at server boot — creates session folders and registers clean shutdown. */
export async function initWhatsAppSessionStorage(): Promise<void> {
  await ensureWhatsAppAuthStorage();
  registerWhatsAppShutdownHandlers();
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
        await destroyClient(id, { suppressDisconnectReconnect: true }).catch(
          () => {}
        );
      }
    })();
  };

  process.once("SIGINT", () => graceful("SIGINT"));
  process.once("SIGTERM", () => graceful("SIGTERM"));
}

export function isWhatsAppClientStartInFlight(businessId: number): boolean {
  return startPromises.has(businessId) || Boolean(runtime.get(businessId)?.initializing);
}

async function closeClientBrowser(
  client: import("whatsapp-web.js").Client
): Promise<void> {
  const pup = client as {
    pupBrowser?: {
      close: () => Promise<void>;
      process?: () => { kill: (signal: string) => void } | null;
    };
  };
  try {
    if (pup.pupBrowser) {
      await pup.pupBrowser.close();
      try {
        pup.pupBrowser.process?.()?.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  try {
    await client.destroy();
  } catch {
    /* ignore */
  }
}

async function destroyClient(
  businessId: number,
  options?: { suppressDisconnectReconnect?: boolean }
): Promise<void> {
  const r = runtime.get(businessId);
  if (!r) return;

  if (options?.suppressDisconnectReconnect) {
    skipDisconnectReconnectIds.add(businessId);
  }

  if (r.client) {
    await closeClientBrowser(r.client);
    r.client = null;
  }

  if (r.releaseProcessLock) {
    await r.releaseProcessLock().catch(() => {});
    r.releaseProcessLock = null;
  }

  r.initializing = false;
  const sessionDir = sessionDirForBusiness(AUTH_DATA_PATH, businessId);
  await prepareWhatsAppSessionDir(sessionDir);

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
  if (startPromises.has(businessId)) return;
  if (restorePromise && !restoreCompleted) return;

  const existing = reconnectTimers.get(businessId);
  if (existing) clearTimeout(existing);
  reconnectTimers.set(
    businessId,
    setTimeout(() => {
      reconnectTimers.delete(businessId);
      void (async () => {
        if (startPromises.has(businessId)) return;
        await ensureDb();
        const row = await Business.findByPk(businessId);
        if (!row || !resolveBusinessAccess(row).allowed) return;

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
        row.waStatus !== "disconnected";
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

  if (!options?.force && (r.initializing || (r.client && activeSession))) {
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

  const releaseLock = await acquireWaProcessLock(
    sessionDir,
    silentRestore ? 45_000 : 15_000
  );
  if (!releaseLock) {
    const persisted = await loadPersistedWaState(businessId);
    const local = getWhatsAppRuntimeStatus(businessId);
    return {
      status: local.status !== "disconnected" ? local.status : persisted.status,
      qrDataUrl: local.qrDataUrl ?? persisted.qrDataUrl,
      error:
        local.initError ??
        "WhatsApp is starting in another server process. Wait a moment and refresh.",
    };
  }

  if (r.client) {
    await destroyClient(businessId);
    await sleep(600);
  }

  r.releaseProcessLock = releaseLock;
  r.initializing = true;
  r.initError = null;
  r.status = "connecting";
  r.qrDataUrl = null;
  r.handledMessageIds.clear();
  r.inboundListenerAttached = false;
  r.strictInboundTimestamp = Boolean(options?.restore);

  await prepareWhatsAppSessionDir(sessionDir, {
    boot: silentRestore && attempt === 0,
  });

  if (!silentRestore) {
    void persistBusinessWaState(businessId, {
      waStatus: "connecting",
      waQrDataUrl: null,
    });
  } else {
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
  });

  client.on("ready", async () => {
    await ensureDb();

    const wid = client.info?.wid?.user ?? "";
    const phone = wid.replace(/\D/g, "") || wid;

    if (phone) {
      const claim = await assertWhatsAppPhoneAvailable(businessId, phone);
      if (!claim.ok) {
        console.warn(
          "[whatsapp-web] rejected duplicate phone",
          phone,
          "owner business",
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
    const retriesLeft = attempt + 1 < maxInitAttempts(silentRestore);
    if (retriesLeft && isRetryableBrowserInitError(message)) {
      const browserBusy = isBrowserAlreadyRunningError(message);
      console.warn(
        "[whatsapp-web] browser init glitch, retrying",
        businessId,
        `(attempt ${attempt + 2}/${maxInitAttempts(silentRestore)})`,
        message.slice(0, 120)
      );
      await destroyClient(businessId, { suppressDisconnectReconnect: true });
      if (r.releaseProcessLock) {
        await r.releaseProcessLock().catch(() => {});
        r.releaseProcessLock = null;
      }
      await prepareWhatsAppSessionDir(sessionDir, { boot: true });
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
      console.warn(
        "[whatsapp-web] restore init failed; will retry reconnect",
        businessId,
        message.slice(0, 120)
      );
      scheduleWhatsAppReconnect(businessId, process.platform === "win32" ? 6000 : 4000);
      return {
        status: "disconnected",
        qrDataUrl: null,
        error: message,
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

  await waitForQrOrReady(businessId, 120_000);
  const runtime = getWhatsAppRuntimeStatus(businessId);
  r.initializing = runtime.status !== "ready";

  return {
    status: runtime.status,
    qrDataUrl: runtime.qrDataUrl,
    error: runtime.initError ?? undefined,
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
  } else {
    const inFlight = startPromises.get(businessId);
    if (inFlight) return inFlight;
  }

  const job = runStartWhatsAppClient(businessId, options).finally(() => {
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
      b.waStatus !== "auth_failure";

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

  // Previous dev-server Chromium may still be releasing profile locks (especially Windows).
  const bootSettleMs = process.platform === "win32" ? 3500 : 900;
  await sleep(bootSettleMs);

  for (const businessId of toRestore) {
    try {
      const sessionDir = sessionDirForBusiness(AUTH_DATA_PATH, businessId);
      await prepareWhatsAppSessionDir(sessionDir, { boot: true });
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
      await initWhatsAppSessionStorage();
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
