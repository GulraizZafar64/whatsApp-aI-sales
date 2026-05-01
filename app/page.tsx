import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      {/* Hero Section */}
      <section className="pt-32 pb-section-padding-lg px-8">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-gutter items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center px-3 py-1 bg-primary-container/20 text-on-primary-container rounded-full text-label-sm border border-primary-container/30">
              <span className="material-symbols-outlined text-[16px] mr-2">bolt</span>
              New: Multi-language Support v2.0
            </div>
            <h1 className="font-display-xl text-display-xl text-on-background">
              Turn Your WhatsApp Into a <span className="text-primary">24/7 Sales Assistant</span>
            </h1>
            <p className="text-body-lg text-secondary max-w-lg">
              Automatically engage, nurture, and close deals through WhatsApp. Our AI understands customer intent
              and handles inquiries while you sleep.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/get-started">
                <button className="bg-primary text-on-primary px-8 py-4 rounded-xl font-semibold text-body-md hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95">
                  Get Started Free
                </button>
              </Link>
              <Link href="/demo">
                <button className="bg-surface-container-lowest border border-outline-variant text-on-surface px-8 py-4 rounded-xl font-semibold text-body-md hover:bg-surface-container-low transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined">play_circle</span>
                  View Demo
                </button>
              </Link>
            </div>
            <div className="flex items-center gap-4 pt-4 text-label-md text-secondary">
              <div className="flex -space-x-2">
                <img
                  alt="User"
                  className="w-8 h-8 rounded-full border-2 border-white"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAr85nlk7UsjKUUho32MwxxJNpxl-B9K9MfFFb0Bcau0_3nvEJcGf-EQu_0uBNymCIu6EBeYbNXE7EY7zfOvjwqpvcZr2ueu2vOUFY5_not2XYGqM7Bi_czxwWZ5c6Um-BAu9LXO5JeyM1jgydRX6SyeOzxp655fBomY35apAz_dLt4vk92J44UipTkGreF6BLb_XX_-AIbF4hNp-8wWGqnGJ2FjiH4syH-7vC_OsEARK3bkXJoB6vxUT9z0JCR9CPpp7IZ-sPjC-3J"
                />
                <img
                  alt="User"
                  className="w-8 h-8 rounded-full border-2 border-white"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKWFjSvYNFjOspqhSBosa_A9ugiHZwAXRhsti9kFSgSwRzw_dzWl2T8co1H64e-WG2efqMuBFzKMqAsIFyghnY0BI7dLdng90yuGfWkBylfkHnN1H6KJ9Znf_55bTYKt2zHt1dinaKvwcG_r9mIL4yJZn0Ila1Lf-ZVgVoOzSNQg7To4w5H9eJ9ZXr4SNJ28W03koXnJ7VizEjuL1EixZIDeSGnWimNB-BRGfdIj8Ejt98AuLWJq2bnJUjrVsnDwjberGq9gwSOIR8"
                />
                <img
                  alt="User"
                  className="w-8 h-8 rounded-full border-2 border-white"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTHh2C6cQacON0bbRww6329_hP3rFr9shLVqrv2nHkpCCkEVawuhygvijsdVuhyLkUBiSMAFszCCqdoPQEOSR0rKwdceyqUNr9aIn1WMZH4SqCiAJSGNIUYK1yZ8nCo1d6T5IgHdS3jO4p54kY-dB_NWVfHeTlYufOalOqW7UBNvSmO-Gydn8FOLthlbWRjyNiOzlKXKfz_opNC5bgVOw92V3YLW8WUNpptAv_kXNxR4A3ICnmhThEZjaJYiqBGZpN1tW8k1VK09MG"
                />
              </div>
              <span>Trusted by 2,000+ sales teams</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full"></div>
            <div className="relative bg-white border border-gray-100 rounded-[32px] shadow-2xl overflow-hidden max-w-[400px] mx-auto">
              {/* WhatsApp Header */}
              <div className="bg-[#075e54] text-white p-4 flex items-center gap-3">
                <span className="material-symbols-outlined">arrow_back</span>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined">smart_toy</span>
                </div>
                <div>
                  <div className="font-bold text-sm">AI Assistant (You)</div>
                  <div className="text-[10px] opacity-80">Online</div>
                </div>
              </div>
              {/* WhatsApp Body */}
              <div className="h-[450px] bg-[#e5ddd5] p-4 flex flex-col gap-4 overflow-y-auto">
                <div className="whatsapp-bubble-user self-end bg-[#dcf8c6] p-3 text-xs shadow-sm max-w-[80%] text-on-surface">
                  Hi! Do you have the summer collection in stock?
                  <div className="text-[9px] text-right mt-1 opacity-50">14:02</div>
                </div>
                <div className="whatsapp-bubble-ai self-start bg-white p-3 text-xs shadow-sm max-w-[80%] text-on-surface">
                  Yes! We just restocked 12 new items. Would you like to see our digital catalog or check
                  availability for a specific size?
                  <div className="text-[9px] text-right mt-1 opacity-50">14:02</div>
                </div>
                <div className="whatsapp-bubble-user self-end bg-[#dcf8c6] p-3 text-xs shadow-sm max-w-[80%] text-on-surface">
                  I need a Medium in the Floral Dress.
                  <div className="text-[9px] text-right mt-1 opacity-50">14:03</div>
                </div>
                <div className="whatsapp-bubble-ai self-start bg-white p-3 text-xs shadow-sm max-w-[80%] text-on-surface">
                  Checking... ✅ Floral Dress in Medium is available! Price is $89. Shall I create a checkout
                  link for you?
                  <div className="text-[9px] text-right mt-1 opacity-50">14:03</div>
                </div>
              </div>
              {/* WhatsApp Input */}
              <div className="bg-gray-50 p-3 flex items-center gap-2 border-t border-gray-200">
                <span className="material-symbols-outlined text-gray-400">add</span>
                <div className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-xs text-gray-400">
                  Type a message...
                </div>
                <span className="material-symbols-outlined text-gray-400">mic</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-section-padding-md bg-white">
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-headline-md text-on-background mb-4">
              You&apos;re Losing Customers Every Day
            </h2>
            <p className="text-secondary max-w-2xl mx-auto">
              Manual handling of WhatsApp leads is slow, inconsistent, and expensive. Here&apos;s what&apos;s costing
              you money right now.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-surface-container-lowest border border-surface-container-high hover:border-primary/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center mb-6">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <h3 className="text-headline-sm mb-3">Slow Replies</h3>
              <p className="text-secondary">
                Lead conversion drops 80% if you don&apos;t respond within the first 5 minutes. Most teams take hours.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-surface-container-lowest border border-surface-container-high hover:border-primary/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center mb-6">
                <span className="material-symbols-outlined">mail_lock</span>
              </div>
              <h3 className="text-headline-sm mb-3">Missed Messages</h3>
              <p className="text-secondary">
                High volume leads to forgotten conversations and ghosted customers. Every ghost is a lost sale.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-surface-container-lowest border border-surface-container-high hover:border-primary/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center mb-6">
                <span className="material-symbols-outlined">trending_down</span>
              </div>
              <h3 className="text-headline-sm mb-3">Lost Sales</h3>
              <p className="text-secondary">
                When customers can&apos;t buy instantly, they find a competitor who responds faster. Automation is the
                only way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-section-padding-lg px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-on-background rounded-[40px] p-8 md:p-16 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/10 blur-[100px]"></div>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-display-lg mb-6">We Fix That Automatically</h2>
                <p className="text-surface-variant text-body-lg mb-10">
                  Stop treating WhatsApp like a chat app and start treating it like a high-conversion sales channel. Our
                  AI bridges the gap between interest and purchase.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary-container">check_circle</span>
                    <span>Zero latency responses 24/7</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary-container">check_circle</span>
                    <span>Human-like contextual understanding</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary-container">check_circle</span>
                    <span>Seamless handover to sales reps</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-6">
                {/* Manual Reply Mockup */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/40">Manual Response</span>
                    <span className="text-xs bg-error/20 text-error px-2 py-0.5 rounded">Missed Sale</span>
                  </div>
                  <div className="bg-white/10 h-8 w-3/4 rounded-md mb-2"></div>
                  <div className="flex items-center gap-2 mt-4 text-xs text-white/60">
                    <span className="material-symbols-outlined text-[14px]">history</span>
                    Wait time: 4 hours 12 minutes
                  </div>
                </div>
                {/* AI Reply Mockup */}
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                      AI Powered Assistant
                    </span>
                    <span className="text-xs bg-primary-container text-on-primary-container px-2 py-0.5 rounded">
                      Conversion!
                    </span>
                  </div>
                  <div className="bg-primary/20 h-8 w-5/6 rounded-md mb-2"></div>
                  <div className="bg-primary/20 h-8 w-1/2 rounded-md mb-2"></div>
                  <div className="flex items-center gap-2 mt-4 text-xs text-primary/80">
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
      <section className="py-section-padding-md px-8 bg-surface-container-low">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-headline-md text-on-background mb-4">Built for High-Velocity Sales</h2>
            <p className="text-secondary max-w-2xl mx-auto">
              Powerful features designed to mimic your best salesperson, available every second of the day.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            <div className="bg-white p-8 rounded-2xl border border-surface-container-high shadow-sm hover:shadow-md transition-all">
              <span className="material-symbols-outlined text-primary text-[32px] mb-4">auto_awesome</span>
              <h4 className="text-headline-sm mb-3 text-lg">Instant Auto Replies</h4>
              <p className="text-secondary text-sm">
                Every message is answered instantly with personalized information based on your business data.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-surface-container-high shadow-sm hover:shadow-md transition-all">
              <span className="material-symbols-outlined text-primary text-[32px] mb-4">psychology</span>
              <h4 className="text-headline-sm mb-3 text-lg">AI Understanding</h4>
              <p className="text-secondary text-sm">
                Not just keywords. Our AI understands typos, slang, and complex questions about your services.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-surface-container-high shadow-sm hover:shadow-md transition-all">
              <span className="material-symbols-outlined text-primary text-[32px] mb-4">inventory_2</span>
              <h4 className="text-headline-sm mb-3 text-lg">Product Responses</h4>
              <p className="text-secondary text-sm">
                Upload your CSV or link your Shopify to let the AI pitch products and check stock levels.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-surface-container-high shadow-sm hover:shadow-md transition-all">
              <span className="material-symbols-outlined text-primary text-[32px] mb-4">shopping_cart_checkout</span>
              <h4 className="text-headline-sm mb-3 text-lg">Order Handling</h4>
              <p className="text-secondary text-sm">
                Collect shipping details and generate payment links directly within the WhatsApp interface.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-surface-container-high shadow-sm hover:shadow-md transition-all">
              <span className="material-symbols-outlined text-primary text-[32px] mb-4">update</span>
              <h4 className="text-headline-sm mb-3 text-lg">24/7 Uptime</h4>
              <p className="text-secondary text-sm">
                Sales don&apos;t stop at 5 PM. Capture late-night leads while your human team is resting.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl border border-surface-container-high shadow-sm hover:shadow-md transition-all">
              <span className="material-symbols-outlined text-primary text-[32px] mb-4">query_stats</span>
              <h4 className="text-headline-sm mb-3 text-lg">Detailed Analytics</h4>
              <p className="text-secondary text-sm">
                Track conversion rates, most asked questions, and ROI through a clean dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-section-padding-lg px-8 bg-white">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-headline-md text-center mb-16">Get Started in 3 Simple Steps</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-container transition-colors">
                <span className="text-display-lg text-primary">01</span>
              </div>
              <h3 className="text-headline-sm mb-2">Connect WhatsApp</h3>
              <p className="text-secondary">Scan a simple QR code to link your business number to our secure AI cloud.</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-container transition-colors">
                <span className="text-display-lg text-primary">02</span>
              </div>
              <h3 className="text-headline-sm mb-2">Add Products</h3>
              <p className="text-secondary">
                Import your catalog or type in your services so the AI knows exactly what you sell.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-container transition-colors">
                <span className="text-display-lg text-primary">03</span>
              </div>
              <h3 className="text-headline-sm mb-2">AI Sells for You</h3>
              <p className="text-secondary">Turn it on and watch the AI handle customers, book meetings, and close deals.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-section-padding-md px-8 bg-surface-container-lowest">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-headline-md text-on-background mb-4">Simple, Transparent Pricing</h2>
            <p className="text-secondary">Scale from your first 100 leads to enterprise volume.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-gutter">
            {/* Starter */}
            <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm flex flex-col">
              <div className="mb-8">
                <div className="text-label-md text-primary font-bold uppercase tracking-wider mb-2">Starter</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-secondary text-sm">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-secondary">
                  <span className="material-symbols-outlined text-primary text-sm">check</span>
                  Up to 500 AI responses
                </li>
                <li className="flex items-center gap-2 text-sm text-secondary">
                  <span className="material-symbols-outlined text-primary text-sm">check</span>
                  Basic product catalog
                </li>
                <li className="flex items-center gap-2 text-sm text-secondary">
                  <span className="material-symbols-outlined text-primary text-sm">check</span>
                  Email support
                </li>
              </ul>
              <button className="w-full py-3 px-4 rounded-xl border border-outline-variant font-semibold text-on-surface hover:bg-surface-container-low transition-all">
                Start 7-Day Trial
              </button>
            </div>
            {/* Pro */}
            <div className="p-8 rounded-3xl bg-on-background text-white shadow-xl flex flex-col relative transform scale-105 z-10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                Most Popular
              </div>
              <div className="mb-8">
                <div className="text-label-md text-primary-container font-bold uppercase tracking-wider mb-2">
                  Professional
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$79</span>
                  <span className="text-white/60 text-sm">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-white/80">
                  <span className="material-symbols-outlined text-primary-container text-sm">check</span>
                  Unlimited AI responses
                </li>
                <li className="flex items-center gap-2 text-sm text-white/80">
                  <span className="material-symbols-outlined text-primary-container text-sm">check</span>
                  Advanced CRM integration
                </li>
                <li className="flex items-center gap-2 text-sm text-white/80">
                  <span className="material-symbols-outlined text-primary-container text-sm">check</span>
                  Multi-language support
                </li>
                <li className="flex items-center gap-2 text-sm text-white/80">
                  <span className="material-symbols-outlined text-primary-container text-sm">check</span>
                  Priority chat support
                </li>
              </ul>
              <button className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-on-primary-container font-semibold text-white transition-all">
                Get Started Now
              </button>
            </div>
            {/* Business */}
            <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm flex flex-col">
              <div className="mb-8">
                <div className="text-label-md text-primary font-bold uppercase tracking-wider mb-2">Enterprise</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$199</span>
                  <span className="text-secondary text-sm">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-secondary">
                  <span className="material-symbols-outlined text-primary text-sm">check</span>
                  Custom AI training
                </li>
                <li className="flex items-center gap-2 text-sm text-secondary">
                  <span className="material-symbols-outlined text-primary text-sm">check</span>
                  Dedicated account manager
                </li>
                <li className="flex items-center gap-2 text-sm text-secondary">
                  <span className="material-symbols-outlined text-primary text-sm">check</span>
                  Full API access
                </li>
              </ul>
              <button className="w-full py-3 px-4 rounded-xl border border-outline-variant font-semibold text-on-surface hover:bg-surface-container-low transition-all">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-section-padding-lg px-8">
        <div className="max-w-[800px] mx-auto text-center">
          <h2 className="text-display-lg mb-6">Start Automating Your WhatsApp Today</h2>
          <p className="text-secondary text-body-lg mb-10">
            Join over 2,000 businesses who have regained their time and increased sales with our AI Assistant.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-primary text-on-primary px-10 py-5 rounded-2xl font-bold text-lg hover:shadow-xl transition-all active:scale-95">
              Get Free Demo
            </button>
            <button className="bg-white border border-gray-200 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all">
              Talk to an Expert
            </button>
          </div>
          <p className="mt-6 text-sm text-secondary">No credit card required. Cancel anytime.</p>
        </div>
      </section>
    </div>
  );
}
