export function hasDashboardSession(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("whatsappToken")?.trim();
  const phoneNumberId = localStorage.getItem("whatsappPhoneNumberId")?.trim();
  return Boolean(token && phoneNumberId);
}

export function dashHeaders(jsonBody = true): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${localStorage.getItem("whatsappToken") ?? ""}`,
    "X-Phone-Number-Id": localStorage.getItem("whatsappPhoneNumberId") ?? "",
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
  localStorage.removeItem("whatsappToken");
  localStorage.removeItem("whatsappPhoneNumberId");
  window.dispatchEvent(new Event("authChange"));
}

export function notifyBusinessProfileUpdated(): void {
  window.dispatchEvent(new Event("businessProfileUpdated"));
}
