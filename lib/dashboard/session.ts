const AUTH_TOKEN_KEY = "authToken";

export function hasDashboardSession(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY)?.trim());
}

export function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AUTH_TOKEN_KEY)?.trim() ?? "";
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token.trim());
  window.dispatchEvent(new Event("authChange"));
}

export function dashHeaders(jsonBody = true): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getAuthToken()}`,
  };
  if (jsonBody) headers["Content-Type"] = "application/json";
  return headers;
}

export function dashboardFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const useJson =
    init?.body !== undefined &&
    !(init.body instanceof FormData) &&
    !(init.headers as Record<string, string> | undefined)?.["Content-Type"];
  return fetch(path, {
    ...init,
    headers: {
      ...dashHeaders(useJson),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

export function clearDashboardSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  window.dispatchEvent(new Event("authChange"));
}

export function notifyBusinessProfileUpdated(): void {
  window.dispatchEvent(new Event("businessProfileUpdated"));
}

const OPEN_BUSINESS_SETTINGS_KEY = "openBusinessSettings";

/** Open business settings from navbar (works on dashboard or after redirect). */
export function requestOpenBusinessSettings(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/dashboard")) {
    window.dispatchEvent(new Event("openBusinessSettings"));
    return;
  }
  sessionStorage.setItem(OPEN_BUSINESS_SETTINGS_KEY, "1");
  window.location.href = "/dashboard";
}

export function consumeOpenBusinessSettingsRequest(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(OPEN_BUSINESS_SETTINGS_KEY) !== "1") return false;
  sessionStorage.removeItem(OPEN_BUSINESS_SETTINGS_KEY);
  return true;
}
