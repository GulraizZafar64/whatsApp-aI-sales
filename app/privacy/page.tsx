import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { privacySections } from "@/components/legal/privacy-sections";
import { APP_NAME } from "@/lib/legal-site";

export const metadata: Metadata = {
  title: `Privacy Policy | ${APP_NAME}`,
  description: `How ${APP_NAME} collects and processes business, WhatsApp message, catalog, and AI data — Meta, Anthropic, and your rights.`,
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      badge="Legal & data"
      sibling={{ href: "/terms", label: "Terms of Service" }}
      intro={
        <p>
          We built {APP_NAME} for businesses that sell on WhatsApp. This policy describes what we collect from you
          and what we process on your behalf when your customers chat with your connected number—including inbox
          storage, AI replies powered by Anthropic, and order automation.
        </p>
      }
      sections={privacySections}
    />
  );
}
