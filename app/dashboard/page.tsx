"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { BallLoader } from "@/components/ui/BallLoader";

type DashboardStatsData = {
  totalChats: number;
  aiReplies: number;
  unread: number;
};
import { shouldToastDashboardApiError } from "@/lib/dashboard/api-errors";
import { dashboardFetch } from "@/lib/dashboard/session";
import type { PlanUsageSnapshot } from "@/lib/plan-usage";
import {
  applyContactPhoneMap,
  buildConversations,
  contactKey,
  filterConversations,
  findThreadSearchMatch,
  threadForContact,
  type InboxMessage,
} from "@/lib/inbox";
import {
  isAllowedProductImageFile,
  normalizeProductImageDataUrl,
} from "@/lib/product-image";
import { MAX_IMAGE_DECODED_BYTES } from "@/lib/product-payload";
import { ChatMessageBubble } from "@/components/dashboard/ChatMessageBubble";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { scrollMessageInContainer } from "@/lib/scroll-thread-message";

const MOBILE_INBOX_MQ = "(max-width: 639px)";

export default function DashboardPage() {
  const router = useRouter();
  const { bootstrapped, needsSetup, waStatus, profile } = useDashboard();
  const [stats, setStats] = useState<DashboardStatsData>({
    totalChats: 0,
    aiReplies: 0,
    unread: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [contactPhones, setContactPhones] = useState<Record<string, string>>(
    {}
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedContactFrom, setSelectedContactFrom] = useState<
    string | null
  >(null);
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const threadEndMobileRef = useRef<HTMLDivElement>(null);
  const threadScrollDesktopRef = useRef<HTMLDivElement>(null);
  const threadScrollMobileRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isMobileInbox, setIsMobileInbox] = useState(false);
  const [aiAutoReply, setAiAutoReply] = useState(true);
  const [aiAutoReplySaving, setAiAutoReplySaving] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [planUsage, setPlanUsage] = useState<PlanUsageSnapshot | null>(null);
  const conversations = useMemo(
    () => applyContactPhoneMap(buildConversations(messages), contactPhones),
    [messages, contactPhones]
  );

  const filteredConversations = useMemo(
    () => filterConversations(conversations, search),
    [conversations, search]
  );

  const threadMessages = useMemo(
    () =>
      selectedContactFrom
        ? threadForContact(messages, selectedContactFrom)
        : [],
    [messages, selectedContactFrom]
  );

  const chatSearchMatch = useMemo(
    () => findThreadSearchMatch(threadMessages, chatSearchQuery),
    [threadMessages, chatSearchQuery]
  );

  const chatSearchMatchId = chatSearchMatch?.id ?? null;

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_INBOX_MQ);
    const update = () => setIsMobileInbox(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const setMessageRef = useCallback(
    (messageId: string, panel: "desktop" | "mobile") =>
      (el: HTMLDivElement | null) => {
        const active =
          (panel === "mobile" && isMobileInbox) ||
          (panel === "desktop" && !isMobileInbox);
        if (!active) return;
        if (el) messageRefs.current[messageId] = el;
        else delete messageRefs.current[messageId];
      },
    [isMobileInbox]
  );

  const scrollToSearchMatch = useCallback(() => {
    const q = chatSearchQuery.trim();
    if (!q || !chatSearchMatchId) return;

    const container = isMobileInbox
      ? threadScrollMobileRef.current
      : threadScrollDesktopRef.current;
    const messageEl = messageRefs.current[chatSearchMatchId] ?? null;

    if (scrollMessageInContainer(container, messageEl)) return;

    let attempts = 0;
    const retry = () => {
      attempts += 1;
      const c = isMobileInbox
        ? threadScrollMobileRef.current
        : threadScrollDesktopRef.current;
      const el = messageRefs.current[chatSearchMatchId] ?? null;
      if (scrollMessageInContainer(c, el)) return;
      if (attempts < 12) requestAnimationFrame(retry);
    };
    requestAnimationFrame(retry);
  }, [chatSearchQuery, chatSearchMatchId, isMobileInbox]);

  const selectedKey = selectedContactFrom
    ? contactKey(selectedContactFrom)
    : "";

  const activeConversation = useMemo(
    () =>
      conversations.find((c) => contactKey(c.contactFrom) === selectedKey) ??
      null,
    [conversations, selectedKey]
  );

  const fetchStats = useCallback(async () => {
    if (!bootstrapped || needsSetup) {
      setStats({ totalChats: 0, aiReplies: 0, unread: 0 });
      return;
    }
    const unread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
    const aiReplies = messages.filter(
      (m) => m.direction === "outgoing" && m.outgoingSource === "ai"
    ).length;
    setStats({
      totalChats: conversations.length,
      aiReplies,
      unread,
    });
  }, [bootstrapped, needsSetup, conversations, messages]);

  const fetchDashboardData = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;

      if (!bootstrapped || needsSetup) {
        setMessages([]);
        setContactPhones({});
        setIsLoading(false);
        if (!silent) setIsRefreshing(false);
        return;
      }

      try {
        const res = await dashboardFetch("/api/messages");

        if (!res.ok) {
          if (res.status === 401) {
            if (!silent) {
              toast.error("Session expired. Please sign in again.");
            }
            router.push("/sign-in");
            return;
          }
          const err = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          const errMsg =
            typeof err.error === "string" ? err.error : "Could not load inbox.";
          if (!silent && shouldToastDashboardApiError(errMsg)) {
            toast.error(errMsg);
          }
          setMessages([]);
          setContactPhones({});
          return;
        }

        const data = (await res.json()) as {
          messages: InboxMessage[];
          contactPhones?: Record<string, string>;
          waConnected?: boolean;
        };
        setMessages(data.messages ?? []);
        setContactPhones(data.contactPhones ?? {});
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        if (!silent) {
          toast.error("Could not load inbox from the server.");
        }
      } finally {
        setIsLoading(false);
        if (!silent) {
          setIsRefreshing(false);
        }
      }
    },
    [router, bootstrapped, needsSetup]
  );

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!bootstrapped || needsSetup) {
      setPlanUsage(null);
      return;
    }
    const loadUsage = () => {
      void dashboardFetch("/api/billing/overview", { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) return;
          const json = (await res.json()) as { usage?: PlanUsageSnapshot };
          setPlanUsage(json.usage ?? null);
        })
        .catch(() => setPlanUsage(null));
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(loadUsage);
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(loadUsage, 400);
    return () => clearTimeout(t);
  }, [bootstrapped, needsSetup]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!bootstrapped || needsSetup) return;
    void dashboardFetch("/api/business/settings", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const j = (await res.json()) as { aiAutoReplyEnabled?: boolean };
        setAiAutoReply(j.aiAutoReplyEnabled !== false);
      })
      .catch(() => {});
  }, [bootstrapped, needsSetup]);

  const onAiAutoReplyChange = async (enabled: boolean) => {
    const prev = aiAutoReply;
    setAiAutoReply(enabled);
    setAiAutoReplySaving(true);
    try {
      const res = await dashboardFetch("/api/business/settings", {
        method: "PATCH",
        body: JSON.stringify({ aiAutoReplyEnabled: enabled }),
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
        enabled ? "AI auto reply turned on" : "AI auto reply turned off"
      );
    } catch {
      setAiAutoReply(prev);
      toast.error("Could not update AI auto reply.");
    } finally {
      setAiAutoReplySaving(false);
    }
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchDashboardData({ silent: true });
      }
    }, 12000);
    return () => clearInterval(id);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (chatSearchQuery.trim()) return;
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    threadEndMobileRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedContactFrom, threadMessages.length, chatSearchQuery]);

  useLayoutEffect(() => {
    if (!chatSearchQuery.trim() || !chatSearchMatchId) return;
    scrollToSearchMatch();
  }, [
    chatSearchQuery,
    chatSearchMatchId,
    selectedContactFrom,
    threadMessages.length,
    isMobileInbox,
    scrollToSearchMatch,
  ]);

  useEffect(() => {
    setChatSearchOpen(false);
    setChatSearchQuery("");
  }, [selectedContactFrom]);

  const markRead = useCallback(
    async (contactWaId: string) => {
      try {
        await dashboardFetch("/api/messages/read", {
          method: "POST",
          body: JSON.stringify({ contactWaId }),
        });
        void fetchDashboardData({ silent: true });
      } catch {
        /* ignore */
      }
    },
    [fetchDashboardData]
  );

  useEffect(() => {
    if (selectedContactFrom) {
      void markRead(selectedContactFrom);
    }
  }, [selectedContactFrom, markRead]);

  const onPickChatImage = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!isAllowedProductImageFile(f)) {
      toast.error("Only JPG and PNG images are allowed.");
      return;
    }
    if (f.size > MAX_IMAGE_DECODED_BYTES) {
      toast.error("Image must be under 3 MB.");
      return;
    }
    const raw = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result ?? ""));
      r.onerror = () => reject(new Error("read"));
      r.readAsDataURL(f);
    });
    const dataUrl = normalizeProductImageDataUrl(raw);
    if (!dataUrl) {
      toast.error("Could not read image.");
      return;
    }
    setPendingImage(dataUrl);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if ((!text && !pendingImage) || !selectedContactFrom) return;

    setIsSending(true);
    try {
      const res = await dashboardFetch("/api/whatsapp/send", {
        method: "POST",
        body: JSON.stringify({
          to: selectedContactFrom,
          whatsappChatId: activeConversation?.sendTo?.includes("@")
            ? activeConversation.sendTo
            : undefined,
          text: text || undefined,
          imageDataUrl: pendingImage || undefined,
          imageCaption: text || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg =
          typeof data.error === "string" ? data.error : "Could not send message.";
        const hint =
          typeof (data as { hint?: string }).hint === "string"
            ? (data as { hint: string }).hint
            : "";
        toast.error(hint ? `${errMsg}\n\n${hint}` : errMsg, { duration: 8000 });
        return;
      }
      setDraft("");
      setPendingImage(null);
      toast.success("Sent");
      await fetchDashboardData({ silent: true });
    } catch {
      toast.error("Network error while sending.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#e5ddd5]">
        <BallLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full pb-14 md:pb-0">
      <DashboardStats
        totalChats={stats.totalChats}
        aiReplies={stats.aiReplies}
        unread={stats.unread}
        waStatus={waStatus}
        whatsappNumber={profile?.whatsappNumber}
        aiAutoReply={aiAutoReply}
        usage={planUsage}
      />
      <div className="flex items-center justify-end gap-2 px-3 py-2 bg-white border-b border-[#e5e7eb] shrink-0">
        <button
          type="button"
          disabled={isRefreshing}
          onClick={() => {
            setIsRefreshing(true);
            void fetchDashboardData();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#075E54] hover:bg-slate-50 disabled:opacity-50"
        >
          <span
            className={`material-symbols-outlined text-lg ${isRefreshing ? "animate-spin" : ""}`}
          >
            refresh
          </span>
          Refresh inbox
        </button>
      </div>
      <div className="flex flex-1 min-h-0 max-h-[calc(100dvh-10.5rem)] bg-white overflow-hidden">
          <aside className="w-full sm:w-[300px] lg:w-[340px] shrink-0 flex flex-col min-h-0 max-h-full border-r border-[#e5e7eb] bg-white">
            <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[#111827]">WhatsApp Inbox</h2>
                <p className="text-[11px] text-[#6b7280]">
                  Chats from your business number
                </p>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-lg text-[#6b7280] hover:bg-[#f3f4f6]"
                aria-label="Filter"
              >
                <span className="material-symbols-outlined text-xl">tune</span>
              </button>
            </div>
            <div className="p-3 border-b border-[#e5e7eb]">
              <div className="flex items-center gap-2 rounded-xl bg-[#f3f4f6] px-3 py-2.5 border border-[#e5e7eb]/60">
                <span className="material-symbols-outlined text-[#54656f] text-xl">
                  search
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or number…"
                  className="flex-1 bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
                />
                <span className="material-symbols-outlined text-[#9ca3af] text-lg">
                  settings
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#667781]">
                  {conversations.length === 0
                    ? "No chats yet. When someone messages your WhatsApp Business number, they will appear here."
                    : "No matches for your search."}
                </div>
              ) : (
                <ul>
                  {filteredConversations.map((c) => {
                    const selected =
                      contactKey(c.contactFrom) === selectedKey;
                    return (
                      <li key={c.contactFrom}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedContactFrom(c.contactFrom)
                          }
                          className={`w-full flex gap-3 px-3 py-3 text-left border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors ${
                            selected
                              ? "bg-[#ecfdf5] border-l-4 border-l-[#25D366] pl-2"
                              : "border-l-4 border-l-transparent"
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-[#dfe5e7] flex items-center justify-center shrink-0 text-[#54656f] font-semibold text-lg">
                            {c.title.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between gap-2 items-baseline">
                              <span className="font-semibold text-[#111b21] text-[15px] truncate">
                                {c.title}
                              </span>
                              {c.lastAt && (
                                <span className="text-[11px] text-[#667781] shrink-0">
                                  {new Date(c.lastAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </div>
                            {c.displayPhone ? (
                              <p className="text-xs text-[#667781] truncate font-mono">
                                {c.displayPhone}
                              </p>
                            ) : null}
                            <p className="text-sm text-[#667781] truncate mt-0.5">
                              {c.lastPreview || " "}
                            </p>
                          </div>
                          {c.unreadCount > 0 && (
                            <span className="self-center shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#25D366] text-white text-xs font-bold flex items-center justify-center">
                              {c.unreadCount > 9 ? "9+" : c.unreadCount}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Main chat */}
          <section className="hidden sm:flex flex-1 flex-col min-w-0 min-h-0 max-h-full bg-[#e5ddd5]">
            {!selectedContactFrom ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[#54656f] p-8">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">
                  chat
                </span>
                <p className="text-center text-sm max-w-xs">
                  Select a chat to read messages and reply.
                </p>
              </div>
            ) : (
              <>
                <div className="shrink-0 flex flex-col gap-2 px-4 py-3 bg-white border-b border-[#e5e7eb]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#e5e7eb] flex items-center justify-center text-[#4b5563] font-semibold shrink-0">
                      {(activeConversation?.title ?? "?")
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#111827] truncate">
                        {activeConversation?.title}
                      </p>
                      {activeConversation?.displayPhone ? (
                        <p className="text-xs text-[#6b7280] font-mono truncate">
                          {activeConversation.displayPhone}
                        </p>
                      ) : (
                        // <p className="text-xs text-[#25D366] font-medium flex items-center gap-1">
                        //   <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" />
                        //   Online
                        // </p>
                        <div></div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className="text-[11px] font-medium text-[#6b7280] hidden lg:inline">
                          AI auto reply
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={aiAutoReply}
                          aria-label="AI auto reply"
                          disabled={aiAutoReplySaving}
                          onClick={() => void onAiAutoReplyChange(!aiAutoReply)}
                          className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
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
                      <button
                        type="button"
                        onClick={() => {
                          setChatSearchOpen((o) => !o);
                          if (chatSearchOpen) setChatSearchQuery("");
                        }}
                        className={`p-2 rounded-lg hover:bg-[#f3f4f6] ${
                          chatSearchOpen ? "bg-[#ecfdf5] text-[#25D366]" : "text-[#6b7280]"
                        }`}
                        aria-label="Search messages in chat"
                        aria-expanded={chatSearchOpen}
                      >
                        <span className="material-symbols-outlined text-xl">
                          search
                        </span>
                      </button>
                    </div>
                  </div>
                  {chatSearchOpen ? (
                    <div className="flex items-center gap-2 rounded-xl bg-[#f3f4f6] px-3 py-2 border border-[#e5e7eb]">
                      <span className="material-symbols-outlined text-[#6b7280] text-lg">
                        search
                      </span>
                      <input
                        type="search"
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        placeholder="Find a message in this chat…"
                        className="flex-1 bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
                        autoFocus
                      />
                      {chatSearchQuery.trim() && !chatSearchMatchId ? (
                        <span className="text-[11px] text-[#9ca3af] shrink-0">
                          No match
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div
                  ref={threadScrollDesktopRef}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 space-y-2"
                >
                  {threadMessages.map((m) => (
                    <ChatMessageBubble
                      key={m.id}
                      message={m}
                      highlighted={chatSearchMatchId === m.id}
                      messageRef={setMessageRef(m.id, "desktop")}
                    />
                  ))}
                  <div ref={threadEndRef} />
                </div>

                <div className="shrink-0 p-3 bg-[#f0f2f5] flex flex-col gap-2 border-t border-[#e5e7eb]">
                  {pendingImage ? (
                    <div className="flex items-center gap-2 px-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pendingImage}
                          alt="Attachment preview"
                          className="w-14 h-14 rounded-lg object-cover border border-black/10"
                        />
                        <button
                          type="button"
                          onClick={() => setPendingImage(null)}
                          className="text-xs font-semibold text-[#c62828] hover:underline"
                        >
                          Remove image
                        </button>
                    </div>
                  ) : null}
                  <div className="flex items-end gap-2">
                    {/* <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        void onPickChatImage(e.target.files);
                        e.target.value = "";
                      }}
                    /> */}
                    {/* <button
                      type="button"
                      disabled={isSending}
                      onClick={() => imageInputRef.current?.click()}
                      className="shrink-0 w-11 h-11 rounded-full bg-white text-[#075E54] flex items-center justify-center shadow-sm hover:bg-[#fafafa] disabled:opacity-40"
                      aria-label="Attach image"
                    >
                      <span className="material-symbols-outlined text-xl">
                        image
                      </span>
                    </button> */}
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                      rows={1}
                      placeholder="Type a message…"
                      className="flex-1 max-h-32 min-h-[44px] resize-y rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm text-[#111827] shadow-sm outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                    />
                    <button
                      type="button"
                      className="shrink-0 w-10 h-10 rounded-full text-[#6b7280] hover:bg-white flex items-center justify-center"
                      aria-label="Emoji"
                    >
                      <span className="material-symbols-outlined text-xl">mood</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSending || (!draft.trim() && !pendingImage)}
                      onClick={() => void handleSend()}
                      className="shrink-0 w-11 h-11 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:bg-[#20bd5a] disabled:opacity-40 transition-colors shadow-md"
                      aria-label="Send"
                    >
                      {isSending ? (
                        <BallLoader size="xs" variant="light" />
                      ) : (
                        <span className="material-symbols-outlined text-xl translate-x-0.5">
                          send
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        {selectedContactFrom && (
          <div className="sm:hidden fixed inset-0 z-[60] bg-[#e5ddd5] flex flex-col">
            <div className="shrink-0 flex flex-col bg-[#075E54] text-white">
              <div className="flex items-center gap-2 px-2 py-2">
                <button
                  type="button"
                  onClick={() => setSelectedContactFrom(null)}
                  className="p-2 rounded-full hover:bg-white/10"
                  aria-label="Back"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">
                    {activeConversation?.title}
                  </p>
                  {activeConversation?.displayPhone ? (
                    <p className="text-xs text-white/80 font-mono truncate">
                      {activeConversation.displayPhone}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={aiAutoReply}
                  aria-label="AI auto reply"
                  disabled={aiAutoReplySaving}
                  onClick={() => void onAiAutoReplyChange(!aiAutoReply)}
                  className={`relative w-9 h-5 rounded-full shrink-0 disabled:opacity-50 ${
                    aiAutoReply ? "bg-white/30" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      aiAutoReply ? "translate-x-4" : ""
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChatSearchOpen((o) => !o);
                    if (chatSearchOpen) setChatSearchQuery("");
                  }}
                  className="p-2 rounded-full hover:bg-white/10 shrink-0"
                  aria-label="Search messages"
                >
                  <span className="material-symbols-outlined">search</span>
                </button>
              </div>
              {chatSearchOpen ? (
                <div className="px-3 pb-2 flex items-center gap-2 rounded-lg mx-2 mb-2 bg-white/10">
                  <input
                    type="search"
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    placeholder="Find message…"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/60"
                    autoFocus
                  />
                </div>
              ) : null}
            </div>
            <div
              ref={threadScrollMobileRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-2"
            >
              {threadMessages.map((m) => (
                <ChatMessageBubble
                  key={m.id}
                  message={m}
                  highlighted={chatSearchMatchId === m.id}
                  messageRef={setMessageRef(m.id, "mobile")}
                />
              ))}
              <div ref={threadEndMobileRef} />
            </div>
            <div className="shrink-0 p-2 bg-[#f0f2f5] flex flex-col gap-2 pb-3">
              {pendingImage ? (
                <div className="flex items-center gap-2 px-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingImage}
                    alt="Attachment preview"
                    className="w-12 h-12 rounded-lg object-cover border border-black/10"
                  />
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    className="text-xs font-semibold text-[#c62828]"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => imageInputRef.current?.click()}
                  className="shrink-0 w-10 h-10 rounded-full bg-white text-[#075E54] flex items-center justify-center shadow-sm"
                  aria-label="Attach image"
                >
                  <span className="material-symbols-outlined">image</span>
                </button>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={1}
                  placeholder="Message"
                  className="flex-1 min-h-[40px] rounded-lg border-0 bg-white px-3 py-2 text-sm outline-none"
                />
                <button
                  type="button"
                  disabled={isSending || (!draft.trim() && !pendingImage)}
                  onClick={() => void handleSend()}
                  className="shrink-0 w-10 h-10 rounded-full bg-[#075E54] text-white flex items-center justify-center disabled:opacity-40"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
