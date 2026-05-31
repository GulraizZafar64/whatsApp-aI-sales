"use client";

import { useEffect, useState } from "react";
import { CountrySelect } from "@/components/business/CountrySelect";
import { TYPE_PLACEHOLDER, isUnsetBusinessType } from "@/lib/business-type";
import { BusinessTypeSelect } from "@/components/business/BusinessTypeSelect";
import { getCountryPlaceholder, isUnsetCountrySelection } from "@/lib/countries";

type Props = {
  open: boolean;
  initialBusinessName?: string | null;
  initialBusinessType?: string | null;
  initialCountry?: string | null;
  whatsappNumber?: string | null;
  saving?: boolean;
  onSave: (data: {
    businessName: string;
    businessType: string;
    country: string;
  }) => void | Promise<void>;
};

export function BusinessProfileModal({
  open,
  initialBusinessName,
  initialBusinessType,
  initialCountry,
  whatsappNumber,
  saving = false,
  onSave,
}: Props) {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Select type...");
  const [country, setCountry] = useState(getCountryPlaceholder());

  useEffect(() => {
    if (!open) return;
    setBusinessName(initialBusinessName?.trim() ?? "");
    const bt = initialBusinessType?.trim();
    setBusinessType(
      bt && !isUnsetBusinessType(bt) ? bt : "Select type..."
    );
    const c = initialCountry?.trim();
    setCountry(c && !isUnsetCountrySelection(c) ? c : getCountryPlaceholder());
  }, [open, initialBusinessName, initialBusinessType, initialCountry]);

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
    });
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
          <div>
            <h2
              id="business-profile-title"
              className="text-lg font-bold text-[#111b21]"
            >
              Complete your business profile
            </h2>
            <p className="text-sm text-[#667781] mt-1">
              Required before you use the dashboard. Your WhatsApp number is
              taken from Meta when you sign in—you do not enter it here.
            </p>
            {whatsappNumber?.trim() ? (
              <p className="text-xs text-[#075E54] font-semibold mt-2">
                Connected number: {whatsappNumber}
              </p>
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
                onChange={setCountry}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 rounded-lg bg-[#075E54] text-white text-sm font-bold hover:bg-[#054d45] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Continue to dashboard"}
          </button>
        </div>
      </form>
    </div>
  );
}
