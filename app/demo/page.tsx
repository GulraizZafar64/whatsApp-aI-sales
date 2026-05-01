export default function DemoPage() {
  return (
    <main className="pt-16">
      {/* Hero Section */}
      <section className="py-section-padding-md md:py-section-padding-lg px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <span className="inline-block px-3 py-1 mb-6 text-sm font-semibold text-primary bg-primary-container/20 rounded-full">Live Interactive Showcase</span>
          <h1 className="text-display-xl mb-6 text-on-surface">See It In Action</h1>
          <p className="text-headline-sm text-secondary mb-4">Watch how AI handles your customer conversations automatically</p>
          <p className="text-body-lg text-secondary/80 mb-10">This is exactly how your WhatsApp will respond to customers in real-time.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="px-8 py-4 bg-primary text-on-primary font-semibold rounded-xl shadow-lg hover:opacity-90 transition-all active:scale-95">Try Demo</button>
            <button className="px-8 py-4 bg-white border border-outline-variant text-on-surface font-semibold rounded-xl hover:bg-gray-50 transition-all active:scale-95">Start Free Demo</button>
          </div>
        </div>
      </section>

      {/* Interactive Chat Demo Section */}
      <section className="py-section-padding-md bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter bg-surface-container-lowest rounded-3xl border border-outline-variant overflow-hidden shadow-sm">
            {/* Sidebar Controls */}
            <div className="lg:col-span-4 border-r border-outline-variant bg-surface-container-low p-6">
              <h3 className="text-headline-sm mb-6 text-on-surface">Industry Scenarios</h3>
              <div className="space-y-3">
                <button className="w-full text-left p-4 rounded-xl bg-primary-container text-on-primary-container shadow-sm flex items-center gap-4 transition-all">
                  <span className="material-symbols-outlined">shopping_bag</span>
                  <div>
                    <p className="font-semibold text-sm">Shoe Store</p>
                    <p className="text-xs opacity-80">Retail &amp; Inventory</p>
                  </div>
                </button>
                <button className="w-full text-left p-4 rounded-xl hover:bg-white transition-all flex items-center gap-4 text-on-surface-variant">
                  <span className="material-symbols-outlined">checkroom</span>
                  <div>
                    <p className="font-semibold text-sm">Clothing Store</p>
                    <p className="text-xs text-secondary">Apparel Sales</p>
                  </div>
                </button>
                <button className="w-full text-left p-4 rounded-xl hover:bg-white transition-all flex items-center gap-4 text-on-surface-variant">
                  <span className="material-symbols-outlined">restaurant</span>
                  <div>
                    <p className="font-semibold text-sm">Restaurant</p>
                    <p className="text-xs text-secondary">Orders &amp; Reservations</p>
                  </div>
                </button>
              </div>
              <div className="mt-12 p-6 bg-surface-bright rounded-2xl border border-outline-variant">
                <p className="text-sm font-semibold mb-2">Live AI Intelligence</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-secondary">Intent Match</span>
                    <span className="font-bold text-primary">98%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary w-[98%] h-full"></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    AI processing active...
                  </div>
                </div>
              </div>
            </div>
            {/* Chat UI Container */}
            <div className="lg:col-span-8 flex flex-col h-[600px] bg-[#f0f2f5] relative">
              {/* Chat Header */}
              <div className="px-6 py-4 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden border border-white">
                    <img
                      alt="Customer Profile"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkoWzUzARhQQV54sYcJY_d7PlDijI_HGvt6Rnvog81WosnQi6ryrwNxxzObuF4XaVA6QqsN9o_bmO0KiaxRxg5jYZMLFfKSlqLQPful7_UW6zxfekQB1c9o_vjUuzScKoL9HYxy-yXMaU4Hh3x77i8xRnJMnjpeoKvylqwa--W5qkAcigxmvcTvVgJIMbu0HXhfg-7_RHsRZGme7rNDTpPvJhXAqtxaa3tWymDrmnpJYpyJU4A183yf6mNAmxMBs_8_qMNSSBmiMug"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Customer (Prospective Lead)</p>
                    <p className="text-xs text-primary flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary"></span> Online
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 text-gray-500">
                  <span className="material-symbols-outlined">videocam</span>
                  <span className="material-symbols-outlined">call</span>
                  <span className="material-symbols-outlined">more_vert</span>
                </div>
              </div>
              {/* Chat Canvas */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
                {/* Scenario 1 */}
                <div className="self-start max-w-[70%] bg-white p-4 shadow-sm rounded-tr-xl rounded-br-xl rounded-bl-xl relative">
                  <p className="text-sm">Do you have black shoes?</p>
                  <span className="text-[10px] text-gray-400 absolute right-2 bottom-1">10:42 AM</span>
                </div>
                <div className="self-end max-w-[70%] bg-[#dcf8c6] p-4 shadow-sm rounded-tl-xl rounded-br-xl rounded-bl-xl relative">
                  <p className="text-sm">Yes 👍 Black Running Shoes are available for $50. Would you like to order?</p>
                  <span className="text-[10px] text-gray-400 absolute right-2 bottom-1">10:42 AM</span>
                </div>
                {/* Scenario 2 */}
                <div className="self-start max-w-[70%] bg-white p-4 shadow-sm rounded-tr-xl rounded-br-xl rounded-bl-xl relative">
                  <p className="text-sm">How much is it?</p>
                  <span className="text-[10px] text-gray-400 absolute right-2 bottom-1">10:43 AM</span>
                </div>
                <div className="self-end max-w-[70%] bg-[#dcf8c6] p-4 shadow-sm rounded-tl-xl rounded-br-xl rounded-bl-xl relative">
                  <p className="text-sm">It’s $50 👍 Would you like to place an order?</p>
                  <span className="text-[10px] text-gray-400 absolute right-2 bottom-1">10:43 AM</span>
                </div>
                {/* Scenario 3 */}
                <div className="self-start max-w-[70%] bg-white p-4 shadow-sm rounded-tr-xl rounded-br-xl rounded-bl-xl relative">
                  <p className="text-sm">I want to order</p>
                  <span className="text-[10px] text-gray-400 absolute right-2 bottom-1">10:45 AM</span>
                </div>
                <div className="self-end max-w-[70%] bg-[#dcf8c6] p-4 shadow-sm rounded-tl-xl rounded-br-xl rounded-bl-xl relative">
                  <p className="text-sm text-on-surface">Great 👍 Please share your name and delivery address.</p>
                  <span className="text-[10px] text-gray-400 absolute right-2 bottom-1">10:45 AM</span>
                </div>
                {/* Typing Indicator Simulation */}
                <div className="flex items-center gap-2 self-end">
                  <div className="bg-gray-200 px-3 py-2 rounded-full flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                  </div>
                  <span className="text-xs text-gray-500 italic">AI is typing...</span>
                </div>
              </div>
              {/* Chat Input */}
              <div className="p-4 bg-[#f0f2f5] flex items-center gap-4">
                <span className="material-symbols-outlined text-gray-500">mood</span>
                <span className="material-symbols-outlined text-gray-500">attach_file</span>
                <div className="flex-1 bg-white rounded-xl px-4 py-3 text-sm text-gray-400 border-none shadow-sm">Type a message</div>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    mic
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Before vs After Section */}
      <section className="py-section-padding-lg px-6 bg-surface-bright">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-display-lg mb-4">Why Businesses Switch</h2>
            <p className="text-secondary text-body-lg">Transform your customer experience from chaotic to controlled.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-gutter">
            {/* Left: Without AI */}
            <div className="bg-white p-10 rounded-3xl border-t-4 border-error shadow-sm">
              <div className="w-12 h-12 bg-error-container rounded-full flex items-center justify-center mb-8">
                <span className="material-symbols-outlined text-error">close</span>
              </div>
              <h3 className="text-headline-md mb-8 text-on-surface">Without AI Assistant</h3>
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-error mt-1">timer_off</span>
                  <div>
                    <p className="font-semibold">Slow replies</p>
                    <p className="text-sm text-secondary">Customers wait for hours, leading to frustration and attrition.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-error mt-1">mail_lock</span>
                  <div>
                    <p className="font-semibold">Missed messages</p>
                    <p className="text-sm text-secondary">Human error causes inquiries to get lost in the noise.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-error mt-1">trending_down</span>
                  <div>
                    <p className="font-semibold">Lost sales</p>
                    <p className="text-sm text-secondary">Competitors respond faster and close the deals you missed.</p>
                  </div>
                </li>
              </ul>
            </div>
            {/* Right: With AI */}
            <div className="bg-white p-10 rounded-3xl border-t-4 border-primary shadow-sm">
              <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center mb-8">
                <span className="material-symbols-outlined text-on-primary-container">check</span>
              </div>
              <h3 className="text-headline-md mb-8 text-on-surface">With AI Assistant</h3>
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary mt-1">bolt</span>
                  <div>
                    <p className="font-semibold">Instant replies</p>
                    <p className="text-sm text-secondary">Zero-second response time keeps customers engaged immediately.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary mt-1">history_toggle_off</span>
                  <div>
                    <p className="font-semibold">24/7 availability</p>
                    <p className="text-sm text-secondary">Scale your business while you sleep with automated handling.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary mt-1">payments</span>
                  <div>
                    <p className="font-semibold">More conversions</p>
                    <p className="text-sm text-secondary">Intelligent guidance through the funnel leads to higher sales.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits Section (Bento Grid Style) */}
      <section className="py-section-padding-lg px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
            <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-outline-variant hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary">forward_to_inbox</span>
              </div>
              <h4 className="text-headline-sm mb-2">Replies instantly</h4>
              <p className="text-secondary text-sm">Every single inquiry is met with a professional, helpful response within milliseconds, regardless of volume.</p>
            </div>
            <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-outline-variant hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary">psychology</span>
              </div>
              <h4 className="text-headline-sm mb-2">Understands customer intent</h4>
              <p className="text-secondary text-sm">Advanced NLP identifies whether a user wants to buy, browse, or complain, and reacts accordingly.</p>
            </div>
            <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-outline-variant hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary">navigation</span>
              </div>
              <h4 className="text-headline-sm mb-2">Guides users to place orders</h4>
              <p className="text-secondary text-sm">The AI doesn&apos;t just chat—it sells. It proactively asks for delivery details and closes the deal.</p>
            </div>
            <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-outline-variant hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary">schedule</span>
              </div>
              <h4 className="text-headline-sm mb-2">Saves hours of manual work</h4>
              <p className="text-secondary text-sm">Free your team from repetitive tasks so they can focus on high-value strategy and growth.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-section-padding-lg px-6">
        <div className="max-w-[1200px] mx-auto bg-primary rounded-[40px] p-12 md:p-24 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
          <h2 className="text-display-lg mb-6 relative z-10">Ready to automate your WhatsApp?</h2>
          <p className="text-headline-sm opacity-90 mb-12 relative z-10">Start getting more customers today with the world&apos;s most intelligent assistant.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
            <button className="px-10 py-5 bg-white text-primary font-bold rounded-2xl shadow-xl hover:bg-gray-100 transition-all active:scale-95">Get Started</button>
            <button className="px-10 py-5 bg-white/10 text-white font-bold rounded-2xl border border-white/20 hover:bg-white/20 transition-all active:scale-95">Request Live Demo</button>
          </div>
        </div>
      </section>
    </main>
  );
}
