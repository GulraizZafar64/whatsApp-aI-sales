const ADMIN_TOKEN_KEY = "adminToken";

export function hasAdminSession(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(ADMIN_TOKEN_KEY)?.trim());
}

export function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ADMIN_TOKEN_KEY)?.trim() ?? "";
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
}

export function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function adminFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const useJson =
    init?.body !== undefined &&
    !(init.body instanceof FormData) &&
    !(init.headers as Record<string, string> | undefined)?.["Content-Type"];
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getAdminToken()}`,
  };
  if (useJson) headers["Content-Type"] = "application/json";
  return fetch(path, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}
