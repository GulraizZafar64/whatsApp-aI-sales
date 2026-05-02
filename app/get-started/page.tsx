"use client";

import { useState } from "react";
import Link from "next/link";

type Product = {
  name: string;
  price: string;
};

type FormData = {
  businessName: string;
  businessType: string;
  country: string;
  whatsappNumber: string;
  products: Product[];
  businessDescription: string;
  replyTone: string;
};

export default function GetStartedPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    businessType: "Select type...",
    country: "Select country...",
    whatsappNumber: "",
    products: [{ name: "", price: "" }],
    businessDescription: "",
    replyTone: "Professional",
  });

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
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-label-md text-on-surface font-bold tracking-tight">WhatsApp Number</label>
                      <input
                        name="whatsappNumber"
                        value={formData.whatsappNumber}
                        onChange={handleInputChange}
                        className="w-full border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary px-4 py-3.5 text-body-md bg-surface-container-lowest transition-all outline-none"
                        placeholder="+1 (555) 000-0000"
                        type="tel"
                      />
                      <p className="text-body-sm text-secondary">Connect your WhatsApp Business number to start receiving orders.</p>
                    </div>
                    <div className="p-8 border-2 border-dashed border-outline-variant rounded-2xl flex flex-col items-center justify-center gap-5 bg-surface-container-lowest/50 hover:bg-surface-container-lowest hover:border-primary/50 transition-all group cursor-pointer">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                        <span className="material-symbols-outlined text-primary text-3xl">qr_code_2</span>
                      </div>
                      <div className="text-center">
                        <p className="text-label-lg font-bold text-on-surface">Link your account</p>
                        <p className="text-body-sm text-secondary max-w-[280px] mx-auto mt-1">Open WhatsApp settings on your phone and scan the code to link</p>
                      </div>
                      <button className="bg-primary text-white px-8 py-3 rounded-xl text-label-md font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all mt-2">
                        Connect WhatsApp
                      </button>
                    </div>
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
                  onClick={currentStep === 4 ? () => alert("Setup Finished!") : nextStep}
                  className="w-full sm:w-auto bg-primary text-white px-10 py-4 rounded-xl font-bold shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {currentStep === 4 ? "Finish Setup" : "Next Step"}
                  <span className="material-symbols-outlined text-lg">
                    {currentStep === 4 ? "check_circle" : "arrow_forward"}
                  </span>
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
