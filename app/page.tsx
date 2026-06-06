import Link from "next/link";
import { HeroChatDemo } from "@/components/landing/HeroChatDemo";
import {
  DemoPageLink,
  ExpertWhatsappLink,
} from "@/components/marketing/MarketingCta";
import { PricingPlansGrid } from "@/components/pricing/PricingPlansGrid";

export default function LandingPage() {
  return (
    <div className="bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden">
      {/* Hero Section */}
      <section className="pt-6 pb-10 sm:pt-10 sm:pb-14 md:pt-12 md:pb-section-padding-lg px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-gutter items-center">
          <div className="space-y-4 sm:space-y-6 lg:space-y-8 order-2 md:order-1">
            <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 bg-primary-container/20 text-on-primary-container rounded-full text-[10px] sm:text-label-sm border border-primary-container/30">
              <span className="material-symbols-outlined text-[14px] sm:text-[16px] mr-1.5 sm:mr-2">
                bolt
              </span>
              New: Multi-language Support v2.0
            </div>
            <h1 className="text-[1.5rem] leading-[1.25] font-bold tracking-tight sm:text-[1.875rem] md:text-[2.5rem] md:leading-tight lg:text-display-xl text-on-background">
              Turn Your WhatsApp Into a{" "}
              <span className="text-primary">24/7 Sales Assistant</span>
            </h1>
            <p className="text-sm leading-relaxed sm:text-base md:text-body-lg text-secondary max-w-lg">
              Automatically engage, nurture, and close deals through WhatsApp. Our AI
              understands customer intent and handles inquiries while you sleep.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-4">
              <Link href="/get-started" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto bg-primary text-on-primary px-5 py-2.5 sm:px-8 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-body-md hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95">
                  Get Started Free
                </button>
              </Link>
              <Link href="/demo" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto bg-surface-container-lowest border border-outline-variant text-on-surface px-5 py-2.5 sm:px-8 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-body-md hover:bg-surface-container-low transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px] sm:text-[24px]">
                    play_circle
                  </span>
                  View Demo
                </button>
              </Link>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 pt-2 sm:pt-4 text-xs sm:text-label-md text-secondary">
              <div className="flex -space-x-2 shrink-0">
                <img
                  alt="User"
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAr85nlk7UsjKUUho32MwxxJNpxl-B9K9MfFFb0Bcau0_3nvEJcGf-EQu_0uBNymCIu6EBeYbNXE7EY7zfOvjwqpvcZr2ueu2vOUFY5_not2XYGqM7Bi_czxwWZ5c6Um-BAu9LXO5JeyM1jgydRX6SyeOzxp655fBomY35apAz_dLt4vk92J44UipTkGreF6BLb_XX_-AIbF4hNp-8wWGqnGJ2FjiH4syH-7vC_OsEARK3bkXJoB6vxUT9z0JCR9CPpp7IZ-sPjC-3J"
                />
                <img
                  alt="User"
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKWFjSvYNFjOspqhSBosa_A9ugiHZwAXRhsti9kFSgSwRzw_dzWl2T8co1H64e-WG2efqMuBFzKMqAsIFyghnY0BI7dLdng90yuGfWkBylfkHnN1H6KJ9Znf_55bTYKt2zHt1dinaKvwcG_r9mIL4yJZn0Ila1Lf-ZVgVoOzSNQg7To4w5H9eJ9ZXr4SNJ28W03koXnJ7VizEjuL1EixZIDeSGnWimNB-BRGfdIj8Ejt98AuLWJq2bnJUjrVsnDwjberGq9gwSOIR8"
                />
                <img
                  alt="User"
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTHh2C6cQacON0bbRww6329_hP3rFr9shLVqrv2nHkpCCkEVawuhygvijsdVuhyLkUBiSMAFszCCqdoPQEOSR0rKwdceyqUNr9aIn1WMZH4SqCiAJSGNIUYK1yZ8nCo1d6T5IgHdS3jO4p54kY-dB_NWVfHeTlYufOalOqW7UBNvSmO-Gydn8FOLthlbWRjyNiOzlKXKfz_opNC5bgVOw92V3YLW8WUNpptAv_kXNxR4A3ICnmhThEZjaJYiqBGZpN1tW8k1VK09MG"
                />
              </div>
              <span className="min-w-0">Trusted by 2,000+ sales teams</span>
            </div>
          </div>
          <div className="order-1 md:order-2 w-full max-w-[400px] mx-auto md:max-w-none">
            <HeroChatDemo />
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-10 sm:py-14 md:py-section-padding-md bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-headline-md text-on-background mb-2 sm:mb-4 font-semibold">
              You&apos;re Losing Customers Every Day
            </h2>
            <p className="text-sm sm:text-base text-secondary max-w-2xl mx-auto px-1">
              Manual handling of WhatsApp leads is slow, inconsistent, and expensive.
              Here&apos;s what&apos;s costing you money right now.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl bg-surface-container-lowest border border-surface-container-high hover:border-primary/20 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-error/10 text-error flex items-center justify-center mb-4 sm:mb-6">
                <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
                  schedule
                </span>
              </div>
              <h3 className="text-base sm:text-lg md:text-headline-sm mb-2 sm:mb-3 font-semibold">
                Slow Replies
              </h3>
              <p className="text-sm sm:text-base text-secondary">
                Lead conversion drops 80% if you don&apos;t respond within the first 5
                minutes. Most teams take hours.
              </p>
            </div>
            <div className="p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl bg-surface-container-lowest border border-surface-container-high hover:border-primary/20 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-error/10 text-error flex items-center justify-center mb-4 sm:mb-6">
                <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
                  mail_lock
                </span>
              </div>
              <h3 className="text-base sm:text-lg md:text-headline-sm mb-2 sm:mb-3 font-semibold">
                Missed Messages
              </h3>
              <p className="text-sm sm:text-base text-secondary">
                High volume leads to forgotten conversations and ghosted customers. Every
                ghost is a lost sale.
              </p>
            </div>
            <div className="p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl bg-surface-container-lowest border border-surface-container-high hover:border-primary/20 transition-all sm:col-span-2 md:col-span-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-error/10 text-error flex items-center justify-center mb-4 sm:mb-6">
                <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
                  trending_down
                </span>
              </div>
              <h3 className="text-base sm:text-lg md:text-headline-sm mb-2 sm:mb-3 font-semibold">
                Lost Sales
              </h3>
              <p className="text-sm sm:text-base text-secondary">
                When customers can&apos;t buy instantly, they find a competitor who responds
                faster. Automation is the only way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-10 sm:py-14 md:py-section-padding-lg px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-on-background rounded-2xl sm:rounded-3xl md:rounded-[40px] p-5 sm:p-8 md:p-16 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/10 blur-[100px] pointer-events-none" />
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center relative">
              <div>
                <h2 className="text-xl sm:text-2xl md:text-display-lg mb-4 sm:mb-6 font-bold leading-tight">
                  We Fix That Automatically
                </h2>
                <p className="text-surface-variant text-sm sm:text-base md:text-body-lg mb-6 sm:mb-10">
                  Stop treating WhatsApp like a chat app and start treating it like a
                  high-conversion sales channel. Our AI bridges the gap between interest and
                  purchase.
                </p>
                <ul className="space-y-2.5 sm:space-y-4 text-sm sm:text-base">
                  <li className="flex items-center gap-2 sm:gap-3">
                    <span className="material-symbols-outlined text-primary-container text-[20px] sm:text-[24px] shrink-0">
                      check_circle
                    </span>
                    <span>Zero latency responses 24/7</span>
                  </li>
                  <li className="flex items-center gap-2 sm:gap-3">
                    <span className="material-symbols-outlined text-primary-container text-[20px] sm:text-[24px] shrink-0">
                      check_circle
                    </span>
                    <span>Human-like contextual understanding</span>
                  </li>
                  <li className="flex items-center gap-2 sm:gap-3">
                    <span className="material-symbols-outlined text-primary-container text-[20px] sm:text-[24px] shrink-0">
                      check_circle
                    </span>
                    <span>Seamless handover to sales reps</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-3 sm:mb-4 gap-2">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/40">
                      Manual Response
                    </span>
                    <span className="text-[10px] sm:text-xs bg-error/20 text-error px-2 py-0.5 rounded shrink-0">
                      Missed Sale
                    </span>
                  </div>
                  <div className="bg-white/10 h-6 sm:h-8 w-3/4 rounded-md mb-2" />
                  <div className="flex items-center gap-2 mt-3 sm:mt-4 text-[10px] sm:text-xs text-white/60">
                    <span className="material-symbols-outlined text-[14px]">history</span>
                    Wait time: 4 hours 12 minutes
                  </div>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-3 sm:mb-4 gap-2">
                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-primary/80">
                      AI Powered Assistant
                    </span>
                    <span className="text-[10px] sm:text-xs bg-primary-container text-on-primary-container px-2 py-0.5 rounded shrink-0">
                      Conversion!
                    </span>
                  </div>
                  <div className="bg-primary/20 h-6 sm:h-8 w-5/6 rounded-md mb-2" />
                  <div className="bg-primary/20 h-6 sm:h-8 w-1/2 rounded-md mb-2" />
                  <div className="flex items-center gap-2 mt-3 sm:mt-4 text-[10px] sm:text-xs text-primary/80">
                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                    Wait time: 2 seconds
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 sm:py-14 md:py-section-padding-md px-4 sm:px-6 lg:px-8 bg-surface-container-low">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-headline-md text-on-background mb-2 sm:mb-4 font-semibold">
              Built for High-Velocity Sales
            </h2>
            <p className="text-sm sm:text-base text-secondary max-w-2xl mx-auto">
              Powerful features designed to mimic your best salesperson, available every
              second of the day.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-gutter">
            {[
              {
                icon: "auto_awesome",
                title: "Instant Auto Replies",
                desc: "Every message is answered instantly with personalized information based on your business data.",
              },
              {
                icon: "psychology",
                title: "AI Understanding",
                desc: "Not just keywords. Our AI understands typos, slang, and complex questions about your services.",
              },
              {
                icon: "inventory_2",
                title: "Product Responses",
                desc: "Upload your CSV or link your Shopify to let the AI pitch products and check stock levels.",
              },
              {
                icon: "shopping_cart_checkout",
                title: "Order Handling",
                desc: "Collect shipping details and generate payment links directly within the WhatsApp interface.",
              },
              {
                icon: "update",
                title: "24/7 Uptime",
                desc: "Sales don't stop at 5 PM. Capture late-night leads while your human team is resting.",
              },
              {
                icon: "query_stats",
                title: "Detailed Analytics",
                desc: "Track conversion rates, most asked questions, and ROI through a clean dashboard.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border border-surface-container-high shadow-sm hover:shadow-md transition-all"
              >
                <span className="material-symbols-outlined text-primary text-[26px] sm:text-[32px] mb-3 sm:mb-4 block">
                  {f.icon}
                </span>
                <h4 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">{f.title}</h4>
                <p className="text-secondary text-xs sm:text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-10 sm:py-14 md:py-section-padding-lg px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-headline-md text-center mb-8 sm:mb-12 md:mb-16 font-semibold px-2">
            Get Started in 3 Simple Steps
          </h2>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-10 md:gap-12">
            {[
              {
                n: "01",
                title: "Connect WhatsApp",
                desc: "Scan a simple QR code to link your business number to our secure AI cloud.",
              },
              {
                n: "02",
                title: "Add Products",
                desc: "Import your catalog or type in your services so the AI knows exactly what you sell.",
              },
              {
                n: "03",
                title: "AI Sells for You",
                desc: "Turn it on and watch the AI handle customers, book meetings, and close deals.",
              },
            ].map((step) => (
              <div key={step.n} className="text-center group">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-surface-container-low flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:bg-primary-container transition-colors">
                  <span className="text-2xl sm:text-display-lg text-primary font-bold">
                    {step.n}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg md:text-headline-sm mb-1.5 sm:mb-2 font-semibold">
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base text-secondary px-2 sm:px-0">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-10 sm:py-14 md:py-section-padding-md px-4 sm:px-6 lg:px-8 bg-surface-container-lowest">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-headline-md text-on-background mb-2 sm:mb-4 font-semibold">
              Simple, Transparent Pricing
            </h2>
            <p className="text-sm sm:text-base text-secondary">
              Scale from your first 100 leads to enterprise volume.
            </p>
          </div>
          <PricingPlansGrid compact />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-10 sm:py-14 md:py-section-padding-lg px-4 sm:px-6 lg:px-8">
        <div className="max-w-[800px] mx-auto text-center">
          <h2 className="text-xl sm:text-2xl md:text-display-lg mb-4 sm:mb-6 font-bold leading-tight px-2">
            Start Automating Your WhatsApp Today
          </h2>
          <p className="text-secondary text-sm sm:text-base md:text-body-lg mb-6 sm:mb-10 px-2">
            Join over 2,000 businesses who have regained their time and increased sales with
            our AI Assistant.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
            <DemoPageLink className="bg-primary text-on-primary px-6 py-3 sm:px-10 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg hover:shadow-xl transition-all active:scale-95 text-center">
              Get Free Demo
            </DemoPageLink>
            <ExpertWhatsappLink className="bg-white border border-gray-200 px-6 py-3 sm:px-10 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg hover:bg-gray-50 transition-all text-center">
              Talk to an Expert
            </ExpertWhatsappLink>
          </div>
          <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-secondary">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </section>
    </div>
  );
}
