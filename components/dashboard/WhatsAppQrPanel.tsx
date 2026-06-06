"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { BallLoader } from "@/components/ui/BallLoader";
import { shouldToastDashboardApiError } from "@/lib/dashboard/api-errors";
import { dashboardFetch } from "@/lib/dashboard/session";

type WaStatus =
  | "disconnected"
  | "connecting"
  | "qr"
  | "authenticated"
  | "ready"
  | "auth_failure";

/** Prevent React Strict Mode from firing two POST /status starts in dev. */
let waConnectPostStarted = false;

export function resetWhatsAppConnectPostGuard(): void {
  waConnectPostStarted = false;
}

export function WhatsAppQrPanel({
  onConnected,
}: {
  onConnected?: () => void;
}) {
  const [status, setStatus] = useState<WaStatus>("disconnected");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  const applyPayload = useCallback(
    (j: {
      status?: WaStatus;
      qrDataUrl?: string | null;
      phoneNumber?: string | null;
      initError?: string | null;
      error?: string;
    }) => {
      const hasQr = Boolean(j.qrDataUrl?.trim());
      let next = (j.status ?? "disconnected") as WaStatus;

      // Stale runtime error can arrive after QR is already available.
      if (hasQr && (next === "auth_failure" || next === "disconnected")) {
        next = "qr";
      }

      setStatus(next);
      if (hasQr) {
        setQrDataUrl(j.qrDataUrl!.trim());
        setInitError(null);
      } else if (next === "auth_failure") {
        setQrDataUrl(null);
        setInitError(j.initError ?? j.error ?? "Connection failed.");
      } else if (j.qrDataUrl === null) {
        setQrDataUrl(null);
      }

      if (j.phoneNumber !== undefined) {
        setPhoneNumber(j.phoneNumber);
      }
      if (
        !hasQr &&
        next !== "ready" &&
        (j.initError !== undefined || j.error !== undefined)
      ) {
        setInitError(j.initError ?? j.error ?? null);
      }
      if (next === "ready") onConnected?.();
    },
    [onConnected]
  );

  const poll = useCallback(async () => {
    const res = await dashboardFetch("/api/whatsapp/status", {
      cache: "no-store",
    });
    if (!res.ok) return;
    const j = (await res.json()) as Parameters<typeof applyPayload>[0];
    applyPayload(j);
  }, [applyPayload]);

  const startConnect = useCallback(
    async (force = false) => {
      setStarting(true);
      setInitError(null);
      try {
        const res = await dashboardFetch("/api/whatsapp/status", {
          method: "POST",
          body: JSON.stringify({ force }),
        });
        const j = (await res.json()) as Parameters<typeof applyPayload>[0] & {
          ok?: boolean;
        };
        if (!res.ok) {
          const errMsg = j.error ?? "Could not start WhatsApp connection";
          if (shouldToastDashboardApiError(errMsg)) {
            toast.error(errMsg);
          }
          return;
        }
        applyPayload({
          ...j,
          initError: j.initError ?? j.error ?? null,
        });
        if (j.status === "auth_failure" && (j.initError || j.error)) {
          toast.error(
            typeof j.initError === "string"
              ? j.initError
              : typeof j.error === "string"
                ? j.error
                : "WhatsApp connection failed."
          );
        }
        if (j.qrDataUrl) {
          toast.success("QR code ready — scan with your phone");
        } else if (j.status === "ready") {
          toast.success("WhatsApp connected!");
        }
      } catch {
        toast.error("Network error starting WhatsApp");
      } finally {
        setStarting(false);
      }
    },
    [applyPayload]
  );

  useEffect(() => {
    if (waConnectPostStarted) {
      void poll();
      return;
    }
    waConnectPostStarted = true;
    void startConnect(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guarded once per page load
  }, []);

  const pollActive = status !== "ready" && !starting;
  useEffect(() => {
    if (!pollActive) return;
    const ms =
      status === "qr" || status === "authenticated" ? 2500 : 2000;
    const id = setInterval(() => {
      void poll();
    }, ms);
    return () => clearInterval(id);
  }, [pollActive, status, poll]);

  if (status === "connecting" && !qrDataUrl) {
    return (
      <div className="rounded-xl bg-[#f0f2f5] border border-[#075E54]/15 p-4 text-center">
        <BallLoader size="md" className="mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#075E54]">
          Reconnecting WhatsApp…
        </p>
        <p className="text-xs text-[#667781] mt-1">
          Using your saved session after server restart. This may take a minute.
        </p>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="rounded-xl bg-[#DCF8C6] border border-[#075E54]/20 p-4 text-center">
        <p className="text-sm font-semibold text-[#075E54]">
          WhatsApp connected
          {phoneNumber ? ` · ${phoneNumber}` : ""}
        </p>
        <p className="text-xs text-on-secondary-container mt-1">
          AI replies run in the background even when you close this tab.
        </p>
      </div>
    );
  }

  const showQr = Boolean(qrDataUrl);
  const waitingScan = status === "qr" || status === "authenticated";

  return (
    <div className="rounded-xl bg-white border border-black/10 p-6 shadow-sm max-w-md mx-auto text-center">
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-center gap-2 text-primary font-bold">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.284l-.582 2.166 2.207-.58c.968.528 1.99.808 3.124.808 3.181 0 5.767-2.586 5.768-5.766.001-3.18-2.585-5.766-5.768-5.766zm3.425 8.163c-.144.405-.833.748-1.15.79-.29.037-.665.045-1.076-.08-.256-.077-.577-.184-.962-.35a4.793 4.793 0 0 1-1.921-1.63c-.324-.446-.572-1.006-.572-1.603 0-.649.336-1.002.503-1.192l.142-.158c.115-.12.247-.144.32-.144l.245.006c.079.004.187-.03.292.222l.33.801c.05.122.083.245.003.407l-.133.27c-.067.135-.138.225-.01.442.274.468.61 1.056 1.056 1.455.446.4 1.156.446 1.556.446.4 0 .5-.1.6-.2l.1-.1c.14-.14.18-.08.28 0l.54.54c.1.1.2.2.3.3.1.1.06.2.02.4zm-3.425-9.172c-4.142 0-7.5 3.358-7.5 7.5 0 1.292.325 2.509.897 3.574L4.336 20l3.87-.974c1.103.7 2.406 1.114 3.825 1.114 4.142 0 7.5-3.358 7.5-7.5s-3.358-7.5-7.5-7.5z"/>
          </svg>
          <h3 className="text-xl">Connect WhatsApp</h3>
        </div>
        
        <div className="text-left space-y-2 bg-surface-container-low p-4 rounded-[5px] border border-outline-variant/30">
          <div className="flex gap-3 text-sm">
            <span className="flex-none w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">1</span>
            <p className="text-on-surface">Open <span className="font-semibold">WhatsApp</span> on your phone</p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="flex-none w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">2</span>
            <p className="text-on-surface">Tap <span className="font-semibold">Menu</span> or <span className="font-semibold">Settings</span> and select <span className="font-semibold">Linked Devices</span></p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="flex-none w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">3</span>
            <p className="text-on-surface">Tap <span className="font-semibold">Link a Device</span></p>
          </div>
          <div className="flex gap-3 text-sm">
            <span className="flex-none w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">4</span>
            <p className="text-on-surface">Point your phone to this screen to capture the code</p>
          </div>
        </div>
      </div>

      {starting && !showQr ? (
        <div className="py-10 space-y-3">
          <div className="flex justify-center">
            <BallLoader size="lg" />
          </div>
          <p className="text-sm text-on-secondary-container">
            Starting WhatsApp Web… (first time may take 1–2 minutes)
          </p>
        </div>
      ) : showQr ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="relative group">
            <img
              src={qrDataUrl!}
              alt="WhatsApp QR code"
              className="mx-auto w-64 h-64 object-contain border border-black/10 rounded-[5px] p-2 bg-white"
            />
            {status === "authenticated" && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-[5px]">
                <div className="text-center">
                  <BallLoader size="md" className="mx-auto mb-2" />
                  <p className="text-xs font-semibold text-primary">Finishing connection...</p>
                </div>
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-primary">
            {waitingScan
              ? "Scan now — keep this window open until connected"
              : "QR displayed"}
          </p>
        </div>
      ) : (
        <div className="py-4">
          {status === "auth_failure" || initError ? (
            <div className="bg-error-container border border-error/20 p-4 rounded-[5px] text-left animate-chat-bubble-in">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-error flex-none mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-on-error-container mb-1">Connection Issue</p>
                  <p className="text-sm text-on-error-container opacity-90 leading-relaxed">
                    {initError ?? "Failed to connect to WhatsApp. Please try again."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 space-y-3">
              <div className="animate-pulse flex justify-center">
                <div className="h-4 w-48 bg-surface-container-highest rounded-[5px]" />
              </div>
              <p className="text-sm text-on-secondary-container">Waiting for QR from server…</p>
            </div>
          )}
        </div>
      )}

      {status !== "auth_failure" && (
        <button
          type="button"
          onClick={() => {
            resetWhatsAppConnectPostGuard();
            void startConnect(true);
          }}
          disabled={starting}
          className="mt-4 w-full py-3 rounded-[5px] bg-primary-container text-on-primary-container font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 shadow-sm"
        >
          {starting
            ? "Starting…"
            : "Refresh QR"}
        </button>
      )}
    </div>
  );
}
