import type { WaConnectionStatus } from "@/lib/whatsapp-web/manager";
import {
  getWhatsAppRestoreState,
  getWhatsAppRuntimeStatus,
  isWhatsAppClientStartInFlight,
} from "@/lib/whatsapp-web/manager";

/** Map runtime + DB into a single status for API/UI (no side effects). */
export function resolveWhatsAppStatusForApi(params: {
  businessId: number;
  dbWaStatus: string | null | undefined;
  dbQrDataUrl: string | null | undefined;
  dbWhatsappNumber: string | null | undefined;
  hasSavedSession: boolean;
}): {
  status: WaConnectionStatus;
  qrDataUrl: string | null;
  phoneNumber: string | null;
  initError: string | null;
} {
  if (params.dbWaStatus === "restore_failed") {
    return {
      status: "disconnected",
      qrDataUrl: null,
      phoneNumber: params.dbWhatsappNumber ?? null,
      initError: "Session expired, please scan QR again.",
    };
  }

  const runtime = getWhatsAppRuntimeStatus(params.businessId);
  const restore = getWhatsAppRestoreState();
  const inFlight = isWhatsAppClientStartInFlight(params.businessId);

  let status: WaConnectionStatus =
    runtime.status === "authenticated" ? "qr" : runtime.status;

  const qrDataUrl =
    runtime.qrDataUrl ?? params.dbQrDataUrl?.trim() ?? null;
  const dbWasReady = params.dbWaStatus === "ready";

  if (runtime.status === "ready") {
    status = "ready";
  } else if (params.hasSavedSession && dbWasReady) {
    if (
      runtime.status === "connecting" ||
      runtime.status === "authenticated" ||
      inFlight ||
      restore.inProgress
    ) {
      status = "connecting";
    } else if (runtime.status === "qr") {
      status = "qr";
    } else if (runtime.status === "disconnected" && !qrDataUrl) {
      // Saved session on disk — show connecting while background restore/reconnect runs.
      status = "connecting";
    }
  }

  if (
    qrDataUrl &&
    (status === "auth_failure" ||
      status === "disconnected" ||
      params.dbWaStatus === "qr")
  ) {
    status = "qr";
  }

  const initError =
    status === "qr" || status === "ready" ? null : runtime.initError;

  return {
    status,
    qrDataUrl,
    phoneNumber: runtime.phoneNumber ?? params.dbWhatsappNumber ?? null,
    initError,
  };
}
