"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import toast from "react-hot-toast";
import { AppLogo } from "@/components/brand/AppLogo";
import { AccountMenu } from "@/components/dashboard/AccountMenu";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  DASHBOARD_NAV,
  getDashboardAppBar,
  isNavActive,
} from "@/lib/dashboard/nav";
import {
  clearDashboardSession,
  requestOpenBusinessSettings,
} from "@/lib/dashboard/session";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard";
  const { businessType, userName, userEmail } = useDashboard();

  const appBar = useMemo(
    () => getDashboardAppBar(pathname, businessType),
    [pathname, businessType]
  );

  const displayName = userName || userEmail.split("@")[0] || "Account";
  const userInitial = displayName.slice(0, 1).toUpperCase();

  const logout = () => {
    clearDashboardSession();
    toast.success("Logged out");
    router.replace("/sign-in");
  };

  const isInbox = pathname === "/dashboard";

  return (
    <div className="flex flex-1 min-h-0 bg-[#f1f5f9]">
      <nav
        className="hidden md:flex flex-col w-[220px] lg:w-[240px] shrink-0 bg-[#111827] text-white"
        aria-label="Dashboard"
      >
        
        <div className="flex-1 py-4 px-3 space-y-1">
          {DASHBOARD_NAV.map((item) => {
            const active = isNavActive(
              pathname,
              item.href,
              "exact" in item && item.exact
            );
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[5px] text-sm transition-colors ${
                  active
                    ? "bg-[#25D366] text-white font-semibold shadow-sm"
                    : "text-[#9ca3af] hover:bg-white/10 hover:text-white font-medium"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {item.icon}
                </span>
                <span className="flex-1">
                  {item.label === "AI instruction" ? "AI Agent" : item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="p-3 border-t border-white/10">
          <AccountMenu
            variant="sidebar"
            displayName={displayName}
            subtitle="User"
            initial={userInitial}
            onLogout={logout}
            onBusinessSettings={requestOpenBusinessSettings}
          />
        </div>
      </nav>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {!isInbox ? (
          <header className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-b border-[#e5e7eb] min-w-0">
            <span className="material-symbols-outlined text-[#25D366] text-xl sm:text-2xl shrink-0">
              {appBar.icon}
            </span>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-[#111827] truncate">
                {appBar.title}
              </h1>
              <p className="text-[11px] sm:text-xs text-[#6b7280] truncate">
                {appBar.subtitle}
              </p>
            </div>
          </header>
        ) : null}

        <div
          className={`flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden ${
            isInbox ? "" : "p-4 sm:p-6 pb-20 md:pb-6"
          }`}
        >
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
            {children}
          </div>
        </div>
      </div>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 flex h-14 bg-[#111827] border-t border-white/10 safe-area-pb"
        aria-label="Mobile dashboard"
      >
        {DASHBOARD_NAV.map((item) => {
          const active = isNavActive(
            pathname,
            item.href,
            "exact" in item && item.exact
          );
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 text-[9px] sm:text-[10px] px-0.5 ${
                active ? "text-[#25D366]" : "text-[#9ca3af]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px] sm:text-[22px]">
                {item.icon}
              </span>
              <span className="truncate max-w-full">
                {item.label === "Checkout settings"
                  ? "Checkout"
                  : item.label.split(" ")[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
