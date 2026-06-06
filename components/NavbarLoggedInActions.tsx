"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AccountMenu } from "@/components/dashboard/AccountMenu";
import {
  clearDashboardSession,
  dashboardFetch,
  requestOpenBusinessSettings,
} from "@/lib/dashboard/session";

export function NavbarLoggedInActions({
  layout = "drawer",
  onNavigate,
}: {
  layout?: "drawer" | "header";
  onNavigate?: () => void;
}) {
  const [aiAutoReply, setAiAutoReply] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);
  const [displayName, setDisplayName] = useState("Account");
  const [userInitial, setUserInitial] = useState("A");

  useEffect(() => {
    void dashboardFetch("/api/business/settings", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const j = (await res.json()) as { aiAutoReplyEnabled?: boolean };
        setAiAutoReply(j.aiAutoReplyEnabled !== false);
      })
      .catch(() => {});

    void dashboardFetch("/api/auth/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const me = (await res.json()) as {
          user?: { name?: string | null; email?: string };
        };
        const name = me.user?.name?.trim() || null;
        const email = me.user?.email?.trim() || "";
        const label = name || email.split("@")[0] || "Account";
        setDisplayName(label);
        setUserInitial(label.slice(0, 1).toUpperCase());
      })
      .catch(() => {});
  }, []);

  const onToggleAi = useCallback(async () => {
    const next = !aiAutoReply;
    const prev = aiAutoReply;
    setAiAutoReply(next);
    setAiSaving(true);
    try {
      const res = await dashboardFetch("/api/business/settings", {
        method: "PATCH",
        body: JSON.stringify({ aiAutoReplyEnabled: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setAiAutoReply(prev);
        toast.error(
          typeof data.error === "string"
            ? data.error
            : "Could not update AI auto reply."
        );
        return;
      }
      toast.success(
        next ? "AI auto reply turned on" : "AI auto reply turned off"
      );
    } catch {
      setAiAutoReply(prev);
      toast.error("Could not update AI auto reply.");
    } finally {
      setAiSaving(false);
    }
  }, [aiAutoReply]);

  const logout = () => {
    clearDashboardSession();
    toast.success("Logged out");
    window.dispatchEvent(new Event("authChange"));
    onNavigate?.();
    window.location.href = "/sign-in";
  };

  const isDrawer = layout === "drawer";

  const aiSwitch = (
    <label
      className={`flex items-center select-none ${
        isDrawer
          ? "w-full justify-between gap-3 px-1"
          : "shrink-0 gap-1.5 sm:gap-2"
      }`}
    >
      <span
        className={`font-medium text-[#374151] ${
          isDrawer
            ? "text-sm"
            : "text-[10px] sm:text-xs lg:text-sm font-semibold whitespace-nowrap"
        }`}
      >
        {isDrawer ? (
          "AI auto reply"
        ) : (
          <>
            <span className="lg:hidden">AI</span>
            <span className="hidden lg:inline">AI auto reply</span>
          </>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={aiAutoReply}
        aria-label="AI auto reply"
        disabled={aiSaving}
        onClick={() => void onToggleAi()}
        className={`relative shrink-0 w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
          aiAutoReply ? "bg-[#25D366]" : "bg-[#d1d5db]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            aiAutoReply ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );

  if (isDrawer) {
    return (
      <div className="flex flex-col shrink-0 mt-auto">
        <div className="px-4 py-3 border-t border-[#e5e7eb]">{aiSwitch}</div>
        <div className="p-3 border-t border-white/10 bg-[#111827]">
          <AccountMenu
            variant="sidebar"
            displayName={displayName}
            subtitle="User"
            initial={userInitial}
            onLogout={logout}
            onBusinessSettings={() => {
              onNavigate?.();
              requestOpenBusinessSettings();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
      {aiSwitch}
      <div className="hidden sm:block">
        <AccountMenu
          variant="navbar"
          displayName={displayName}
          subtitle=""
          initial={userInitial}
          onLogout={logout}
          onBusinessSettings={requestOpenBusinessSettings}
        />
      </div>
    </div>
  );
}
