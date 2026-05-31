"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { metaFbLoginOptions } from "@/lib/meta-fb-login-options";
import { dashboardFetch } from "@/lib/dashboard/session";

type Props = {
  onReconnected?: () => void;
};

export function DashboardReconnectBanner({ onReconnected }: Props) {
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fbReady, setFbReady] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await dashboardFetch("/api/business/status");
      if (!res.ok) {
        setNeedsReconnect(false);
        return;
      }
      const data = (await res.json()) as { needsReconnect?: boolean };
      setNeedsReconnect(Boolean(data.needsReconnect));
    } catch {
      setNeedsReconnect(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!needsReconnect || typeof window === "undefined") return;

    const w = window as Window & { FB?: { init: (o: object) => void; login: Function }; fbAsyncInit?: () => void };
    if (w.FB) {
      setFbReady(true);
      return;
    }

    w.fbAsyncInit = function () {
      w.FB?.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v25.0",
      });
      setFbReady(true);
    };

    if (!document.getElementById("facebook-jssdk")) {
      const js = document.createElement("script");
      js.id = "facebook-jssdk";
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      document.body.appendChild(js);
    }
  }, [needsReconnect]);

  const handleReconnect = () => {
    const w = window as Window & { FB?: { login: Function } };
    if (!w.FB || !fbReady) {
      toast.error("Meta SDK is loading — try again in a moment.");
      return;
    }

    setConnecting(true);
    w.FB.login(
      (response: { authResponse?: { accessToken: string } }) => {
        if (!response.authResponse?.accessToken) {
          setConnecting(false);
          toast.error("Reconnect cancelled or not authorized.");
          return;
        }

        void (async () => {
          try {
            const res = await fetch("/api/auth/facebook", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accessToken: response.authResponse!.accessToken,
              }),
            });
            const data = await res.json();

            if (!res.ok || data.success === false) {
              const msg =
                data.message ??
                data.error ??
                "Reconnect failed. Select your WhatsApp number when Meta prompts you.";
              toast.error(msg, { duration: 12000 });
              setConnecting(false);
              return;
            }

            localStorage.setItem(
              "whatsappToken",
              data.accessToken ?? response.authResponse!.accessToken
            );
            if (data.phoneNumberId) {
              localStorage.setItem("whatsappPhoneNumberId", data.phoneNumberId);
            }
            if (data.webhookVerifyToken) {
              localStorage.setItem(
                "webhookVerifyToken",
                data.webhookVerifyToken
              );
            }

            setNeedsReconnect(false);
            toast.success("WhatsApp connection refreshed.");
            window.dispatchEvent(new Event("authChange"));
            onReconnected?.();
            await loadStatus();
          } catch (err) {
            console.error("[reconnect]", err);
            toast.error("Could not complete reconnect.");
          } finally {
            setConnecting(false);
          }
        })();
      },
      metaFbLoginOptions()
    );
  };

  if (loading || !needsReconnect) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm"
    >
      <p className="text-sm font-medium">
        Your WhatsApp connection needs to be refreshed to receive messages.
        Click Reconnect to fix this.
      </p>
      <button
        type="button"
        onClick={handleReconnect}
        disabled={connecting}
        className="mt-3 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {connecting ? "Connecting…" : "Reconnect"}
      </button>
    </div>
  );
}
