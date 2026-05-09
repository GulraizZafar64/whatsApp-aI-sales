"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

type Product = {
  name: string;
  price: string;
};

type FormData = {
  businessName: string;
  businessType: string;
  country: string;
  whatsappNumber: string;
  whatsappToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  products: Product[];
  businessDescription: string;
  replyTone: string;
};

export default function GetStartedPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    businessType: "Select type...",
    country: "Select country...",
    whatsappNumber: "",
    whatsappToken: "",
    phoneNumberId: "",
    businessAccountId: "",
    products: [{ name: "", price: "" }],
    businessDescription: "",
    replyTone: "Professional",
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMetaLoading, setIsMetaLoading] = useState(true);
  const [isFbInitialized, setIsFbInitialized] = useState(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (window.FB) {
      setIsMetaLoading(false);
      setIsFbInitialized(true);
      return;
    }

    // Load Meta SDK
    const loadMetaSDK = () => {
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
    };

    loadMetaSDK();
  }, []);

  const launchWhatsAppSignup = () => {
    console.log("Attempting to launch WhatsApp Signup...");
    
    if (typeof window === 'undefined') return;

    if (!window.FB) {
      alert("Meta SDK (FB) is not found on the window object. Ensure you don't have an ad-blocker blocking Facebook scripts.");
      return;
    }

    if (!isFbInitialized) {
      alert("Meta SDK is still initializing. This usually takes 1-2 seconds after the page loads. Please try again in a moment.");
      return;
    }

    // Check for HTTPS (Meta requirement)
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isSecure) {
      setTestResult({ 
        success: false, 
        message: "Meta requires an HTTPS connection. If you are testing locally, please use 'localhost' instead of an IP address, or set up an HTTPS tunnel (e.g., ngrok)." 
      });
      return;
    }

    try {
      window.FB.login(
        (response: any) => {
          if (response.authResponse) {
            handleMetaConnection(response.authResponse.accessToken);
          } else {
            setTestResult({ success: false, message: "Connection cancelled or not authorized." });
          }
        },
        {
          // We removed 'whatsapp_embedded_signup' because it is restricted to BSPs/Partners.
          // Using standard scopes allows regular apps to connect to existing WhatsApp accounts.
          scope: "whatsapp_business_management,whatsapp_business_messaging,public_profile",
          return_scopes: true
        }
      );
    } catch (err: any) {
      console.error("FB.login error:", err);
      setTestResult({ success: false, message: `Meta Error: ${err.message || "Failed to open login popup"}` });
    }
  };

  const handleMetaConnection = async (accessToken: string) => {
    setIsTesting(true);
    try {
      // Step 1: Exchange for long-lived token and get business details
      const response = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });

      const data = await response.json();
      if (response.ok) {
        // Check if this account is already registered
        const q = query(collection(db, "businesses"), where("phoneNumberId", "==", data.phoneNumberId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          localStorage.setItem("whatsappToken", data.accessToken);
          window.dispatchEvent(new Event("authChange"));
          toast.success("Welcome back! Your account is already set up.");
          router.push("/dashboard");
          return;
        }

        setFormData(prev => ({
          ...prev,
          whatsappToken: data.accessToken,
          phoneNumberId: data.phoneNumberId,
          businessAccountId: data.businessAccountId,
          whatsappNumber: prev.whatsappNumber || data.whatsappNumber
        }));
        setTestResult({ success: true, message: "Successfully connected via Meta!" });
        
        // Auto-advance to the next step after a short delay
        setTimeout(() => {
          setCurrentStep((prev) => Math.min(prev + 1, 4));
        }, 1500);
      } else {
        setTestResult({ success: false, message: data.error || "Failed to sync Meta account" });
      }
    } catch (error) {
      setTestResult({ success: false, message: "Error connecting to server" });
    } finally {
      setIsTesting(false);
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (index: number, field: keyof Product, value: string) => {
    const newProducts = [...formData.products];
    newProducts[index][field] = value;
    setFormData((prev) => ({ ...prev, products: newProducts }));
  };

  const addProduct = () => {
    setFormData((prev) => ({
      ...prev,
      products: [...prev.products, { name: "", price: "" }],
    }));
  };

  const removeProduct = (index: number) => {
    if (formData.products.length > 1) {
      setFormData((prev) => ({
        ...prev,
        products: prev.products.filter((_, i) => i !== index),
      }));
    }
  };

  const testConnection = async () => {
    if (!formData.whatsappToken || !formData.phoneNumberId) {
      setTestResult({ success: false, message: "Please enter Token and Phone Number ID" });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: formData.whatsappToken,
          phoneNumberId: formData.phoneNumberId,
        }),
      });

      const data = await response.json();
      setTestResult({
        success: response.ok,
        message: response.ok ? "Connection successful!" : data.error || "Connection failed",
      });
    } catch (error) {
      setTestResult({ success: false, message: "Failed to connect to server" });
    } finally {
      setIsTesting(false);
    }
  };

  const finishSetup = async () => {
    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      const dataToSave = {
        ...formData,
        userId: user?.uid || "anonymous",
        createdAt: serverTimestamp(),
        status: "active"
      };

      // Add a timeout to prevent hanging if Firestore cannot connect
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore connection timed out. Please check your database settings.")), 10000)
      );

      await Promise.race([
        addDoc(collection(db, "businesses"), dataToSave),
        timeoutPromise
      ]);
      localStorage.setItem("whatsappToken", formData.whatsappToken);
      window.dispatchEvent(new Event("authChange"));
      toast.success("Setup complete! Your AI assistant is now ready.");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error saving setup:", error);
      toast.error(error.message || "Failed to save setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="w-full pt-4 pb-12">
            <div className="flex items-center w-full relative">
              {[
                { id: 1, label: "Business", icon: "domain" },
                { id: 2, label: "WhatsApp", icon: "chat" },
                { id: 3, label: "Products", icon: "inventory_2" },
                { id: 4, label: "AI Config", icon: "smart_toy" },
              ].map((step, idx, arr) => (
                <div key={step.id} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm ${
                        currentStep === step.id
                          ? "bg-primary text-white scale-110 shadow-primary/20"
                          : currentStep > step.id
                          ? "bg-primary/10 text-primary"
                          : "bg-surface-container-low border border-outline-variant text-outline"
                      }`}
                    >
                      {currentStep > step.id ? (
                        <span className="material-symbols-outlined text-xl font-bold">check</span>
                      ) : (
                        <span className="material-symbols-outlined text-xl">{step.icon}</span>
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-7 whitespace-nowrap text-[11px] font-bold tracking-wider uppercase transition-colors duration-300 ${
                        currentStep >= step.id ? "text-on-surface" : "text-outline"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <div className="flex-1 px-4 mb-0">
                      <div className="h-1 w-full bg-surface-container-low rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-700 ease-in-out"
                          style={{ width: currentStep > step.id ? "100%" : "0%" }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-outline-variant shadow-xl shadow-primary/5 overflow-hidden flex flex-col min-h-[480px]">
            {/* Top Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>
            
            <div className="p-8 flex-grow">
              {currentStep === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-label-md text-on-surface font-bold tracking-tight">Business Name</label>
                      <input
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleInputChange}
                        className="w-full border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary px-4 py-3.5 text-body-md bg-surface-container-lowest transition-all outline-none"
                        placeholder="e.g. Acme Coffee Roasters"
                        type="text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-label-md text-on-surface font-bold tracking-tight">WhatsApp Business Number</label>
                      <input
                        name="whatsappNumber"
                        value={formData.whatsappNumber}
                        onChange={handleInputChange}
                        className="w-full border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary px-4 py-3.5 text-body-md bg-surface-container-lowest transition-all outline-none"
                        placeholder="e.g. +1 234 567 8900"
                        type="text"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-label-md text-on-surface font-bold tracking-tight">Business Type</label>
                        <div className="relative">
                          <select
                            name="businessType"
                            value={formData.businessType}
                            onChange={handleInputChange}
                            className="w-full border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary px-4 py-3.5 text-body-md bg-surface-container-lowest appearance-none transition-all outline-none cursor-pointer"
                          >
                            <option disabled>Select type...</option>
                            <option>Retail</option>
                            <option>Services</option>
                            <option>E-commerce</option>
                            <option>Consulting</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-label-md text-on-surface font-bold tracking-tight">Country</label>
                        <div className="relative">
                          <select
                            name="country"
                            value={formData.country}
                            onChange={handleInputChange}
                            className="w-full border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary px-4 py-3.5 text-body-md bg-surface-container-lowest appearance-none transition-all outline-none cursor-pointer"
                          >
                            <option disabled>Select country...</option>
                            <option>United States</option>
                            <option>United Kingdom</option>
                            <option>Brazil</option>
                            <option>India</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-10 py-4">
                    <div className="text-center space-y-3">
                      <h3 className="text-display-sm font-bold text-on-surface">Connect Your WhatsApp</h3>
                      <p className="text-body-lg text-secondary max-w-[480px] mx-auto">
                        Connect your WhatsApp Business account to automatically reply to customers and generate sales.
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                      <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center relative shadow-inner">
                        <div className="absolute inset-0 bg-primary/5 rounded-[2rem] animate-ping opacity-20"></div>
                        <svg className="w-12 h-12 fill-primary relative z-10" viewBox="0 0 24 24">
                          <path d="M12.075 0C5.405 0 0 5.405 0 12.075c0 2.13.555 4.125 1.515 5.865L.03 23.505l5.745-1.515a11.96 11.96 0 006.3 1.785c6.67 0 12.075-5.405 12.075-12.075C24.15 5.405 18.745 0 12.075 0zm0 22.065a9.92 9.92 0 01-5.07-1.38l-.36-.21-3.765.99.99-3.66-.24-.375a9.92 9.92 0 01-1.53-5.355c0-5.505 4.47-9.975 9.975-9.975 5.505 0 9.975 4.47 9.975 9.975s-4.47 9.975-9.975 9.975z"/>
                        </svg>
                      </div>
                      
                      <div className="flex flex-col items-center gap-4 w-full">
                        {formData.whatsappToken && testResult?.success ? (
                          <div className="w-full max-w-sm bg-success/10 text-success border border-success/20 px-10 py-5 rounded-2xl text-title-md font-bold flex items-center justify-center gap-3 transition-all">
                            <span className="material-symbols-outlined text-2xl">check_circle</span>
                            Connected
                          </div>
                        ) : (
                          <button 
                            onClick={launchWhatsAppSignup}
                            disabled={isMetaLoading || !isFbInitialized || isTesting}
                            className="w-full max-w-sm bg-primary text-white px-10 py-5 rounded-2xl text-title-md font-bold shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                            {isTesting ? (
                              <>
                                <span className="animate-spin h-6 w-6 border-3 border-white border-t-transparent rounded-full"></span>
                                Connecting...
                              </>
                            ) : (
                              <>
                                👉 Connect WhatsApp
                              </>
                            )}
                          </button>
                        )}
                        <p className="text-label-md text-secondary flex items-center gap-2">
                          <svg className="w-4 h-4 fill-secondary" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Secure connection via Facebook
                        </p>
                      </div>

                      {!(formData.whatsappToken && testResult?.success) && (
                        <>
                          <button 
                            onClick={nextStep}
                            className="text-label-md font-bold text-outline hover:text-on-surface transition-colors mt-2"
                          >
                            Skip for now
                          </button>

                          <button 
                            onClick={() => setTestResult({ success: false, message: "MANUAL_SETUP" })}
                            className="text-[10px] text-outline hover:underline mt-4"
                          >
                            Trouble connecting? Use manual setup instead
                          </button>
                        </>
                      )}
                    </div>

                    {testResult?.message === "MANUAL_SETUP" && (
                      <div className="space-y-4 p-6 bg-surface-container-low rounded-2xl border border-outline-variant animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                          <p className="text-label-md font-bold text-on-surface">Manual API Setup</p>
                          <button onClick={() => setTestResult(null)} className="text-outline hover:text-on-surface">
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-secondary uppercase">Phone Number ID</label>
                            <input
                              name="phoneNumberId"
                              value={formData.phoneNumberId}
                              onChange={handleInputChange}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:border-primary"
                              placeholder="e.g. 1029384756"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-secondary uppercase">WhatsApp Number</label>
                            <input
                              name="whatsappNumber"
                              value={formData.whatsappNumber}
                              onChange={handleInputChange}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:border-primary"
                              placeholder="e.g. +1 234 567 8900"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-secondary uppercase">Permanent Access Token</label>
                            <input
                              name="whatsappToken"
                              value={formData.whatsappToken}
                              onChange={handleInputChange}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:border-primary"
                              placeholder="EAAB..."
                              type="password"
                            />
                          </div>
                          <button 
                            onClick={() => setTestResult({ success: true, message: "Manual credentials saved locally." })}
                            className="w-full bg-on-surface text-surface px-4 py-2 rounded-lg text-label-sm font-bold"
                          >
                            Save Manual Credentials
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="pt-8 border-t border-outline-variant">
                      <div className="flex items-start gap-3 p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                        <span className="text-xl">🔒</span>
                        <p className="text-body-sm text-secondary leading-relaxed">
                          We only access messages sent to your business. Your personal chats remain private.
                        </p>
                      </div>
                    </div>

                    {/* Result Messages */}
                    {testResult && (
                      <div className={`p-6 rounded-2xl border-2 transition-all animate-in fade-in zoom-in-95 duration-300 ${
                        testResult.success ? "border-success/30 bg-success/5" : "border-error/30 bg-error/5"
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            testResult.success ? "bg-success/10 text-success" : "bg-error/10 text-error"
                          }`}>
                            <span className="material-symbols-outlined text-2xl">
                              {testResult.success ? "verified" : "error"}
                            </span>
                          </div>
                          <div>
                            <p className="text-label-lg font-bold text-on-surface">
                              {testResult.success ? "Successfully Linked!" : "Connection Error"}
                            </p>
                            <p className="text-body-sm text-secondary">{testResult.message}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-title-md text-on-surface font-bold">Products & Services</h3>
                      <p className="text-body-sm text-secondary">Add items to help the AI handle inquiries</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        className="whitespace-nowrap text-secondary text-label-sm font-bold flex items-center gap-2 hover:text-on-surface transition-colors bg-surface-container-low px-4 py-2.5 rounded-xl border border-outline-variant"
                      >
                        <span className="material-symbols-outlined text-base">upload</span>
                        Bulk Import
                      </button>
                      <button
                        onClick={addProduct}
                        className="whitespace-nowrap bg-primary-container text-on-primary-container text-label-sm font-bold flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                        Add Product
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-h-[340px] overflow-y-auto pr-3 custom-scrollbar">
                    {formData.products.map((product, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 items-center bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant hover:border-primary/30 hover:shadow-md transition-all relative group">
                        <div className="col-span-12 sm:col-span-7 space-y-1.5">
                          <label className="text-[10px] text-secondary font-bold uppercase tracking-widest ml-1">Product Name</label>
                          <input
                            value={product.name}
                            onChange={(e) => handleProductChange(index, "name", e.target.value)}
                            className="w-full border-none focus:ring-0 px-1 py-0.5 text-body-md bg-transparent placeholder:text-outline/40 font-medium"
                            placeholder="e.g. Espresso Beans"
                            type="text"
                          />
                        </div>
                        <div className="col-span-9 sm:col-span-4 space-y-1.5">
                          <label className="text-[10px] text-secondary font-bold uppercase tracking-widest ml-1">Price ($)</label>
                          <input
                            value={product.price}
                            onChange={(e) => handleProductChange(index, "price", e.target.value)}
                            className="w-full border-none focus:ring-0 px-1 py-0.5 text-body-md bg-transparent placeholder:text-outline/40 font-medium"
                            placeholder="0.00"
                            type="text"
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-1 flex justify-center pt-5">
                          <button
                            onClick={() => removeProduct(index)}
                            className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-xl transition-all"
                            disabled={formData.products.length === 1}
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {formData.products.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-outline-variant rounded-2xl">
                        <p className="text-body-md text-secondary">No products added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-label-md text-on-surface font-bold tracking-tight">Business Description</label>
                      <textarea
                        name="businessDescription"
                        value={formData.businessDescription}
                        onChange={handleInputChange}
                        className="w-full border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary px-4 py-4 text-body-md bg-surface-container-lowest transition-all min-h-[160px] resize-none outline-none"
                        placeholder="Tell us about your business, what you sell, and your brand voice. This helps the AI understand your business..."
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-label-md text-on-surface font-bold tracking-tight">Tone of Replies</label>
                      <div className="grid grid-cols-3 gap-4">
                        {["Friendly", "Professional", "Casual"].map((tone) => (
                          <button
                            key={tone}
                            onClick={() => setFormData((prev) => ({ ...prev, replyTone: tone }))}
                            className={`px-4 py-4 rounded-xl border-2 text-label-md font-bold transition-all ${
                              formData.replyTone === tone
                                ? "bg-primary-container border-primary text-on-primary-container shadow-inner scale-[1.02]"
                                : "bg-surface-container-lowest border-outline-variant text-secondary hover:border-outline hover:scale-[1.01]"
                            }`}
                          >
                            {tone}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 bg-surface-container-lowest border-t border-surface-container flex flex-col sm:flex-row justify-between items-center gap-6">
              <button
                onClick={prevStep}
                className={`flex items-center gap-2 px-6 py-3 text-label-md font-bold text-secondary hover:text-on-surface transition-all ${
                  currentStep === 1 ? "invisible" : ""
                }`}
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back
              </button>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <button className="w-full sm:w-auto px-8 py-3 text-label-md font-bold text-secondary hover:text-on-surface transition-all hover:bg-surface-container-low rounded-xl">
                  Save Draft
                </button>
                <button
                  onClick={currentStep === 4 ? finishSetup : nextStep}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-primary text-white px-10 py-4 rounded-xl font-bold shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      {currentStep === 4 ? "Finish Setup" : "Next Step"}
                      <span className="material-symbols-outlined text-lg">
                        {currentStep === 4 ? "check_circle" : "arrow_forward"}
                      </span>
                    </>
                  )}
                </button>
              </div>
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
                  <h4 className="text-white text-xs font-bold">
                    {formData.businessName || "Acme Assistant"}
                  </h4>
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
                    <p className="text-xs text-on-surface">
                      Hi! I saw your {formData.products[0]?.name || "new coffee roast"} online. How much is this?
                    </p>
                    <p className="text-[9px] text-on-surface-variant text-right mt-1">10:42 AM</p>
                  </div>
                </div>
                {/* AI Response */}
                <div className="flex justify-end">
                  <div className="bg-[#DCF8C6] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[80%] relative">
                    <p className="text-xs text-on-surface">
                      {formData.products[0]?.price 
                        ? `It's $${formData.products[0].price} 👍 Would you like to order?` 
                        : "Hi! It's $20 👍 Would you like to order? I can handle the payment right here."}
                    </p>
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
