"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppLogo } from "@/components/brand/AppLogo";
import { NavbarLoggedInActions } from "@/components/NavbarLoggedInActions";

type NavLink = {
  href: string;
  label: string;
  authOnly?: boolean;
};

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
  { href: "/dashboard", label: "Dashboard", authOnly: true },
];

function navLinkClass(active: boolean): string {
  if (active) {
    return "text-[#25D366] font-semibold border-b-2 border-[#25D366] pb-0.5";
  }
  return "text-[#4b5563] font-medium hover:text-[#25D366] transition-colors pb-0.5 border-b-2 border-transparent";
}

export default function Navbar() {
  const pathname = usePathname() ?? "";
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem("authToken")?.trim();
    setIsLoggedIn(Boolean(token));
  }, []);

  useEffect(() => {
    checkAuth();
    window.addEventListener("authChange", checkAuth);
    window.addEventListener("storage", checkAuth);
    return () => {
      window.removeEventListener("authChange", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, [checkAuth]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const isDashboard = pathname.startsWith("/dashboard");

  const visibleLinks = NAV_LINKS.filter(
    (item) => !item.authOnly || isLoggedIn
  );

  const linkActive = (href: string) =>
    pathname === href ||
    (href !== "/" && pathname.startsWith(`${href}/`)) ||
    (href === "/dashboard" && isDashboard);

  return (
    <header className="w-full shrink-0 bg-white border-b border-[#e5e7eb] z-50 relative">
      <nav className="max-w-[1600px] mx-auto flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 min-h-[52px] sm:min-h-[56px]">
        <AppLogo
          href={isLoggedIn ? "/dashboard" : "/"}
          size="md"
          priority
          className="max-w-[10.5rem] sm:max-w-[12rem]"
        />

        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          {visibleLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(linkActive(item.href))}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
          {isLoggedIn ? (
            <NavbarLoggedInActions layout="header" />
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-[#4b5563] hover:text-[#25D366] px-2 hidden min-[400px]:inline"
              >
                Login
              </Link>
              <Link href="/sign-up">
                <span className="inline-flex items-center bg-[#25D366] hover:bg-[#20bd5a] text-white px-3 sm:px-4 py-2 rounded-[5px] font-semibold text-sm transition-colors shadow-sm">
                  Get Started
                </span>
              </Link>
            </>
          )}

          <button
            type="button"
            className="lg:hidden p-2 rounded-[5px] text-[#4b5563] hover:bg-[#f3f4f6]"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div
          className="lg:hidden fixed inset-0 z-[100]"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[min(85vw,300px)] max-w-full bg-white shadow-xl flex flex-col animate-[slideInLeft_0.2s_ease-out]">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#e5e7eb] shrink-0">
              <AppLogo
                href={isLoggedIn ? "/dashboard" : "/"}
                size="sm"
                onClick={() => setMobileOpen(false)}
              />
              <button
                type="button"
                className="p-2 rounded-[5px] text-[#4b5563] hover:bg-[#f3f4f6] shrink-0"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <span className="material-symbols-outlined text-[24px]">
                  close
                </span>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
              <div className="flex flex-col gap-1">
                {visibleLinks.map((item) => {
                  const active = linkActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`px-3 py-2.5 rounded-[5px] text-sm ${
                        active
                          ? "bg-[#25D366]/10 text-[#25D366] font-semibold"
                          : "text-[#374151] hover:bg-[#f3f4f6]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                {!isLoggedIn ? (
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 rounded-[5px] text-sm text-[#374151] hover:bg-[#f3f4f6]"
                  >
                    Login
                  </Link>
                ) : null}
              </div>
            </nav>

            {isLoggedIn ? (
              <NavbarLoggedInActions
                layout="drawer"
                onNavigate={() => setMobileOpen(false)}
              />
            ) : null}
          </aside>
        </div>
      ) : null}
    </header>
  );
}
