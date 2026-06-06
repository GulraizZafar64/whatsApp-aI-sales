"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");
  const isAuth =
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]">
      <Navbar />
      <main
        className={
          isDashboard
            ? "flex flex-1 flex-col min-h-0"
            : isAuth
              ? "flex flex-1 flex-col min-h-0"
              : "flex-1"
        }
      >
        {children}
      </main>
      {!isDashboard && !isAuth ? <Footer /> : null}
      {!isDashboard && !isAuth ? <WhatsAppFloatingButton /> : null}
    </div>
  );
}
