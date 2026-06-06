"use client";

import type { InboxMessage } from "@/lib/inbox";
import { imageMessageLabel, isImageLikeMessage } from "@/lib/inbox-message-media";

export function ChatMessageBubble({
  message: m,
  highlighted,
  messageRef,
}: {
  message: InboxMessage;
  highlighted?: boolean;
  messageRef?: (el: HTMLDivElement | null) => void;
}) {
  const outgoing = m.direction === "outgoing";
  const showImage =
    Boolean(m.imagePreviewUrl) && isImageLikeMessage(m.text, m.messageType);
  const caption = showImage ? imageMessageLabel(m.text) : null;

  return (
    <div
      ref={messageRef}
      className={`flex ${outgoing ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[min(85%,320px)] rounded-lg shadow-sm transition-shadow overflow-hidden ${
          outgoing
            ? "bg-[#dcf8c6] text-[#111b21] rounded-tr-none"
            : "bg-white text-[#111b21] rounded-tl-none"
        } ${highlighted ? "ring-2 ring-[#25D366] ring-offset-2" : ""}`}
      >
        {showImage && m.imagePreviewUrl ? (
          <div className="p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.imagePreviewUrl}
              alt={caption ?? "Product image"}
              className="max-w-full w-full max-h-[280px] object-contain rounded-md bg-[#f0f2f5]"
            />
            {caption ? (
              <p className="px-2 pt-1.5 pb-0.5 text-[13px] font-medium text-[#111b21]">
                {caption}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="px-3 py-2 text-[14.2px] leading-snug whitespace-pre-wrap break-words">
            {m.text}
          </p>
        )}
        <div
          className={`flex items-center gap-1 px-3 pb-1.5 justify-end text-[#667781] ${
            showImage ? "pt-0" : "mt-0"
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
}
