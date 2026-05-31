"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { dashboardFetch } from "@/lib/dashboard/session";
import {
  buildConversations,
  contactKey,
  filterConversations,
  threadForContact,
  type InboxMessage,
} from "@/lib/inbox";
import {
  isAllowedProductImageFile,
  normalizeProductImageDataUrl,
} from "@/lib/product-image";
import { MAX_IMAGE_DECODED_BYTES } from "@/lib/product-payload";
import { DashboardReconnectBanner } from "@/components/dashboard/reconnect-banner";

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
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
  const conversations = useMemo(
    () => buildConversations(messages),
    [messages]
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

  const selectedKey = selectedContactFrom
    ? contactKey(selectedContactFrom)
    : "";

  const activeConversation = useMemo(
    () =>
      conversations.find((c) => contactKey(c.contactFrom) === selectedKey) ??
      null,
    [conversations, selectedKey]
  );

  const fetchDashboardData = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;

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
          throw new Error("Failed to load messages");
        }

        const data = (await res.json()) as { messages: InboxMessage[] };
        setMessages(data.messages ?? []);
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
    [router]
  );

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchDashboardData({ silent: true });
      }
    }, 12000);
    return () => clearInterval(id);
  }, [fetchDashboardData]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    threadEndMobileRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedContactFrom, threadMessages.length]);

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

    const phoneNumberId =
      localStorage.getItem("whatsappPhoneNumberId")?.trim() || "";

    setIsSending(true);
    try {
      const res = await dashboardFetch("/api/whatsapp/send", {
        method: "POST",
        body: JSON.stringify({
          to: selectedContactFrom,
          text: text || undefined,
          imageDataUrl: pendingImage || undefined,
          imageCaption: text || undefined,
          phoneNumberId: phoneNumberId || undefined,
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
        <div className="animate-spin h-10 w-10 border-4 border-[#075E54] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div className="shrink-0 border-b border-black/8 bg-[#eef0f2]">
        <div className="flex justify-end px-2 py-1.5">
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => {
              setIsRefreshing(true);
              void fetchDashboardData();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#075E54] hover:bg-white/80 disabled:opacity-50"
          >
            <span
              className={`material-symbols-outlined text-lg ${isRefreshing ? "animate-spin" : ""}`}
            >
              refresh
            </span>
            Refresh
          </button>
        </div>
        <div className="px-2 pb-2">
          <DashboardReconnectBanner />
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
          {/* Sidebar — chats */}
          <aside className="w-full sm:w-[340px] shrink-0 flex flex-col border-r border-black/8 bg-white">
            <div className="p-2 border-b border-black/6">
              <div className="flex items-center gap-2 rounded-lg bg-[#f0f2f5] px-3 py-2">
                <span className="material-symbols-outlined text-[#54656f] text-xl">
                  search
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or number…"
                  className="flex-1 bg-transparent text-sm text-[#111] outline-none placeholder:text-[#8696a0]"
                />
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
                          className={`w-full flex gap-3 px-3 py-3 text-left border-b border-black/5 hover:bg-[#f5f6f6] transition-colors ${
                            selected ? "bg-[#e9edef]" : ""
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
                            <p className="text-xs text-[#667781] truncate font-mono">
                              {c.displayPhone}
                            </p>
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
          <section className="hidden sm:flex flex-1 flex-col min-w-0 bg-[#e5ddd5]">
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
                <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] border-b border-black/8">
                  <div className="w-10 h-10 rounded-full bg-[#dfe5e7] flex items-center justify-center text-[#54656f] font-semibold">
                    {(activeConversation?.title ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#111b21] truncate">
                      {activeConversation?.title}
                    </p>
                    <p className="text-xs text-[#667781] font-mono truncate">
                      {activeConversation?.displayPhone}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
                  {threadMessages.map((m) => {
                    const outgoing = m.direction === "outgoing";
                    return (
                      <div
                        key={m.id}
                        className={`flex ${outgoing ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${
                            outgoing
                              ? "bg-[#dcf8c6] text-[#111b21] rounded-tr-none"
                              : "bg-white text-[#111b21] rounded-tl-none"
                          }`}
                        >
                          <p className="text-[14.2px] leading-snug whitespace-pre-wrap break-words">
                            {m.text}
                          </p>
                          <div
                            className={`flex items-center gap-1 mt-1 justify-end ${
                              outgoing ? "text-[#667781]" : "text-[#667781]"
                            }`}
                          >
                            <span className="text-[11px]">
                              {m.createdAt
                                ? new Date(m.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                            {outgoing && (
                              <span className="material-symbols-outlined text-[14px] text-[#53bdeb]">
                                done_all
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={threadEndRef} />
                </div>

                <div className="shrink-0 p-2 bg-[#f0f2f5] flex flex-col gap-2">
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
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        void onPickChatImage(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() => imageInputRef.current?.click()}
                      className="shrink-0 w-11 h-11 rounded-full bg-white text-[#075E54] flex items-center justify-center shadow-sm hover:bg-[#fafafa] disabled:opacity-40"
                      aria-label="Attach image"
                    >
                      <span className="material-symbols-outlined text-xl">
                        image
                      </span>
                    </button>
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
                      placeholder="Type a message"
                      className="flex-1 max-h-32 min-h-[42px] resize-y rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-[#111b21] shadow-sm outline-none focus:ring-2 focus:ring-[#075E54]/30"
                    />
                    <button
                      type="button"
                      disabled={isSending || (!draft.trim() && !pendingImage)}
                      onClick={() => void handleSend()}
                      className="shrink-0 w-11 h-11 rounded-full bg-[#075E54] text-white flex items-center justify-center hover:bg-[#054d45] disabled:opacity-40 transition-colors"
                      aria-label="Send"
                    >
                      {isSending ? (
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
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
          <div className="sm:hidden fixed inset-x-0 bottom-0 top-[4.5rem] z-[60] bg-[#e5ddd5] flex flex-col">
            <div className="shrink-0 flex items-center gap-2 px-2 py-2 bg-[#075E54] text-white">
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
                <p className="text-xs text-white/80 font-mono truncate">
                  {activeConversation?.displayPhone}
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {threadMessages.map((m) => {
                const outgoing = m.direction === "outgoing";
                return (
                  <div
                    key={m.id}
                    className={`flex ${outgoing ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-lg px-3 py-2 shadow-sm ${
                        outgoing
                          ? "bg-[#dcf8c6] rounded-tr-none"
                          : "bg-white rounded-tl-none"
                      }`}
                    >
                      <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">
                        {m.text}
                      </p>
                      <p className="text-[10px] text-[#667781] text-right mt-1">
                        {m.createdAt
                          ? new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
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
    </>
  );
}
