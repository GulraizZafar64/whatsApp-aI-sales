import Link from "next/link";
import type { ReactNode } from "react";
import {
  APP_NAME,
  APP_TAGLINE,
  LEGAL_LAST_UPDATED,
  PRIVACY_EMAIL,
  SUPPORT_EMAIL,
} from "@/lib/legal-site";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type Props = {
  title: string;
  badge: string;
  intro: ReactNode;
  sections: LegalSection[];
  sibling: { href: string; label: string };
};

export function LegalPageShell({ title, badge, intro, sections, sibling }: Props) {
  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {/* Hero */}
      <section className="pt-28 pb-12 px-6 md:px-8 border-b border-outline-variant/40 bg-gradient-to-b from-primary-container/10 to-surface">
        <div className="max-w-5xl mx-auto">
          <span className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-primary-container/15 text-on-primary-container text-label-sm border border-primary-container/25 mb-6">
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            {badge}
          </span>
          <h1 className="text-display-lg md:text-display-xl text-on-background mb-4">{title}</h1>
          <p className="text-body-lg text-secondary max-w-3xl mb-6">{APP_TAGLINE}</p>
          <div className="flex flex-wrap items-center gap-4 text-label-sm text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
              Last updated: {LEGAL_LAST_UPDATED}
            </span>
            <span className="hidden sm:inline text-outline-variant">·</span>
            <Link
              href={sibling.href}
              className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
            >
              {sibling.label}
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          {/* TOC */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <nav
              className="lg:sticky lg:top-28 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-sm"
              aria-label="Table of contents"
            >
              <p className="text-label-md font-bold text-on-surface mb-4">On this page</p>
              <ol className="space-y-2 text-body-sm">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="flex gap-2 text-secondary hover:text-primary transition-colors group"
                    >
                      <span className="text-primary/60 font-mono text-xs mt-0.5 w-5 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="group-hover:underline">{s.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
              <div className="mt-6 pt-6 border-t border-outline-variant/40">
                <p className="text-label-sm text-secondary mb-2">Questions?</p>
                <a
                  href={`mailto:${PRIVACY_EMAIL}`}
                  className="text-body-sm text-primary font-medium hover:underline break-all"
                >
                  {PRIVACY_EMAIL}
                </a>
              </div>
            </nav>
          </aside>

          {/* Body */}
          <article className="lg:col-span-8 xl:col-span-9 space-y-10">
            <div className="rounded-2xl border border-primary/20 bg-primary-container/5 p-6 md:p-8 text-body-md text-on-surface leading-relaxed">
              {intro}
            </div>

            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-28 rounded-2xl border border-outline-variant/40 bg-white p-6 md:p-8 shadow-sm"
              >
                <div className="flex items-start gap-4 mb-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary text-label-md font-bold">
                    {index + 1}
                  </span>
                  <h2 className="text-headline-sm text-on-background pt-1">{section.title}</h2>
                </div>
                <div className="legal-prose pl-0 md:pl-14 text-body-md text-on-surface-variant leading-relaxed space-y-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2 [&_a]:text-primary [&_a]:font-medium [&_a]:hover:underline [&_strong]:text-on-surface [&_strong]:font-semibold">
                  {section.content}
                </div>
              </section>
            ))}

            {/* Footer CTA */}
            <div className="rounded-2xl bg-[#075E54] text-white p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-headline-sm font-bold mb-2">Using {APP_NAME}?</p>
                <p className="text-body-sm text-white/85 max-w-xl">
                  By connecting WhatsApp and using the dashboard, you agree to these policies. Contact us for
                  data requests or compliance questions.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <Link
                  href="/contact-us"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-[#075E54] font-bold text-label-md hover:bg-white/90 transition-colors"
                >
                  Contact support
                </Link>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-white/40 text-white font-bold text-label-md hover:bg-white/10 transition-colors"
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
