"use client";

import { useEffect, useRef, useState } from "react";

type DemoMessage = {
  role: "user" | "ai";
  text: string;
  time: string;
};

const DEMO_SCRIPT: DemoMessage[] = [
  {
    role: "user",
    text: "Hi! Do you have the summer collection in stock?",
    time: "14:02",
  },
  {
    role: "ai",
    text: "Yes! We just restocked 12 new items. Would you like to see our digital catalog or check availability for a specific size?",
    time: "14:02",
  },
  {
    role: "user",
    text: "I need a Medium in the Floral Dress.",
    time: "14:03",
  },
  {
    role: "ai",
    text: "Checking... ✅ Floral Dress in Medium is available! Price is $89. Shall I create a checkout link for you?",
    time: "14:03",
  },
];

const PAUSE_BEFORE_USER_MS = 900;
const PAUSE_BEFORE_AI_MS = 1400;
const PAUSE_AFTER_LOOP_MS = 3200;
const TYPING_INDICATOR_MS = 700;

export function HeroChatDemo({ compact = false }: { compact?: boolean }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: "smooth" });
    }
  }, [visibleCount, showTyping]);

  useEffect(() => {
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timeouts.push(id);
    };

    const runCycle = () => {
      setVisibleCount(0);
      setShowTyping(false);

      const playStep = (index: number) => {
        if (index >= DEMO_SCRIPT.length) {
          schedule(() => runCycle(), PAUSE_AFTER_LOOP_MS);
          return;
        }

        const msg = DEMO_SCRIPT[index];
        if (msg.role === "ai") {
          setShowTyping(true);
          schedule(() => {
            setShowTyping(false);
            setVisibleCount(index + 1);
            schedule(() => playStep(index + 1), PAUSE_BEFORE_USER_MS);
          }, TYPING_INDICATOR_MS + PAUSE_BEFORE_AI_MS);
        } else {
          schedule(() => {
            setVisibleCount(index + 1);
            const next = DEMO_SCRIPT[index + 1];
            const delay =
              next?.role === "ai" ? PAUSE_BEFORE_AI_MS : PAUSE_BEFORE_USER_MS;
            schedule(() => playStep(index + 1), delay);
          }, PAUSE_BEFORE_USER_MS);
        }
      };

      schedule(() => playStep(0), 600);
    };

    runCycle();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const visible = DEMO_SCRIPT.slice(0, visibleCount);

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full" />
      <div
        className={`relative bg-white border border-gray-100 shadow-2xl overflow-hidden mx-auto w-full ${
          compact
            ? "rounded-[20px] sm:rounded-[24px] max-w-[360px]"
            : "rounded-2xl sm:rounded-[28px] lg:rounded-[32px] max-w-full sm:max-w-[380px] lg:max-w-[400px]"
        }`}
      >
        <div className="bg-[#075e54] text-white p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">smart_toy</span>
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm">AI Assistant (You)</div>
            <div className="text-[10px] opacity-80 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#25D366] animate-pulse" />
              Online
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className={`bg-[#e5ddd5] p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 overflow-y-auto scroll-smooth ${
            compact ? "h-[300px] sm:h-[380px]" : "h-[280px] sm:h-[360px] md:h-[420px] lg:h-[450px]"
          }`}
        >
          {visible.map((msg, i) => (
            <div
              key={`${i}-${msg.time}-${msg.role}`}
              className={`animate-chat-bubble-in ${
                msg.role === "user"
                  ? "whatsapp-bubble-user self-end bg-[#dcf8c6] p-3 text-xs shadow-sm max-w-[85%] text-on-surface"
                  : "whatsapp-bubble-ai self-start bg-white p-3 text-xs shadow-sm max-w-[85%] text-on-surface"
              }`}
            >
              {msg.text}
              <div className="text-[9px] text-right mt-1 opacity-50">{msg.time}</div>
            </div>
          ))}

          {showTyping ? (
            <div className="animate-chat-bubble-in self-start bg-white px-3 py-2.5 rounded-lg shadow-sm flex items-center gap-1 max-w-[72px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9ca3af] animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#9ca3af] animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#9ca3af] animate-bounce [animation-delay:300ms]" />
            </div>
          ) : null}
        </div>

        <div className="bg-gray-50 p-3 flex items-center gap-2 border-t border-gray-200">
          <span className="material-symbols-outlined text-gray-400">add</span>
          <div className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-xs text-gray-400">
            Type a message...
          </div>
          <span className="material-symbols-outlined text-gray-400">mic</span>
        </div>
      </div>
    </div>
  );
}
