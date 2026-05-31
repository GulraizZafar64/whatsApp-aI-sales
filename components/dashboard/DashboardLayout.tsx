"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import toast from "react-hot-toast";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import {
  DASHBOARD_NAV,
  getDashboardAppBar,
  isNavActive,
} from "@/lib/dashboard/nav";
import { clearDashboardSession } from "@/lib/dashboard/session";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard";
  const { businessType } = useDashboard();

  const appBar = useMemo(
    () => getDashboardAppBar(pathname, businessType),
    [pathname, businessType]
  );

  const logout = () => {
    clearDashboardSession();
    toast.success("Logged out");
    router.replace("/sign-in");
  };

  return (
    <div className="pt-[4.5rem] pb-8 px-2 sm:px-4 bg-[#d9dbd5] min-h-screen">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-0 sm:gap-2 h-[min(780px,calc(100vh-6rem))]">
        <nav
          className="shrink-0 flex flex-row sm:flex-col overflow-x-auto sm:overflow-x-visible bg-[#075E54] sm:rounded-xl border border-black/10 shadow sm:w-[232px]"
          aria-label="Dashboard"
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
                prefetch
                className={`shrink-0 min-w-[100px] sm:min-w-0 sm:w-full flex flex-row items-center justify-center sm:justify-start gap-2 px-2 sm:px-3 py-3 text-white text-left transition-colors border-r sm:border-r-0 sm:border-b border-white/10 ${
                  active ? "bg-white/15" : "hover:bg-white/10"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="material-symbols-outlined text-xl sm:text-2xl shrink-0">
                  {item.icon}
                </span>
                <span className="text-[11px] sm:text-sm font-semibold leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0 flex flex-col rounded-xl overflow-hidden border border-black/10 shadow-xl bg-[#f0f2f5] min-h-0">
          <header className="shrink-0 flex items-center justify-between px-3 py-2.5 bg-[#075E54] text-white">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-2xl shrink-0">
                {appBar.icon}
              </span>
              <div className="min-w-0">
                <h1 className="text-sm font-bold truncate">{appBar.title}</h1>
                <p className="text-[11px] text-white/80 truncate">
                  {appBar.subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-full hover:bg-white/10 transition-colors shrink-0"
              aria-label="Log out"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
            </button>
          </header>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
