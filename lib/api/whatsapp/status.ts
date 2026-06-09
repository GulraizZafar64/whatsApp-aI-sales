/** Handler for /api/whatsapp/status */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/dashboard-business";
import { ensureDb } from "@/lib/sequelize";
import { getWhatsAppAuthPath } from "@/lib/whatsapp-web/config";
import {
  getWhatsAppRestoreState,
  getWhatsAppRuntimeStatus,
  isBusinessRestoreInProgress,
  isWhatsAppClientStartInFlight,
  kickoffWhatsAppRestoreIfNeeded,
  prepareWhatsAppSession,
  startWhatsAppClient,
} from "@/lib/whatsapp-web/manager";
import { resolveWhatsAppStatusForApi } from "@/lib/whatsapp-web/resolve-status";
import { hasPersistedWhatsAppSession } from "@/lib/whatsapp-web/session-lock";

export async function GET(request: Request) {
  const gate = await requireDashboardUser(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (!gate.businessId || !gate.business) {
    return NextResponse.json(
      { error: "Complete business setup first." },
      { status: 400 }
    );
  }

  const businessId = gate.businessId;

  await ensureDb();

  kickoffWhatsAppRestoreIfNeeded(businessId);

  await gate.business.reload();

  const authPath = getWhatsAppAuthPath();
  const savedSession = await hasPersistedWhatsAppSession(authPath, businessId);

  const restore = getWhatsAppRestoreState();
  if (
    savedSession &&
    gate.business.waStatus === "ready" &&
    !restore.inProgress &&
    !isWhatsAppClientStartInFlight(businessId) &&
    !isBusinessRestoreInProgress(businessId)
  ) {
    const local = getWhatsAppRuntimeStatus(businessId);
    // Only kick restore when runtime is fully idle — not while boot restore is connecting.
    if (local.status === "disconnected") {
      void startWhatsAppClient(businessId, { restore: true });
    }
  }

  const resolved = resolveWhatsAppStatusForApi({
    businessId,
    dbWaStatus: gate.business.waStatus,
    dbQrDataUrl: gate.business.waQrDataUrl,
    dbWhatsappNumber: gate.business.whatsappNumber,
    hasSavedSession: savedSession,
  });

  return NextResponse.json({
    status: resolved.status,
    qrDataUrl: resolved.qrDataUrl,
    phoneNumber: resolved.phoneNumber,
    whatsappNumber: gate.business.whatsappNumber,
    boundWhatsappNumber: gate.business.boundWhatsappNumber,
    initError: resolved.initError,
    restoreCompleted: getWhatsAppRestoreState().completed,
  });
}

export async function POST(request: Request) {
  const gate = await requireDashboardUser(request);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (!gate.businessId) {
    return NextResponse.json(
      { error: "Complete business setup first." },
      { status: 400 }
    );
  }

  let force = false;
  try {
    const body = (await request.json().catch(() => ({}))) as { force?: boolean };
    force = Boolean(body.force);
  } catch {
    force = false;
  }

  if (force) {
    await prepareWhatsAppSession(gate.businessId);
  }

  const result = await startWhatsAppClient(gate.businessId, { force });

  const status =
    result.status === "authenticated" ? "qr" : result.status;

  return NextResponse.json({
    ok: true,
    status,
    qrDataUrl: result.qrDataUrl,
    initError: result.error ?? null,
    error: result.error,
  });
}
