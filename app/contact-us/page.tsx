export default function ContactUsPage() {
  return (
    <main className="pt-32">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-8 mb-20 text-center">
        <span className="inline-block py-1 px-3 rounded-full bg-primary-container/10 text-on-primary-container text-label-sm mb-6">Support Center</span>
        <h1 className="text-display-xl text-on-background mb-4">Get in Touch</h1>
        <p className="text-body-lg text-secondary max-w-2xl mx-auto mb-4">Have questions or want a demo? We’re here to help.</p>
        <div className="flex items-center justify-center gap-2 text-primary">
          <span className="material-symbols-outlined text-[18px]">schedule</span>
          <span className="text-label-md">We usually respond within a few hours</span>
        </div>
      </section>

      {/* Contact Cards Section */}
      <section className="max-w-7xl mx-auto px-8 mb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* General Support */}
          <div className="bg-white border border-slate-100 p-8 rounded-xl shadow-sm hover:translate-y-[-4px] transition-transform duration-300">
            <div className="w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-primary">help_center</span>
            </div>
            <h3 className="text-headline-sm mb-2">General Support</h3>
            <p className="text-secondary mb-8">Help with setup, issues, or usage</p>
            <button className="w-full py-3 px-4 border border-slate-200 rounded-xl font-medium text-on-surface hover:bg-slate-50 transition-colors">Contact Support</button>
          </div>
          {/* Sales & Demo */}
          <div className="bg-white border border-slate-100 p-8 rounded-xl shadow-sm hover:translate-y-[-4px] transition-transform duration-300">
            <div className="w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-primary">drive_presentation</span>
            </div>
            <h3 className="text-headline-sm mb-2">Sales &amp; Demo</h3>
            <p className="text-secondary mb-8">Want a live demo or pricing details?</p>
            <button className="w-full py-3 px-4 bg-primary-container text-on-primary-container rounded-xl font-bold shadow-sm hover:opacity-90 transition-opacity">Request Demo</button>
          </div>
          {/* Partnerships */}
          <div className="bg-white border border-slate-100 p-8 rounded-xl shadow-sm hover:translate-y-[-4px] transition-transform duration-300">
            <div className="w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-primary">handshake</span>
            </div>
            <h3 className="text-headline-sm mb-2">Partnerships</h3>
            <p className="text-secondary mb-8">Integrations, agencies, or business partnerships</p>
            <button className="w-full py-3 px-4 border border-slate-200 rounded-xl font-medium text-on-surface hover:bg-slate-50 transition-colors">Contact Sales</button>
          </div>
        </div>
      </section>

      {/* Main Form + Side Panel */}
      <section className="max-w-7xl mx-auto px-8 mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="lg:col-span-8 p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-slate-100">
            <h2 className="text-headline-md mb-8">Send us a message</h2>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-label-md text-on-surface-variant">Full Name</label>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
                    placeholder="Jane Doe"
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-label-md text-on-surface-variant">Email</label>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
                    placeholder="jane@company.com"
                    type="email"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-label-md text-on-surface-variant">Business Name (optional)</label>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
                    placeholder="Acme Inc"
                    type="text"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-label-md text-on-surface-variant">Category</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white">
                    <option>Sales</option>
                    <option>Support</option>
                    <option>Partnership</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-label-md text-on-surface-variant">Message</label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-400"
                  placeholder="How can we help you today?"
                  rows={4}
                ></textarea>
              </div>
              <button
                className="bg-primary-container text-on-primary-container px-8 py-4 rounded-xl font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all w-full md:w-auto"
                type="submit"
              >
                Send Message
              </button>
            </form>
          </div>
          <div className="lg:col-span-4 p-8 md:p-12 bg-slate-50/50">
            <h3 className="text-headline-sm mb-6">Quick Facts</h3>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px]">avg_time</span>
                </div>
                <div>
                  <p className="font-medium text-on-surface">Response time</p>
                  <p className="text-label-sm text-secondary">Within 24 hours</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px]">public</span>
                </div>
                <div>
                  <p className="font-medium text-on-surface">Available globally</p>
                  <p className="text-label-sm text-secondary">Supporting all time zones</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                </div>
                <div>
                  <p className="font-medium text-on-surface">WhatsApp support available</p>
                  <p className="text-label-sm text-secondary">Chat directly via our widget</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                </div>
                <div>
                  <p className="font-medium text-on-surface">Email support available</p>
                  <p className="text-label-sm text-secondary">For detailed documentation</p>
                </div>
              </li>
            </ul>
            <div className="mt-12">
              <img
                alt="Workspace"
                className="w-full h-48 object-cover rounded-xl grayscale opacity-60 hover:grayscale-0 transition-all duration-500"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLu0-RAw9rwHDwtla3mpcfGK-pNjEAF2A6pjaOCZ1MExp9qOIqwWWgkTN71Gd6XLME7qazSINZXXMyGBQix_fk-bTvP525BUecSlzXMkWw_1e1RF37ZEwv9AcxKEN1YIiRl3tRw2IM0PAZEMV2Zc4tYA8IuedevOrB5wwzzNHA3IxRpfanUsbWNZQPpWKv647OrufnhK53BNCGHFELQJSVxnICdaHIerS91ljcrAKXlQi3IrrGZ8VBNW7HVYOMgtf4wmw1wYrh8cQ5"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="max-w-7xl mx-auto px-8 mb-24 text-center">
        <p className="text-label-sm text-secondary uppercase tracking-widest mb-10">Trusted by growing businesses worldwide</p>
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale">
          <span className="text-headline-sm font-extrabold tracking-tighter">VOLT</span>
          <span className="text-headline-sm font-extrabold tracking-tighter">ZENITH</span>
          <span className="text-headline-sm font-extrabold tracking-tighter">ORBIT</span>
          <span className="text-headline-sm font-extrabold tracking-tighter">PULSE</span>
          <span className="text-headline-sm font-extrabold tracking-tighter">NEXUS</span>
        </div>
      </section>

      {/* FAQ Mini Section */}
      <section className="bg-surface-container-low py-24">
        <div className="max-w-4xl mx-auto px-8">
          <h2 className="text-headline-md mb-12 text-center">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <h4 className="font-medium text-on-surface">How fast do you reply?</h4>
              <p className="text-body-md text-secondary">Our average response time is under 2 hours for support tickets and under 4 hours for sales inquiries during business days.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-on-surface">Can I get a demo before buying?</h4>
              <p className="text-body-md text-secondary">Absolutely! Click the &quot;Request Demo&quot; button to schedule a personalized walkthrough with one of our AI sales experts.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-on-surface">Do you support small businesses?</h4>
              <p className="text-body-md text-secondary">Yes, we have pricing tiers specifically designed for startups and small businesses looking to scale their operations.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-on-surface">Can I integrate multiple WhatsApp numbers?</h4>
              <p className="text-body-md text-secondary">Yes, our Enterprise plan allows you to manage multiple numbers from a single centralized dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-8 my-32">
        <div className="relative bg-on-background rounded-3xl p-12 md:p-20 overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-20 -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-10 -ml-32 -mb-32"></div>
          <h2 className="text-display-lg text-white mb-6 relative z-10">Ready to automate your WhatsApp?</h2>
          <p className="text-body-lg text-slate-400 mb-10 max-w-xl mx-auto relative z-10">Join 10,000+ sales teams using AI to close more deals faster.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            <button className="bg-primary-container text-on-primary-container px-10 py-4 rounded-xl font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all">Get Started</button>
            <button className="bg-white/10 text-white border border-white/20 backdrop-blur-md px-10 py-4 rounded-xl font-bold hover:bg-white/20 transition-all">Request Demo</button>
          </div>
        </div>
      </section>
    </main>
  );
}
