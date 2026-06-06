"use client";

import type { PlanUsageSnapshot } from "@/lib/plan-usage";

type StatCard = {
  label: string;
  value: string;
  delta: string;
  deltaClass: string;
  deltaIcon: string;
  icon: string;
  iconBg: string;
  iconColor: string;
};

function waCard(waStatus: string): Pick<StatCard, "value" | "delta" | "deltaClass" | "deltaIcon" | "icon"> {
  switch (waStatus) {
    case "ready":
      return {
        value: "Live",
        delta: "Connected",
        deltaClass: "text-[#25D366]",
        deltaIcon: "check_circle",
        icon: "wifi",
      };
    case "connecting":
      return {
        value: "…",
        delta: "Connecting",
        deltaClass: "text-amber-600",
        deltaIcon: "sync",
        icon: "sync",
      };
    case "qr":
      return {
        value: "QR",
        delta: "Scan to connect",
        deltaClass: "text-amber-600",
        deltaIcon: "qr_code_2",
        icon: "qr_code_2",
      };
    case "auth_failure":
      return {
        value: "Error",
        delta: "Reconnect in settings",
        deltaClass: "text-red-600",
        deltaIcon: "error",
        icon: "error",
      };
    default:
      return {
        value: "Off",
        delta: "Not connected",
        deltaClass: "text-[#6b7280]",
        deltaIcon: "link_off",
        icon: "link_off",
      };
  }
}

export function DashboardStats({
  totalChats,
  aiReplies,
  unread,
  waStatus,
  whatsappNumber,
  aiAutoReply,
  usage,
}: {
  totalChats: number;
  aiReplies: number;
  unread: number;
  waStatus: string;
  whatsappNumber?: string | null;
  aiAutoReply?: boolean;
  usage?: PlanUsageSnapshot | null;
}) {
  const wa = waCard(waStatus);
  const waValue =
    waStatus === "ready" && whatsappNumber?.trim()
      ? whatsappNumber.trim()
      : wa.value;

  const aiValue = usage
    ? usage.aiRepliesLimit != null
      ? `${usage.aiRepliesUsed}/${usage.aiRepliesLimit}`
      : String(usage.aiRepliesUsed)
    : String(aiReplies);

  const aiDelta = usage
    ? usage.aiRepliesRemaining != null
      ? `${usage.aiRepliesRemaining.toLocaleString()} left this period`
      : "Unlimited this period"
    : aiAutoReply !== false
      ? "Auto reply on"
      : "Auto reply off";

  const contactsValue = usage
    ? usage.contactsLimit != null
      ? `${usage.contactsUsed}/${usage.contactsLimit}`
      : String(usage.contactsUsed)
    : String(totalChats);

  const contactsDelta = usage
    ? usage.contactsRemaining != null
      ? `${usage.contactsRemaining.toLocaleString()} contacts left`
      : "Unlimited contacts"
    : "In inbox now";

  const cards: StatCard[] = [
    {
      label: usage ? "Contacts (period)" : "Total Chats",
      value: contactsValue,
      delta: contactsDelta,
      deltaClass: usage?.contactsLimitReached
        ? "text-amber-600"
        : "text-[#6b7280]",
      deltaIcon: "forum",
      icon: "forum",
      iconBg: "bg-emerald-50",
      iconColor: "text-[#25D366]",
    },
    {
      label: "AI Replies",
      value: aiValue,
      delta: aiDelta,
      deltaClass: usage?.aiLimitReached
        ? "text-amber-600"
        : aiAutoReply !== false
          ? "text-[#25D366]"
          : "text-[#6b7280]",
      deltaIcon: "smart_toy",
      icon: "smart_toy",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Unread",
      value: String(unread),
      delta: unread > 0 ? "Needs reply" : "All caught up",
      deltaClass: unread > 0 ? "text-amber-600" : "text-[#25D366]",
      deltaIcon: unread > 0 ? "mark_chat_unread" : "done_all",
      icon: "mark_chat_unread",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
    {
      label: "WhatsApp",
      value: waValue,
      delta: wa.delta,
      deltaClass: wa.deltaClass,
      deltaIcon: wa.deltaIcon,
      icon: wa.icon,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
    },
  ];

  return (
    <div className="shrink-0 bg-[#f8fafc] border-b border-[#e5e7eb]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3 sm:p-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-[5px] bg-white border border-[#e5e7eb] shadow-sm px-3 sm:px-4 py-3 sm:py-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#6b7280]">{c.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-[#111827] mt-1 tabular-nums">
                  {c.value}
                </p>
                <p
                  className={`text-[11px] font-semibold mt-1 flex items-center gap-0.5 truncate ${c.deltaClass}`}
                >
                  <span className="material-symbols-outlined text-[14px] shrink-0">
                    {c.deltaIcon}
                  </span>
                  <span className="truncate">{c.delta}</span>
                </p>
              </div>
              <span
                className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-[5px] shrink-0 ${c.iconBg}`}
              >
                <span
                  className={`material-symbols-outlined text-xl sm:text-2xl ${c.iconColor}`}
                >
                  {c.icon}
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
