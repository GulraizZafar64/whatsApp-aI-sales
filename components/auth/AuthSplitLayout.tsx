"use client";

import type { ReactNode } from "react";
import { AppLogo } from "@/components/brand/AppLogo";
import { HeroChatDemo } from "@/components/landing/HeroChatDemo";

export function AuthSplitLayout({
  demoSide,
  children,
}: {
  demoSide: "left" | "right";
  children: ReactNode;
}) {
  const demoPanel = (
    <div className="hidden lg:flex flex-1 items-center justify-center p-8 xl:p-12 bg-[#f0f4f8] border-gray-100 min-h-0">
      <div className="w-full max-w-[420px] space-y-6">
        <AppLogo href="/" size="md" />
        <div>
          <p className="text-sm font-semibold text-[#25D366] uppercase tracking-wide mb-2">
            Live demo
          </p>
          <h2 className="text-2xl font-bold text-[#111827] leading-snug">
            See how AI handles your WhatsApp sales chat
          </h2>
          <p className="text-sm text-[#6b7280] mt-2">
            Instant replies, product answers, and orders — 24/7.
          </p>
        </div>
        <HeroChatDemo compact />
      </div>
    </div>
  );

  const formPanel = (
    <div className="flex-1 flex items-center justify-center px-4 py-10 lg:py-12 bg-surface-bright min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );

  return (
    <div
      className={`flex flex-1 flex-col min-h-0 w-full ${
        demoSide === "right" ? "lg:flex-row-reverse" : "lg:flex-row"
      }`}
    >
      {demoPanel}
      {formPanel}
    </div>
  );
}
