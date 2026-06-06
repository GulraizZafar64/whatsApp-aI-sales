"use client";

import { useEffect, useState } from "react";
import { CountrySelect } from "@/components/business/CountrySelect";
import { TYPE_PLACEHOLDER, isUnsetBusinessType } from "@/lib/business-type";
import { BusinessTypeSelect } from "@/components/business/BusinessTypeSelect";
import { CurrencySelect } from "@/components/business/CurrencySelect";
import { BallLoader } from "@/components/ui/BallLoader";
import { DEFAULT_CURRENCY, normalizeCurrency } from "@/lib/currency";
import {
  getCountryPlaceholder,
  getDefaultCurrencyForCountry,
  isUnsetCountrySelection,
} from "@/lib/countries";

type Props = {
  open: boolean;
  /** First-time setup vs changing type/name later */
  variant?: "setup" | "edit";
  initialBusinessName?: string | null;
  initialBusinessType?: string | null;
  initialCountry?: string | null;
  initialCurrency?: string | null;
  saving?: boolean;
  onClose?: () => void;
  onSave: (data: {
    businessName: string;
    businessType: string;
    country: string;
    currency: string;
  }) => void | Promise<void>;
  onDisconnectWhatsApp?: () => void | Promise<void>;
};

export function BusinessProfileModal({
  open,
  variant = "setup",
  initialBusinessName,
  initialBusinessType,
  initialCountry,
  initialCurrency,
  saving = false,
  onClose,
  onSave,
  onDisconnectWhatsApp,
}: Props) {
  const isEdit = variant === "edit";
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Select type...");
  const [country, setCountry] = useState(getCountryPlaceholder());
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusinessName(initialBusinessName?.trim() ?? "");
    const bt = initialBusinessType?.trim();
    setBusinessType(
      bt && !isUnsetBusinessType(bt) ? bt : "Select type..."
    );
    const c = initialCountry?.trim();
    setCountry(c && !isUnsetCountrySelection(c) ? c : getCountryPlaceholder());
    setCurrency(normalizeCurrency(initialCurrency));
  }, [
    open,
    initialBusinessName,
    initialBusinessType,
    initialCountry,
    initialCurrency,
  ]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = businessName.trim();
    if (!name) return;
    if (isUnsetBusinessType(businessType) || isUnsetCountrySelection(country)) {
      return;
    }
    void onSave({
      businessName: name,
      businessType,
      country,
      currency: normalizeCurrency(currency),
    });
  };

  const handleCountryChange = (nextCountry: string) => {
    setCountry(nextCountry);
    const autoCurrency = getDefaultCurrencyForCountry(nextCountry);
    if (autoCurrency) {
      setCurrency(normalizeCurrency(autoCurrency));
    }
  };

  const canSubmit =
    businessName.trim().length > 0 &&
    !isUnsetBusinessType(businessType) &&
    !isUnsetCountrySelection(country) &&
    !saving;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="business-profile-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-visible border border-black/10"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#075E54]/50 via-[#075E54] to-[#075E54]/50" />
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2
                id="business-profile-title"
                className="text-lg font-bold text-[#111b21]"
              >
                {isEdit ? "Business settings" : "Complete your business profile"}
              </h2>
              <p className="text-sm text-[#667781] mt-1">
                {isEdit
                  ? "Change business type (e.g. E-commerce → Food & Delivery). Product forms update after you save."
                  : "Set up your business, then scan the QR code to link WhatsApp."}
              </p>
            </div>
            {isEdit && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#54656f] hover:bg-[#f0f2f5] shrink-0"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111b21]">
              Business name
            </label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-lg border border-black/10 bg-[#f8f9fa] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#075E54]/25"
              placeholder="e.g. Acme Coffee Roasters"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold text-[#111b21]">
                Business type
              </label>
              <BusinessTypeSelect
                value={businessType}
                onChange={setBusinessType}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold text-[#111b21]">Country</label>
              <CountrySelect
                value={country}
                onChange={handleCountryChange}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold text-[#111b21]">
                Currency for prices
              </label>
              <CurrencySelect
                value={currency}
                onChange={setCurrency}
                required
              />
              <p className="text-[11px] text-[#667781]">
                Used on products, WhatsApp replies, and order emails.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 rounded-lg bg-[#075E54] text-white text-sm font-bold hover:bg-[#054d45] disabled:opacity-50"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Continue to dashboard"}
          </button>

          {isEdit && onDisconnectWhatsApp && (
            <div className="pt-4 border-t border-black/5">
              <p className="text-[11px] text-[#667781] mb-3 text-center">
                Need to change the linked number or fix a connection issue?
              </p>
              <button
                type="button"
                disabled={disconnecting}
                onClick={async () => {
                  if (!confirm("Are you sure you want to disconnect WhatsApp? You will need to scan the QR code again.")) return;
                  setDisconnecting(true);
                  try {
                    await onDisconnectWhatsApp();
                  } finally {
                    setDisconnecting(false);
                  }
                }}
                className="w-full py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {disconnecting ? (
                  <BallLoader size="xs" variant="danger" />
                ) : (
                  <span className="material-symbols-outlined text-lg">logout</span>
                )}
                Disconnect WhatsApp
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
