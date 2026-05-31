"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { dashboardFetch } from "@/lib/dashboard/session";

type BlockedRow = {
  id: number;
  phone: string;
  normalizedWaId: string;
};

export function BlacklistPanel() {
  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const phoneNumberId = localStorage.getItem("whatsappPhoneNumberId")?.trim();
    if (!phoneNumberId) {
      setLoading(false);
      toast.error("Missing phone number ID. Sign in again after connecting WhatsApp.");
      return;
    }
    setLoading(true);
    try {
      const res = await dashboardFetch("/api/blacklist");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof data.error === "string" ? data.error : "Could not load blacklist."
        );
        setRows([]);
        return;
      }
      setRows((data as { blocked?: BlockedRow[] }).blocked ?? []);
    } catch {
      toast.error("Network error loading blacklist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      toast.error("Enter a mobile number.");
      return;
    }
    setSaving(true);
    try {
      const res = await dashboardFetch("/api/blacklist", {
        method: "POST",
        body: JSON.stringify({ phone: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Could not add.");
        return;
      }
      toast.success("Number added to blacklist.");
      setPhone("");
      await load();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      const res = await dashboardFetch(`/api/blacklist/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Remove failed.");
        return;
      }
      toast.success("Removed from blacklist.");
      await load();
    } catch {
      toast.error("Network error.");
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
      <div className="max-w-lg mx-auto space-y-4">
        <p className="text-sm text-[#667781]">
          Blocked numbers are stored for this business. You can use this list later
          to ignore chats or auto-replies from these contacts (hook not wired yet).
        </p>

        <div className="rounded-xl border border-black/8 bg-white p-4 shadow-sm space-y-3">
          <label className="block text-xs font-semibold text-[#54656f]">
            Mobile number
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void add();
              }}
              placeholder="+92 300 1234567"
              className="mt-1 w-full rounded-lg border border-black/10 bg-[#f0f2f5] px-3 py-2.5 text-sm text-[#111b21] outline-none focus:ring-2 focus:ring-[#075E54]/25"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void add()}
            className="w-full py-2.5 rounded-lg bg-[#075E54] text-white text-sm font-bold hover:bg-[#054d45] disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add to blacklist"}
          </button>
        </div>

        <div className="rounded-xl border border-black/8 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/6 bg-[#f8f9fa]">
            <h2 className="text-sm font-bold text-[#111b21]">Blocked numbers</h2>
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs font-bold text-[#075E54] hover:underline"
            >
              Refresh
            </button>
          </div>
          {rows.length === 0 ? (
            <p className="p-4 text-sm text-[#667781]">No numbers blocked yet.</p>
          ) : (
            <ul className="divide-y divide-black/6">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-[#111b21] truncate">{r.phone}</p>
                    <p className="text-[11px] text-[#8696a0] truncate">
                      Key: {r.normalizedWaId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(r.id)}
                    className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-red-50 text-red-700 hover:bg-red-100"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-[#8696a0] text-center">
          If API errors mention no business record, complete{" "}
          <a href="/get-started" className="text-[#075E54] font-semibold underline">
            Get Started
          </a>{" "}
          for this WhatsApp number.
        </p>
      </div>
    </div>
  );
}
