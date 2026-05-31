import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { termsSections } from "@/components/legal/terms-sections";
import { APP_NAME } from "@/lib/legal-site";

export const metadata: Metadata = {
  title: `Terms of Service | ${APP_NAME}`,
  description: `Terms governing use of ${APP_NAME} — WhatsApp AI sales, Meta integration, catalog, orders, and automated messaging.`,
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      badge="Legal"
      sibling={{ href: "/privacy", label: "Privacy Policy" }}
      intro={
        <p>
          These terms apply to merchants and teams using {APP_NAME} to connect WhatsApp Business, manage a product
          catalog, automate AI replies, record orders, and send optional follow-up messages. Please read them
          carefully before connecting your account or enabling automation.
        </p>
      }
      sections={termsSections}
    />
  );
}
