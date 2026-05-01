export default function HowItWorksPage() {
  return (
    <main className="pt-24">
      {/* Hero Section */}
      <section className="max-w-[1200px] mx-auto px-gutter py-section-padding-md text-center">
        <span className="inline-block px-4 py-1 rounded-full bg-primary-container/10 text-on-primary-container text-label-sm mb-6">Simple Integration</span>
        <h1 className="text-display-xl text-on-surface mb-6">How It Works</h1>
        <p className="text-headline-sm text-on-surface-variant max-w-2xl mx-auto mb-4">Start automating your WhatsApp in minutes</p>
        <p className="text-body-lg text-outline max-w-xl mx-auto">No technical skills required. Set up once and let AI handle your customer conversations while you focus on growth.</p>
      </section>

      {/* Step-by-Step Process (Bento Grid Style) */}
      <section className="max-w-[1200px] mx-auto px-gutter py-section-padding-md">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Step 1 */}
          <div className="md:col-span-7 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-10 shadow-sm flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 order-2 md:order-1">
              <span className="text-primary/20 text-display-lg block mb-2">01</span>
              <h3 className="text-headline-md mb-4">Connect Your WhatsApp</h3>
              <p className="text-body-md text-on-surface-variant">Link your WhatsApp Business account securely in a few clicks. Simply scan a QR code just like WhatsApp Web.</p>
            </div>
            <div className="w-full md:w-64 bg-surface-container rounded-lg p-6 flex flex-col items-center order-1 md:order-2 border border-outline-variant/20">
              <div className="w-40 h-40 bg-white p-2 rounded shadow-inner mb-4 relative">
                <img
                  alt="QR Code"
                  className="w-full h-full opacity-80"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzYoT9B8bAGsirfSckQlvY28_JRMPC-ARMjxBNTJL1uccKOkYBH5o2NTDvZmKrBe-dHbuWNsG5_z_lJzECoUhLJU4HRybThDHrRQAbSnzfEIDxYowaXh6WfMJAH7IJHCuRFKKIx2LZr7VXn-vUyv0CLEjah7Cz9y9odBn_D8RTZmOOU8dHws_KlVaNDcaHZwTZQsayB0aVj6S_HTkdPeYld3pHxNjvjpkRf4hJvrXHX1marWFh4aEGx0dRGrM2djfJcNPh6FtH3BSa"
                />
                <div className="absolute inset-0 border-2 border-primary/20 animate-pulse rounded"></div>
              </div>
              <span className="text-label-sm text-outline">Scan to link account</span>
            </div>
          </div>
          {/* Step 2 */}
          <div className="md:col-span-5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-10 shadow-sm">
            <span className="text-primary/20 text-display-lg block mb-2">02</span>
            <h3 className="text-headline-md mb-4">Add Your Products</h3>
            <p className="text-body-md text-on-surface-variant mb-8">Upload products, prices, and FAQs so the AI knows your business inside out.</p>
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-lg border border-outline-variant/20 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">inventory_2</span>
                <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-primary"></div>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-outline-variant/20 flex items-center gap-3 opacity-60">
                <span className="material-symbols-outlined text-primary">payments</span>
                <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                  <div className="w-1/2 h-full bg-primary"></div>
                </div>
              </div>
            </div>
          </div>
          {/* Step 3 */}
          <div className="md:col-span-5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-10 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-primary/20 text-display-lg block mb-2">03</span>
              <h3 className="text-headline-md mb-4">AI Understands Intent</h3>
              <p className="text-body-md text-on-surface-variant">Our AI reads and understands what your customers are asking in real time, no matter the phrasing.</p>
            </div>
            <div className="mt-8 flex flex-col gap-2">
              <div className="bg-surface-container p-3 rounded-xl whatsapp-bubble-user self-end max-w-[80%] text-label-md">&quot;Do you have this in blue?&quot;</div>
              <div className="flex gap-2 items-center">
                <span className="material-symbols-outlined text-primary animate-bounce">psychology</span>
                <span className="text-label-sm text-outline italic">Analyzing intent...</span>
              </div>
            </div>
          </div>
          {/* Step 4 & 5 Combined Feature */}
          <div className="md:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-10 shadow-sm">
              <span className="text-primary/20 text-display-lg block mb-2">04</span>
              <h3 className="text-headline-md mb-4">Instant Smart Replies</h3>
              <p className="text-body-md text-on-surface-variant">The AI replies instantly with accurate answers and guides customers to place orders.</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-10 shadow-sm">
              <span className="text-primary/20 text-display-lg block mb-2">05</span>
              <h3 className="text-headline-md mb-4">Capture Orders</h3>
              <p className="text-body-md text-on-surface-variant">Automatically collect customer details and manage orders without manual effort.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Example Conversation (Specialized Component) */}
      <section className="bg-surface-container-low py-section-padding-lg">
        <div className="max-w-[1200px] mx-auto px-gutter grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-display-lg mb-6">See It In Action</h2>
            <p className="text-body-lg text-on-surface-variant mb-10">Experience the seamless flow of an AI-driven sales conversation. It&apos;s like having your best salesperson working 24/7.</p>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
                  <span className="material-symbols-outlined">bolt</span>
                </div>
                <div>
                  <h4 className="text-headline-sm mb-1">24/7 Response</h4>
                  <p className="text-on-surface-variant">Never let a lead go cold, even while you sleep.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
                  <span className="material-symbols-outlined">trending_up</span>
                </div>
                <div>
                  <h4 className="text-headline-sm mb-1">Higher Conversion</h4>
                  <p className="text-on-surface-variant">Prompt replies lead to faster purchase decisions.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-outline-variant/20">
            {/* WhatsApp Header */}
            <div className="bg-[#075E54] p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div>
                  <p className="font-semibold text-label-md">Customer Support</p>
                  <p className="text-[10px] opacity-80">Online</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="material-symbols-outlined">videocam</span>
                <span className="material-symbols-outlined">call</span>
              </div>
            </div>
            {/* Chat Area */}
            <div className="p-6 space-y-4 bg-[#E5DDD5] h-[400px] flex flex-col">
              <div className="bg-white p-3 whatsapp-bubble-user self-start max-w-[85%] text-body-md shadow-sm">
                Do you have black shoes?
                <span className="block text-[10px] text-outline text-right mt-1">10:42 AM</span>
              </div>
              <div className="bg-[#DCF8C6] p-3 whatsapp-bubble-ai self-end max-w-[85%] text-body-md shadow-sm">
                Yes 👍 Black Running Shoes are available for $50. Want to order?
                <span className="block text-[10px] text-outline text-right mt-1">10:42 AM</span>
              </div>
              <div className="bg-white p-3 whatsapp-bubble-user self-start max-w-[85%] text-body-md shadow-sm">
                Yes, I want them.
                <span className="block text-[10px] text-outline text-right mt-1">10:43 AM</span>
              </div>
              <div className="bg-[#DCF8C6] p-3 whatsapp-bubble-ai self-end max-w-[85%] text-body-md shadow-sm">
                Great! Please provide your delivery address and name to complete the order.
                <span className="block text-[10px] text-outline text-right mt-1">10:43 AM</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="max-w-[1200px] mx-auto px-gutter py-section-padding-md text-center">
        <h2 className="text-label-sm font-medium text-outline uppercase tracking-widest mb-10">Built for real businesses</h2>
        <div className="flex flex-wrap justify-center items-center gap-12 opacity-40 grayscale">
          <div className="flex items-center gap-2 font-bold text-headline-sm">
            <span className="material-symbols-outlined">shopping_bag</span> RETAILPRO
          </div>
          <div className="flex items-center gap-2 font-bold text-headline-sm">
            <span className="material-symbols-outlined">restaurant</span> EATWELL
          </div>
          <div className="flex items-center gap-2 font-bold text-headline-sm">
            <span className="material-symbols-outlined">fitness_center</span> GYMHUB
          </div>
          <div className="flex items-center gap-2 font-bold text-headline-sm">
            <span className="material-symbols-outlined">local_shipping</span> LOGISTIX
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-[1200px] mx-auto px-gutter mb-section-padding-lg">
        <div className="bg-primary p-12 md:p-20 rounded-[2rem] text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary-container/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-primary-fixed-dim/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <h2 className="text-display-lg mb-4">Start Automating Your WhatsApp Today</h2>
            <p className="text-body-lg mb-10 text-white/80">Set up in minutes and never miss a sale again</p>
            <button className="bg-white text-primary px-10 py-4 rounded-xl font-bold text-body-lg hover:shadow-xl transition-all active:scale-95 duration-200">Get Started</button>
            <p className="mt-6 text-label-sm text-white/60">No credit card required • 14-day free trial</p>
          </div>
        </div>
      </section>
    </main>
  );
}
