"use client";

import { useCallback, useEffect, useState } from "react";
import { BallLoader } from "@/components/ui/BallLoader";
import { dashboardFetch } from "@/lib/dashboard/session";

type ProfileData = {
  name: string | null;
  email: string;
  businessName: string | null;
  whatsappNumber: string | null;
  waStatus: string;
  country: string | null;
  currency: string | null;
};

type Stats = {
  aiMessages: number;
  uniqueContacts: number;
  manualMessages: number;
  ordersCount: number;
  totalChats: number;
};

export function ProfilePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, actRes, msgRes] = await Promise.all([
        dashboardFetch("/api/auth/me", { cache: "no-store" }),
        dashboardFetch("/api/activity", { cache: "no-store" }),
        dashboardFetch("/api/messages", { cache: "no-store" }),
      ]);

      if (meRes.ok) {
        const me = (await meRes.json()) as {
          user?: { name?: string | null; email?: string };
          businessName?: string | null;
          whatsappNumber?: string | null;
          waStatus?: string;
          country?: string | null;
          currency?: string | null;
        };
        setProfile({
          name: me.user?.name?.trim() || null,
          email: me.user?.email?.trim() || "—",
          businessName: me.businessName?.trim() || null,
          whatsappNumber: me.whatsappNumber?.trim() || null,
          waStatus: me.waStatus ?? "disconnected",
          country: me.country?.trim() || null,
          currency: me.currency?.trim() || null,
        });
      }

      let aiMessages = 0;
      let uniqueContacts = 0;
      let manualMessages = 0;
      let ordersCount = 0;
      if (actRes.ok) {
        const act = (await actRes.json()) as {
          ai?: { totalMessagesSent?: number; uniqueUsers?: number };
          manual?: { totalMessagesSent?: number };
          orders?: { recent?: unknown[] };
        };
        aiMessages = act.ai?.totalMessagesSent ?? 0;
        uniqueContacts = act.ai?.uniqueUsers ?? 0;
        manualMessages = act.manual?.totalMessagesSent ?? 0;
        ordersCount = act.orders?.recent?.length ?? 0;
      }

      let totalChats = 0;
      if (msgRes.ok) {
        const msg = (await msgRes.json()) as { messages?: { from: string }[] };
        const contacts = new Set(
          (msg.messages ?? []).map((m) => m.from).filter(Boolean)
        );
        totalChats = contacts.size;
      }

      setStats({
        aiMessages,
        uniqueContacts,
        manualMessages,
        ordersCount,
        totalChats,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  const waLabel =
    profile?.waStatus === "ready"
      ? "Connected"
      : profile?.waStatus === "qr"
        ? "Scan QR to connect"
        : "Not connected";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-panel-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-[#e5e7eb] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb] bg-[#f8fafc]">
          <h2 id="profile-panel-title" className="text-lg font-bold text-[#111827]">
            Your profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#6b7280] hover:bg-[#e5e7eb]"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading && !profile ? (
          <div className="py-16 flex justify-center">
            <BallLoader size="md" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-4">
              <span className="h-14 w-14 rounded-full bg-[#25D366] text-white text-xl font-bold flex items-center justify-center shrink-0">
                {(profile?.name || profile?.email || "A").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-lg font-bold text-[#111827] truncate">
                  {profile?.name || "—"}
                </p>
                <p className="text-sm text-[#6b7280] truncate">{profile?.email}</p>
                <p className="text-xs text-[#25D366] font-medium mt-1">User</p>
              </div>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 py-2 border-b border-[#f3f4f6]">
                <dt className="text-[#6b7280]">Business</dt>
                <dd className="font-medium text-[#111827] text-right">
                  {profile?.businessName || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-2 border-b border-[#f3f4f6]">
                <dt className="text-[#6b7280]">WhatsApp number</dt>
                <dd className="font-medium text-[#111827] text-right font-mono">
                  {profile?.whatsappNumber || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-2 border-b border-[#f3f4f6]">
                <dt className="text-[#6b7280]">Connection</dt>
                <dd className="font-medium text-[#111827] text-right">{waLabel}</dd>
              </div>
              {profile?.country ? (
                <div className="flex justify-between gap-4 py-2 border-b border-[#f3f4f6]">
                  <dt className="text-[#6b7280]">Country</dt>
                  <dd className="font-medium text-[#111827] text-right">
                    {profile.country}
                  </dd>
                </div>
              ) : null}
              {profile?.currency ? (
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-[#6b7280]">Currency</dt>
                  <dd className="font-medium text-[#111827] text-right">
                    {profile.currency}
                  </dd>
                </div>
              ) : null}
            </dl>

            {stats ? (
              <div>
                <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-2">
                  Stats
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total chats", value: stats.totalChats },
                    { label: "AI messages", value: stats.aiMessages },
                    { label: "Contacts (AI)", value: stats.uniqueContacts },
                    { label: "Manual sent", value: stats.manualMessages },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl bg-[#f8fafc] border border-[#e5e7eb] px-3 py-3"
                    >
                      <p className="text-[11px] text-[#6b7280]">{s.label}</p>
                      <p className="text-xl font-bold text-[#111827] tabular-nums">
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
