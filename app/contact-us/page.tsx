import Link from "next/link";
import { DemoPageLink } from "@/components/marketing/MarketingCta";
import { WhatsAppButton } from "@/components/marketing/WhatsAppButton";
import { MARKETING_WHATSAPP } from "@/lib/marketing-cta";
import { SUPPORT_WHATSAPP_DISPLAY } from "@/lib/support-whatsapp";

const wa = MARKETING_WHATSAPP;

export default function ContactUsPage() {
  return (
    <main className="pt-8 sm:pt-12 pb-16">
      <section className="max-w-3xl mx-auto px-4 sm:px-8 mb-12 sm:mb-16 text-center">
        <span className="inline-block py-1 px-3 rounded-full bg-primary-container/10 text-on-primary-container text-label-sm mb-4">
          Support Center
        </span>
        <h1 className="text-2xl sm:text-display-xl text-on-background mb-3">
          We&apos;re here on WhatsApp
        </h1>
        <p className="text-sm sm:text-body-lg text-secondary max-w-xl mx-auto mb-6">
          No contact form — message us directly for setup help, billing, demos, or
          partnerships. We typically reply within a few hours on business days.
        </p>
        <WhatsAppButton href={wa.general} showPhone className="w-full sm:w-auto">
          Message us on WhatsApp
        </WhatsAppButton>
        <p className="mt-3 text-xs text-secondary">{SUPPORT_WHATSAPP_DISPLAY}</p>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-8 mb-12 sm:mb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-xl shadow-sm">
            <span className="material-symbols-outlined text-primary text-3xl mb-4 block">
              help_center
            </span>
            <h3 className="text-headline-sm mb-2">General support</h3>
            <p className="text-secondary text-sm mb-6">
              WhatsApp connection, AI replies, products, orders, and dashboard
              questions.
            </p>
            <WhatsAppButton
              href={wa.support}
              variant="outline"
              className="w-full text-sm py-2.5"
            >
              Support on WhatsApp
            </WhatsAppButton>
          </div>
          <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-xl shadow-sm">
            <span className="material-symbols-outlined text-primary text-3xl mb-4 block">
              play_circle
            </span>
            <h3 className="text-headline-sm mb-2">Product demo</h3>
            <p className="text-secondary text-sm mb-6">
              See how AI handles real customer chats before you subscribe.
            </p>
            <DemoPageLink className="block w-full py-2.5 text-center rounded-xl bg-primary-container text-on-primary-container font-bold text-sm hover:opacity-90">
              View interactive demo
            </DemoPageLink>
          </div>
          <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-xl shadow-sm">
            <span className="material-symbols-outlined text-primary text-3xl mb-4 block">
              handshake
            </span>
            <h3 className="text-headline-sm mb-2">Sales &amp; enterprise</h3>
            <p className="text-secondary text-sm mb-6">
              Custom pricing, API access, and partnership inquiries.
            </p>
            <WhatsAppButton
              href={wa.sales}
              className="w-full text-sm py-2.5"
            >
              Talk to sales
            </WhatsAppButton>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-8 mb-16">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 sm:p-10 shadow-sm space-y-6">
          <h2 className="text-headline-md text-on-background">What to include in your message</h2>
          <ul className="space-y-4 text-sm sm:text-body-md text-secondary">
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-[#25D366] shrink-0">
                check_circle
              </span>
              <span>
                <strong className="text-on-surface">Account email</strong> if you
                already signed up — we can find your business faster.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-[#25D366] shrink-0">
                check_circle
              </span>
              <span>
                <strong className="text-on-surface">Screenshots</strong> for bugs
                (QR connection, inbox, or billing).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="material-symbols-outlined text-[#25D366] shrink-0">
                check_circle
              </span>
              <span>
                <strong className="text-on-surface">Your country &amp; business type</strong>{" "}
                if you want plan or pricing guidance.
              </span>
            </li>
          </ul>
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <p className="text-sm text-secondary">
              Prefer self-serve? Start a free trial and connect WhatsApp in minutes.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex justify-center rounded-xl bg-[#075E54] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#064e46]"
            >
              Get started free
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <h2 className="text-headline-md mb-8 text-center">Common questions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <h4 className="font-medium text-on-surface mb-1">How fast do you reply?</h4>
              <p className="text-sm text-secondary">
                Usually within a few hours on WhatsApp during business days.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-on-surface mb-1">Can I get a demo?</h4>
              <p className="text-sm text-secondary">
                Yes — use the{" "}
                <Link href="/demo" className="text-primary font-medium hover:underline">
                  demo page
                </Link>{" "}
                or message us on WhatsApp.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-on-surface mb-1">Billing &amp; plans</h4>
              <p className="text-sm text-secondary">
                Ask on WhatsApp for help with checkout, trials, or upgrades.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-on-surface mb-1">Privacy requests</h4>
              <p className="text-sm text-secondary">
                Data access or deletion requests — mention &quot;privacy&quot; in your
                WhatsApp message.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-8 mt-12 sm:mt-16 text-center">
        <h2 className="text-xl sm:text-display-lg text-on-background mb-4">
          Ready to automate WhatsApp?
        </h2>
        <p className="text-secondary text-sm sm:text-body-lg mb-6 max-w-lg mx-auto">
          Join businesses using AI to reply, sell, and track orders 24/7.
        </p>
        <WhatsAppButton href={wa.expert} className="mx-auto">
          Talk to an expert
        </WhatsAppButton>
      </section>
    </main>
  );
}
