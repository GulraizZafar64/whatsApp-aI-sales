"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

export default function SignInPage() {
  const [isMetaLoading, setIsMetaLoading] = useState(true);
  const [isFbInitialized, setIsFbInitialized] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (window.FB) {
      setIsMetaLoading(false);
      setIsFbInitialized(true);
      return;
    }

    window.fbAsyncInit = function() {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0'
      });
      setIsMetaLoading(false);
      setIsFbInitialized(true);
    };

    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as HTMLScriptElement; js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  const handleWhatsAppLogin = () => {
    if (typeof window === 'undefined') return;

    if (!window.FB || !isFbInitialized) {
      toast.error("Meta SDK is not initialized yet. Please wait a moment.");
      return;
    }

    setIsLoggingIn(true);

    try {
      window.FB.login(
        (response: any) => {
          if (response.authResponse) {
            // Check connection and then redirect
            verifyConnection(response.authResponse.accessToken);
          } else {
            setIsLoggingIn(false);
            toast.error("Login cancelled or not authorized.");
          }
        },
        {
          scope: "whatsapp_business_management,whatsapp_business_messaging,public_profile",
          return_scopes: true
        }
      );
    } catch (err: any) {
      setIsLoggingIn(false);
      toast.error(`Meta Error: ${err.message || "Failed to open login popup"}`);
    }
  };

  const verifyConnection = async (accessToken: string) => {
    try {
      const response = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });

      if (response.ok) {
        localStorage.setItem("whatsappToken", accessToken);
        toast.success("Successfully logged in!");
        router.push("/dashboard");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to verify Meta account");
        setIsLoggingIn(false);
      }
    } catch (error) {
      toast.error("Error connecting to server");
      setIsLoggingIn(false);
    }
  };

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
            
            {/* Login Action */}
            <div className="py-6">
              <button 
                onClick={handleWhatsAppLogin}
                disabled={isMetaLoading || !isFbInitialized || isLoggingIn}
                className="w-full flex items-center justify-center gap-3 py-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold shadow-lg shadow-[#25D366]/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? (
                  <>
                    <span className="animate-spin h-6 w-6 border-3 border-white border-t-transparent rounded-full"></span>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                      <path d="M12.075 0C5.405 0 0 5.405 0 12.075c0 2.13.555 4.125 1.515 5.865L.03 23.505l5.745-1.515a11.96 11.96 0 006.3 1.785c6.67 0 12.075-5.405 12.075-12.075C24.15 5.405 18.745 0 12.075 0zm0 22.065a9.92 9.92 0 01-5.07-1.38l-.36-.21-3.765.99.99-3.66-.24-.375a9.92 9.92 0 01-1.53-5.355c0-5.505 4.47-9.975 9.975-9.975 5.505 0 9.975 4.47 9.975 9.975s-4.47 9.975-9.975 9.975z"/>
                    </svg>
                    Continue with WhatsApp
                  </>
                )}
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
