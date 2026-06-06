"use client";

import { useEffect, useRef, useState } from "react";
import { ProfilePanel } from "@/components/dashboard/ProfilePanel";

type Variant = "sidebar" | "navbar";

export function AccountMenu({
  displayName,
  subtitle,
  initial,
  onLogout,
  onBusinessSettings,
  variant = "sidebar",
}: {
  displayName: string;
  subtitle: string;
  initial: string;
  onLogout: () => void;
  onBusinessSettings?: () => void;
  variant?: Variant;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const isSidebar = variant === "sidebar";

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={
            isSidebar
              ? "w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] hover:bg-white/10 text-left transition-colors"
              : "flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-[5px] hover:bg-[#f3f4f6] transition-colors"
          }
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span
            className={`rounded-full bg-[#25D366] text-white font-bold flex items-center justify-center shrink-0 ${
              isSidebar ? "h-9 w-9 text-sm" : "h-8 w-8 text-sm"
            }`}
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={`truncate font-semibold ${
                isSidebar
                  ? "text-sm text-white"
                  : "text-sm text-[#111827] hidden sm:block max-w-[100px] lg:max-w-[140px]"
              }`}
            >
              {displayName}
            </p>
            {isSidebar && subtitle ? (
              <p className="text-[11px] text-[#9ca3af] truncate">{subtitle}</p>
            ) : null}
          </div>
          <span
            className={`material-symbols-outlined text-lg shrink-0 transition-transform ${
              menuOpen ? "rotate-180" : ""
            } ${isSidebar ? "text-[#9ca3af]" : "text-[#6b7280]"}`}
          >
            expand_more
          </span>
        </button>

        {menuOpen ? (
          <div
            className={`absolute z-50 min-w-[180px] rounded-[5px] border shadow-lg py-1 ${
              isSidebar
                ? "left-0 right-0 bottom-full mb-1 bg-[#1f2937] border-white/10"
                : "right-0 top-full mt-1 bg-white border-[#e5e7eb]"
            }`}
            role="menu"
          >
            {onBusinessSettings ? (
              <button
                type="button"
                role="menuitem"
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                  isSidebar
                    ? "text-white hover:bg-white/10"
                    : "text-[#111827] hover:bg-[#f3f4f6]"
                }`}
                onClick={() => {
                  setMenuOpen(false);
                  onBusinessSettings();
                }}
              >
                <span className="material-symbols-outlined text-xl">store</span>
                Business settings
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                isSidebar
                  ? "text-white hover:bg-white/10"
                  : "text-[#111827] hover:bg-[#f3f4f6]"
              }`}
              onClick={() => {
                setMenuOpen(false);
                setProfileOpen(true);
              }}
            >
              <span className="material-symbols-outlined text-xl">person</span>
              Profile
            </button>
            <button
              type="button"
              role="menuitem"
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                isSidebar
                  ? "text-[#fca5a5] hover:bg-white/10"
                  : "text-[#dc2626] hover:bg-red-50"
              }`}
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              Log out
            </button>
          </div>
        ) : null}
      </div>

      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
