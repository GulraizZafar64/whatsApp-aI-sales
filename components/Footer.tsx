import Link from "next/link";
import { AppLogo } from "@/components/brand/AppLogo";
import { WhatsAppButton } from "@/components/marketing/WhatsAppButton";
import { MARKETING_WHATSAPP } from "@/lib/marketing-cta";

const FOOTER_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/contact-us", label: "Contact" },
  // { href: "/docs", label: "API Docs" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
] as const;

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 w-full py-10 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left gap-4">
            <AppLogo href="/" size="lg" />
            <p className="text-xs sm:text-sm text-gray-500 max-w-sm leading-relaxed">
              © {new Date().getFullYear()} WhatsApp AI Sales. AI-powered sales on
              WhatsApp — catalogs, auto-replies, and orders in one place.
            </p>
            <WhatsAppButton
              href={MARKETING_WHATSAPP.support}
              className="w-full max-w-xs sm:w-auto text-sm"
            >
              Chat with support
            </WhatsAppButton>
          </div>

          <nav
            className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 sm:gap-4 border-t border-gray-200 pt-8"
            aria-label="Footer"
          >
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs sm:text-sm text-gray-600 hover:text-[#25D366] transition-colors py-1"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
