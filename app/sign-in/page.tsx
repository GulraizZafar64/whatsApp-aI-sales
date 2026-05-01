import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex flex-col md:flex-row overflow-hidden pt-16 md:pt-0">
      {/* Left Side: Visual Content */}
      <section className="hidden md:flex md:w-1/2 relative bg-gradient-to-br from-primary via-on-primary-container to-primary flex-col items-center justify-center p-12 overflow-hidden">
        {/* Animated Gradient Overlay */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 -left-1/4 w-full h-full bg-primary-container blur-[120px] rounded-full"></div>
          <div className="absolute bottom-0 -right-1/4 w-full h-full bg-primary-fixed-dim blur-[120px] rounded-full"></div>
        </div>
        <div className="relative z-10 w-full max-w-lg">
          <div className="mb-12">
            <h1 className="text-display-lg text-white mb-6 leading-tight">Automate your WhatsApp sales with AI</h1>
            <p className="text-body-lg text-white/80 max-w-md">Connect your business accounts and let our intelligent agents handle lead qualification and conversion 24/7.</p>
          </div>
          {/* WhatsApp Chat Mockup */}
          <div className="relative w-full max-w-[400px] aspect-[9/16] bg-white rounded-[2rem] shadow-2xl p-3 border-[8px] border-on-surface">
            <div className="h-full w-full bg-[#E5DDD5] rounded-[1.2rem] overflow-hidden flex flex-col">
              {/* Chat Header */}
              <div className="bg-[#075E54] p-4 flex items-center gap-3 text-white">
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>
                    person
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold">New Lead - Sarah</p>
                  <p className="text-[10px] opacity-80">online</p>
                </div>
              </div>
              {/* Chat Messages */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm max-w-[80%]">
                    <p className="text-sm text-on-surface">Hi! I&apos;m interested in the Enterprise plan. What&apos;s the pricing?</p>
                    <p className="text-[9px] text-gray-400 text-right mt-1">10:42 AM</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-[#DCF8C6] p-3 rounded-xl rounded-tr-none shadow-sm max-w-[80%]">
                    <p className="text-sm text-on-surface">Hello! Our Enterprise plan starts at $499/mo. It includes custom AI training and 24/7 priority support. Would you like a demo? 🚀</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <p className="text-[9px] text-gray-400">10:42 AM</p>
                      <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                        done_all
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm max-w-[80%]">
                    <p className="text-sm text-on-surface">Yes, please! Tomorrow at 2pm?</p>
                    <p className="text-[9px] text-gray-400 text-right mt-1">10:43 AM</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-[#DCF8C6] p-3 rounded-xl rounded-tr-none shadow-sm max-w-[80%]">
                    <p className="text-sm text-on-surface">Perfect! I&apos;ve scheduled your demo with Mark for tomorrow at 2:00 PM. I&apos;ll send a calendar invite now!</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <p className="text-[9px] text-gray-400">10:43 AM</p>
                      <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                        done_all
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Chat Input Mockup */}
              <div className="p-2 bg-white/50 backdrop-blur-sm flex items-center gap-2">
                <div className="flex-1 bg-white rounded-full h-10 px-4 flex items-center text-gray-400">
                  <span className="text-xs">Type a message...</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                  <span className="material-symbols-outlined">mic</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right Side: Login Form */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-surface-bright">
        <div className="w-full max-w-[440px]">
          {/* Branding mobile only */}
          <div className="md:hidden flex items-center justify-center gap-2 mb-12">
            <div className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container text-[20px]">forum</span>
            </div>
            <span className="text-headline-sm text-on-surface tracking-tighter">ConvAI</span>
          </div>
          {/* Login Card */}
          <div className="bg-white p-8 md:p-10 rounded-xl shadow-sm border border-gray-100">
            <header className="mb-8">
              <h2 className="text-headline-md text-on-surface mb-2">Welcome Back 👋</h2>
              <p className="text-body-md text-on-secondary-container">Sign in to your WhatsApp AI dashboard</p>
            </header>
            {/* Form */}
            <form className="space-y-6">
              <div>
                <label className="block font-medium text-on-surface mb-2" htmlFor="email">
                  Email Address
                </label>
                <input
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-gray-200 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all"
                  id="email"
                  placeholder="name@company.com"
                  type="email"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-medium text-on-surface" htmlFor="password">
                    Password
                  </label>
                  <Link className="text-label-sm text-primary hover:underline transition-all" href="/forgot-password">
                    Forgot Password?
                  </Link>
                </div>
                <input
                  className="w-full px-4 py-3 bg-surface-container-lowest border border-gray-200 rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary-container transition-all"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                />
              </div>
              <button className="w-full py-4 bg-primary-container text-on-primary-container font-bold rounded-lg shadow-sm hover:opacity-90 active:scale-[0.98] transition-all" type="submit">
                Sign In
              </button>
            </form>
            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-label-sm uppercase">
                <span className="bg-white px-4 text-gray-400">Or continue with</span>
              </div>
            </div>
            {/* Social Login */}
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-lg font-medium text-on-surface hover:bg-gray-50 transition-all">
                <img
                  alt="Google"
                  className="w-5 h-5"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCf2W8vIHFRZTT7NdQ0KdFgVAUJ_HnzGu4C_roQ9-I3J8KBebQvcAH_dOiBGV_a9BaI1GNiHdB8bNvcGIg5qIe96G07TSiX5wVXaIcxIrquBpsYePaGAR2FQeS7_Aw0DFpAx3elPTBi15EdMSaUNOX3WJ92wm5KpD5Jp4pNwoyS59L8WANw_CWtacCn5xdjVputgmGaonUblHnk0Jc8m78717IeHV5kFj1O3DA9EEDFiesnHBt4NoDlns8FI7H6188MNcDTCLH50o2L"
                />
                Continue with Google
              </button>
              <button className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-lg font-medium text-on-surface hover:bg-gray-50 transition-all">
                <span className="material-symbols-outlined text-[20px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  chat
                </span>
                Continue with WhatsApp
              </button>
            </div>
            {/* Signup Link */}
            <p className="mt-8 text-center text-on-secondary-container">
              Don&apos;t have an account?{" "}
              <Link className="text-primary font-semibold hover:underline" href="/get-started">
                Sign up
              </Link>
            </p>
          </div>
          {/* Footer Security Note */}
          <div className="mt-12 flex items-center justify-center gap-2 text-gray-400">
            <span className="material-symbols-outlined text-[18px]">lock</span>
            <p className="text-label-sm">Secure login powered by encrypted authentication</p>
          </div>
        </div>
      </section>
    </main>
  );
}
