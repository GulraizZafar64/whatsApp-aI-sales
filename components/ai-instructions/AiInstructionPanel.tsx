"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { AiInstructionsRecord } from "@/lib/ai-instructions";
import { DEFAULT_AI_INSTRUCTIONS } from "@/lib/ai-instructions";
import {
  DEFAULT_REPLY_TONE,
  normalizeReplyTone,
  REPLY_TONE_UI,
  type ReplyTone,
} from "@/lib/reply-tone";
import { dashboardFetch } from "@/lib/dashboard/session";

const FIELDS: {
  key: keyof AiInstructionsRecord;
  title: string;
  hint: string;
}[] = [
  {
    key: "whenUserArrives",
    title: "1 — When the user arrives",
    hint: "First reply when someone opens a chat with you.",
  },
  {
    key: "howToDealWithUser",
    title: "2 — How to deal with the user",
    hint: "Stay polite and kind. If they have not bought yet, gently encourage them without being pushy.",
  },
  {
    key: "whenOrderComplete",
    title: "3 — When an order is complete",
    hint: "What the AI should say after a sale is confirmed or marked done.",
  },
  {
    key: "whenUserWillNotBuy",
    title: "4 — If the user does not want to buy",
    hint: "Polite closing when they refuse—no hard selling after a clear no.",
  },
];

export function AiInstructionPanel() {
  const [data, setData] = useState<AiInstructionsRecord | null>(null);
  const [businessDescription, setBusinessDescription] = useState("");
  const [replyTone, setReplyTone] = useState<ReplyTone>(DEFAULT_REPLY_TONE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const phoneNumberId = localStorage.getItem("whatsappPhoneNumberId")?.trim();
    if (!phoneNumberId) {
      setLoading(false);
      toast.error("Missing phone number ID.");
      return;
    }
    setLoading(true);
    try {
      const resAi = await dashboardFetch("/api/business/ai-instructions");
      const jsonAi = await resAi.json().catch(() => ({}));

      if (!resAi.ok) {
        toast.error(
          typeof jsonAi.error === "string"
            ? jsonAi.error
            : "Could not load instructions."
        );
        setData(null);
        return;
      }
      const j = jsonAi as {
        instructions: AiInstructionsRecord;
        businessDescription?: string;
        replyTone?: string;
      };
      setData(j.instructions);
      if (typeof j.businessDescription === "string") {
        setBusinessDescription(j.businessDescription);
      }
      if (typeof j.replyTone === "string") {
        setReplyTone(normalizeReplyTone(j.replyTone));
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const draft = data ?? DEFAULT_AI_INSTRUCTIONS;

  const setField = (key: keyof AiInstructionsRecord, value: string) => {
    setData((prev) => ({ ...(prev ?? DEFAULT_AI_INSTRUCTIONS), [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await dashboardFetch("/api/business/ai-instructions", {
        method: "PATCH",
        body: JSON.stringify({
          ...draft,
          businessDescription,
          replyTone,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Save failed.");
        return;
      }
      const j = json as {
        instructions: AiInstructionsRecord;
        businessDescription?: string;
        replyTone?: string;
      };
      setData(j.instructions);
      if (typeof j.businessDescription === "string") {
        setBusinessDescription(j.businessDescription);
      }
      if (typeof j.replyTone === "string") {
        setReplyTone(normalizeReplyTone(j.replyTone));
      }
      toast.success("AI instructions saved.");
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    setSaving(true);
    try {
      const res = await dashboardFetch("/api/business/ai-instructions", {
        method: "POST",
        body: JSON.stringify({ reset: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Reset failed.");
        return;
      }
      const j = json as {
        instructions: AiInstructionsRecord;
        businessDescription?: string;
        replyTone?: string;
      };
      setData(j.instructions);
      if (typeof j.businessDescription === "string") {
        setBusinessDescription(j.businessDescription);
      }
      if (typeof j.replyTone === "string") {
        setReplyTone(normalizeReplyTone(j.replyTone));
      }
      toast.success("Restored default instruction texts (welcome, sales, order, decline).");
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-[#f0f2f5]">
        <div className="animate-spin h-10 w-10 border-4 border-[#075E54] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-[#f0f2f5]">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[#667781]">
            Instructions and tone feed WhatsApp auto-replies. If a customer goes quiet
            for 30 minutes after a product reply, they get one follow-up at your
            bargain price (set on each product). Blocked numbers never get a reply.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-bold text-[#075E54] hover:underline shrink-0"
          >
            Refresh
          </button>
        </div>

        <div className="rounded-xl border border-black/8 bg-white p-4 shadow-sm space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#111b21]">Business description</h3>
            <p className="text-[11px] text-[#667781]">
              What you sell, how you position your brand—helps the AI stay on-message.
            </p>
            <textarea
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-black/10 bg-[#f8f9fa] px-3 py-2.5 text-sm text-[#111b21] outline-none focus:ring-2 focus:ring-[#075E54]/25 resize-y min-h-[120px]"
              placeholder="Tell us about your business, what you sell, and your brand voice…"
            />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#111b21]">Tone of replies</h3>
            <p className="text-[11px] text-[#667781]">
              Pick how the AI should sound on WhatsApp. Save instructions to apply.
            </p>
            <div
              role="tablist"
              aria-label="Reply tone"
              className="flex rounded-xl border border-black/10 bg-[#f0f2f5] p-1 gap-1"
            >
              {REPLY_TONE_UI.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={replyTone === id}
                  onClick={() => setReplyTone(id)}
                  className={`flex-1 min-w-0 px-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    replyTone === id
                      ? "bg-white text-[#075E54] shadow-sm ring-1 ring-[#075E54]/20"
                      : "text-[#54656f] hover:text-[#111b21] hover:bg-white/60"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#075E54] font-semibold">
              {REPLY_TONE_UI.find((t) => t.id === replyTone)?.blurb}
            </p>
          </div>
        </div>

        {FIELDS.map(({ key, title, hint }) => (
          <div
            key={key}
            className="rounded-xl border border-black/8 bg-white p-4 shadow-sm space-y-2"
          >
            <div>
              <h3 className="text-sm font-bold text-[#111b21]">{title}</h3>
              <p className="text-[11px] text-[#667781] mt-0.5">{hint}</p>
            </div>
            <textarea
              value={draft[key]}
              onChange={(e) => setField(key, e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-black/10 bg-[#f8f9fa] px-3 py-2.5 text-sm text-[#111b21] outline-none focus:ring-2 focus:ring-[#075E54]/25 resize-y min-h-[120px]"
            />
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="px-5 py-2.5 rounded-lg bg-[#075E54] text-white text-sm font-bold hover:bg-[#054d45] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save instructions"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void resetDefaults()}
            className="px-5 py-2.5 rounded-lg border border-black/15 bg-white text-sm font-bold text-[#111b21] hover:bg-[#f0f2f5] disabled:opacity-50"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
