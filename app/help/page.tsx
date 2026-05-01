export default function HelpPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-display-lg text-on-background mb-4">How can we help you?</h1>
          <p className="text-body-lg text-secondary mb-10">Find answers or contact our support team</p>
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-outline">search</span>
            </div>
            <input
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-container focus:border-primary outline-none transition-all shadow-sm text-body-md"
              placeholder="Search for help (e.g. connect WhatsApp, add products)"
              type="text"
            />
          </div>
        </div>
      </section>

      {/* Quick Help Categories */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {/* Card 1 */}
          <div className="bg-white border border-gray-100 p-8 rounded-xl shadow-sm hover:border-primary-container/30 transition-all group">
            <div className="w-12 h-12 bg-primary-container/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container transition-colors">
              <span className="material-symbols-outlined text-primary group-hover:text-white">rocket_launch</span>
            </div>
            <h3 className="text-headline-sm text-on-surface mb-2">Getting Started</h3>
            <p className="text-body-md text-secondary">How to set up your WhatsApp AI assistant</p>
          </div>
          {/* Card 2 */}
          <div className="bg-white border border-gray-100 p-8 rounded-xl shadow-sm hover:border-primary-container/30 transition-all group">
            <div className="w-12 h-12 bg-primary-container/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container transition-colors">
              <span className="material-symbols-outlined text-primary group-hover:text-white">phone_iphone</span>
            </div>
            <h3 className="text-headline-sm text-on-surface mb-2">WhatsApp Connection</h3>
            <p className="text-body-md text-secondary">Connect your WhatsApp Business account</p>
          </div>
          {/* Card 3 */}
          <div className="bg-white border border-gray-100 p-8 rounded-xl shadow-sm hover:border-primary-container/30 transition-all group">
            <div className="w-12 h-12 bg-primary-container/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container transition-colors">
              <span className="material-symbols-outlined text-primary group-hover:text-white">psychology</span>
            </div>
            <h3 className="text-headline-sm text-on-surface mb-2">AI Setup</h3>
            <p className="text-body-md text-secondary">How AI replies to customer messages</p>
          </div>
          {/* Card 4 */}
          <div className="bg-white border border-gray-100 p-8 rounded-xl shadow-sm hover:border-primary-container/30 transition-all group">
            <div className="w-12 h-12 bg-primary-container/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container transition-colors">
              <span className="material-symbols-outlined text-primary group-hover:text-white">shopping_bag</span>
            </div>
            <h3 className="text-headline-sm text-on-surface mb-2">Products &amp; Orders</h3>
            <p className="text-body-md text-secondary">Add products and manage orders</p>
          </div>
          {/* Card 5 */}
          <div className="bg-white border border-gray-100 p-8 rounded-xl shadow-sm hover:border-primary-container/30 transition-all group">
            <div className="w-12 h-12 bg-primary-container/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-primary-container transition-colors">
              <span className="material-symbols-outlined text-primary group-hover:text-white">credit_card</span>
            </div>
            <h3 className="text-headline-sm text-on-surface mb-2">Billing &amp; Pricing</h3>
            <p className="text-body-md text-secondary">Manage subscription and payments</p>
          </div>
          {/* Card 6 */}
          <div className="bg-emerald-600 p-8 rounded-xl shadow-sm relative overflow-hidden flex items-end">
            <div className="absolute inset-0 opacity-10">
              <img
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAT-ufaHUWnR3GbpQAEWF-Haiq69cw6sTGKJ2dYQlsjOJJEWlpPlkEBaxft0c_yJOHtv6V0rD_TJsYJf3uGYFTQtyOvTY331dWjoQYFQOeKfNUgPHEbjNZt97ashZzhQSAWsJlqW_muBWOkJA4bs2D2xMhlGC2MNpC9n_JiwBSjC3NPdo8OcAy3vcfITbLbnzH1yH6oQ_SIGXcsfzjdvsFCuAdSk9cTu3Y8c2dodqZG91yn7kYit35gd9vPZMOlgmdRkVaBcKqdAQuE"
                alt="Background"
              />
            </div>
            <div className="relative z-10">
              <p className="text-white text-headline-sm">Need a custom demo for enterprise?</p>
              <a className="inline-flex items-center text-white mt-4 font-medium hover:underline" href="/demo">
                Book a call <span className="material-symbols-outlined ml-1">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Questions (FAQ) */}
      <section className="py-20 px-6 bg-surface-container-lowest">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-display-lg text-on-background mb-12 text-center">Popular Questions</h2>
          <div className="space-y-4">
            {/* FAQ Item 1 */}
            <details className="group bg-white border border-gray-100 rounded-xl shadow-sm transition-all" open>
              <summary className="flex justify-between items-center p-6 cursor-pointer list-none">
                <span className="text-headline-sm text-on-surface">How do I connect my WhatsApp?</span>
                <span className="material-symbols-outlined text-secondary transition-transform group-open:rotate-180">expand_more</span>
              </summary>
              <div className="px-6 pb-6 text-body-md text-secondary">
                Simply navigate to your dashboard settings, select &quot;Connect WhatsApp,&quot; and scan the QR code using your WhatsApp Business application. The connection is instantaneous and
                encrypted.
              </div>
            </details>
            {/* FAQ Item 2 */}
            <details className="group bg-white border border-gray-100 rounded-xl shadow-sm transition-all">
              <summary className="flex justify-between items-center p-6 cursor-pointer list-none">
                <span className="text-headline-sm text-on-surface">Does the AI understand customer messages?</span>
                <span className="material-symbols-outlined text-secondary transition-transform group-open:rotate-180">expand_more</span>
              </summary>
              <div className="px-6 pb-6 text-body-md text-secondary">
                Yes, our AI uses advanced natural language processing to understand intent, sentiment, and specific product inquiries. It can handle complex questions and provide accurate sales
                information automatically.
              </div>
            </details>
            {/* FAQ Item 3 */}
            <details className="group bg-white border border-gray-100 rounded-xl shadow-sm transition-all">
              <summary className="flex justify-between items-center p-6 cursor-pointer list-none">
                <span className="text-headline-sm text-on-surface">Can I add multiple products?</span>
                <span className="material-symbols-outlined text-secondary transition-transform group-open:rotate-180">expand_more</span>
              </summary>
              <div className="px-6 pb-6 text-body-md text-secondary">
                Absolutely. You can import your entire catalog via CSV or connect directly to your Shopify/E-commerce store. There are no limits on the number of products the AI can learn.
              </div>
            </details>
            {/* FAQ Item 4 */}
            <details className="group bg-white border border-gray-100 rounded-xl shadow-sm transition-all">
              <summary className="flex justify-between items-center p-6 cursor-pointer list-none">
                <span className="text-headline-sm text-on-surface">What happens if I exceed message limits?</span>
                <span className="material-symbols-outlined text-secondary transition-transform group-open:rotate-180">expand_more</span>
              </summary>
              <div className="px-6 pb-6 text-body-md text-secondary">
                If you reach your monthly limit, we&apos;ll notify you. You can either upgrade your plan or wait for the next billing cycle. We don&apos;t cut off active conversations abruptly.
              </div>
            </details>
            {/* FAQ Item 5 */}
            <details className="group bg-white border border-gray-100 rounded-xl shadow-sm transition-all">
              <summary className="flex justify-between items-center p-6 cursor-pointer list-none">
                <span className="text-headline-sm text-on-surface">Can I cancel anytime?</span>
                <span className="material-symbols-outlined text-secondary transition-transform group-open:rotate-180">expand_more</span>
              </summary>
              <div className="px-6 pb-6 text-body-md text-secondary">
                Yes, our subscriptions are flexible. You can cancel your monthly or yearly plan at any time from your account settings without any hidden fees or long-term commitments.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Contact Support Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <span className="material-symbols-outlined text-[120px]">support_agent</span>
          </div>
          <h2 className="text-headline-md text-on-background mb-4">Still need help?</h2>
          <p className="text-body-lg text-secondary mb-10">Our team is here to assist you with any questions or custom requirements.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-primary-container text-on-primary-container px-8 py-4 rounded-xl font-medium shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-xl">chat_bubble</span>
              Contact Support
            </button>
            <button className="bg-white border border-gray-200 text-on-surface px-8 py-4 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-xl">mail</span>
              Send Email
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
