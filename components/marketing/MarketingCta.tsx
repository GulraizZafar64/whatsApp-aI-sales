import Link from "next/link";
import type { ReactNode } from "react";
import { DEMO_PAGE_HREF, MARKETING_WHATSAPP } from "@/lib/marketing-cta";

type CtaProps = {
  children: ReactNode;
  className?: string;
};

/** Opens WhatsApp to talk to sales / an expert. */
export function ExpertWhatsappLink({ children, className }: CtaProps) {
  return (
    <a
      href={MARKETING_WHATSAPP.expert}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

/** Opens WhatsApp for support. */
export function SupportWhatsappLink({ children, className }: CtaProps) {
  return (
    <a
      href={MARKETING_WHATSAPP.support}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

/** Opens WhatsApp for enterprise / sales. */
export function SalesWhatsappLink({ children, className }: CtaProps) {
  return (
    <a
      href={MARKETING_WHATSAPP.sales}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

/** Navigates to the on-site demo page. */
export function DemoPageLink({ children, className, href }: CtaProps & { href?: string }) {
  return (
    <Link href={href ?? DEMO_PAGE_HREF} className={className}>
      {children}
    </Link>
  );
}
