import fs from "fs/promises";
import path from "path";

/** Stable directory for LocalAuth session profiles (survives server restarts). */
export function getWhatsAppAuthPath(): string {
  const raw = process.env.WWEBJS_AUTH_PATH?.trim();
  return path.resolve(raw || path.join(process.cwd(), ".wwebjs_auth"));
}

export function webVersionCacheDirForBusiness(
  authPath: string,
  businessId: number
): string {
  return path.join(authPath, "wwebjs_cache", `biz-${businessId}`);
}

export const PUPPETEER_LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--disable-background-networking",
] as const;

/** Create auth + cache folders once at server boot. */
export async function ensureWhatsAppAuthStorage(): Promise<string> {
  const authPath = getWhatsAppAuthPath();
  await fs.mkdir(authPath, { recursive: true });
  await fs.mkdir(path.join(authPath, "wwebjs_cache"), { recursive: true });
  return authPath;
}

export async function ensureWebVersionCacheDir(
  businessId: number
): Promise<void> {
  const dir = webVersionCacheDirForBusiness(getWhatsAppAuthPath(), businessId);
  await fs.mkdir(dir, { recursive: true });
}

export function buildWhatsAppWebClientConfig(businessId: number): {
  puppeteer: {
    headless: boolean;
    args: string[];
  };
  webVersionCache: {
    type: "local";
    path: string;
  };
} {
  const authPath = getWhatsAppAuthPath();
  return {
    puppeteer: {
      headless: true,
      args: [...PUPPETEER_LAUNCH_ARGS],
    },
    webVersionCache: {
      type: "local",
      path: webVersionCacheDirForBusiness(authPath, businessId),
    },
  };
}
