import Link from "next/link";

export default function GetStartedPage() {
  return (
    <main className="flex-grow pt-24 pb-12 flex items-center justify-center">
      <div className="max-w-[1200px] w-full px-6 grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Left Side: Onboarding Content */}
        <div className="lg:col-span-7 space-y-10">
          <div className="space-y-2">
            <h1 className="text-display-lg text-on-surface">Get Started in Minutes</h1>
            <p className="text-body-lg text-secondary">Set up your AI WhatsApp assistant in just a few steps</p>
          </div>
          {/* Progress Indicator */}
          <div className="flex items-center w-full max-w-xl">
            <div className="flex-1 flex flex-col items-center group">
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-sm font-bold">1</div>
              <span className="mt-2 text-label-sm font-bold text-on-primary-container">Business</span>
            </div>
            <div className="h-px bg-outline-variant flex-1 mb-6"></div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full border-2 border-outline-variant text-outline flex items-center justify-center text-label-sm font-bold">2</div>
              <span className="mt-2 text-label-sm font-bold text-outline">WhatsApp</span>
            </div>
            <div className="h-px bg-outline-variant flex-1 mb-6"></div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full border-2 border-outline-variant text-outline flex items-center justify-center text-label-sm font-bold">3</div>
              <span className="mt-2 text-label-sm font-bold text-outline">Products</span>
            </div>
            <div className="h-px bg-outline-variant flex-1 mb-6"></div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-8 h-8 rounded-full border-2 border-outline-variant text-outline flex items-center justify-center text-label-sm font-bold">4</div>
              <span className="mt-2 text-label-sm font-bold text-outline">AI Config</span>
            </div>
          </div>
          {/* Step 1: Business Info Form (Active) */}
          <div className="bg-white p-8 rounded-xl border border-outline-variant shadow-sm space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-label-md text-on-surface font-medium">Business Name</label>
                <input
                  className="w-full border-outline-variant rounded-lg focus:ring-primary focus:border-primary px-4 py-3 text-body-md bg-surface-container-lowest"
                  placeholder="e.g. Acme Coffee Roasters"
                  type="text"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-element-gap">
                <div className="space-y-2">
                  <label className="text-label-md text-on-surface font-medium">Business Type</label>
                  <select className="w-full border-outline-variant rounded-lg focus:ring-primary focus:border-primary px-4 py-3 text-body-md bg-surface-container-lowest appearance-none">
                    <option>Select type...</option>
                    <option>Retail</option>
                    <option>Services</option>
                    <option>E-commerce</option>
                    <option>Consulting</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-label-md text-on-surface font-medium">Country</label>
                  <select className="w-full border-outline-variant rounded-lg focus:ring-primary focus:border-primary px-4 py-3 text-body-md bg-surface-container-lowest appearance-none">
                    <option>Select country...</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Brazil</option>
                    <option>India</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-surface-container flex justify-end items-center gap-4">
              <button className="px-6 py-3 text-label-md text-secondary hover:text-on-surface transition-colors">Save Draft</button>
              <button className="bg-primary text-white px-8 py-3 rounded-lg font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
                Next Step
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
        {/* Right Side: Chat Preview */}
        <div className="lg:col-span-5 sticky top-24">
          <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant relative overflow-hidden">
            {/* Glassy Background Decor */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl"></div>
            {/* Chat Device Mockup */}
            <div className="relative bg-[#E5DDD5] rounded-2xl overflow-hidden border-8 border-inverse-surface shadow-2xl aspect-[9/16] max-w-[320px] mx-auto flex flex-col">
              {/* WhatsApp Header */}
              <div className="bg-[#075E54] p-3 flex items-center gap-3">
                <span className="material-symbols-outlined text-white">arrow_back</span>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-sm">person</span>
                </div>
                <div>
                  <h4 className="text-white text-xs font-bold">Acme Assistant</h4>
                  <p className="text-white/70 text-[10px]">Online</p>
                </div>
              </div>
              {/* Chat Body */}
              <div className="p-4 space-y-4 h-full flex flex-col overflow-y-auto">
                {/* Timestamp */}
                <div className="flex justify-center">
                  <span className="bg-[#D1E9F1] text-[#55615a] text-[10px] px-2 py-0.5 rounded-md shadow-sm">TODAY</span>
                </div>
                {/* Customer Message */}
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[80%] relative">
                    <p className="text-xs text-on-surface">Hi! I saw your new coffee roast online. How much is this?</p>
                    <p className="text-[9px] text-on-surface-variant text-right mt-1">10:42 AM</p>
                  </div>
                </div>
                {/* AI Response */}
                <div className="flex justify-end">
                  <div className="bg-[#DCF8C6] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[80%] relative">
                    <p className="text-xs text-on-surface">It’s $20 👍 Would you like to order? I can handle the payment right here.</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <p className="text-[9px] text-on-surface-variant">10:42 AM</p>
                      <span className="material-symbols-outlined text-[10px] text-[#34B7F1]">done_all</span>
                    </div>
                  </div>
                </div>
                <div className="mt-auto opacity-50 select-none">
                  <div className="bg-white p-2 rounded-full flex items-center gap-2 border border-outline-variant">
                    <span className="material-symbols-outlined text-on-surface-variant text-sm">sentiment_satisfied</span>
                    <p className="text-[10px] text-on-surface-variant flex-grow">Type a message</p>
                    <span className="material-symbols-outlined text-on-surface-variant text-sm">attach_file</span>
                    <span className="material-symbols-outlined text-on-surface-variant text-sm">photo_camera</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-label-sm font-medium text-secondary">Live Preview of your Assistant</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
