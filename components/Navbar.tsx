"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("whatsappToken");
      setIsLoggedIn(!!token);
    };

    checkAuth();

    // Custom event listener for auth changes in the same tab
    const handleAuthChange = () => checkAuth();
    window.addEventListener("authChange", handleAuthChange);
    
    // Listen for storage changes from other tabs
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("authChange", handleAuthChange);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("whatsappToken");
    localStorage.removeItem("whatsappPhoneNumberId");
    window.dispatchEvent(new Event("authChange"));
    toast.success("Logged out successfully");
    router.push("/sign-in");
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
        <Link
          href="/"
          className="text-xl font-bold text-gray-900 tracking-tighter"
        >
          WhatsApp AI Sales
        </Link>
        <div className="hidden md:flex gap-8 items-center">
          <Link
            className="font-['Inter'] text-sm font-semibold tracking-tight text-emerald-600 border-b-2 border-emerald-500 pb-1"
            href="/features"
          >
            Features
          </Link>
          <Link
            className="font-['Inter'] text-sm font-medium tracking-tight text-gray-600 hover:text-emerald-500 transition-colors duration-200"
            href="/how-it-works"
          >
            How it Works
          </Link>
          <Link
            className="font-['Inter'] text-sm font-medium tracking-tight text-gray-600 hover:text-emerald-500 transition-colors duration-200"
            href="/pricing"
          >
            Pricing
          </Link>
          <Link
            className="font-['Inter'] text-sm font-medium tracking-tight text-gray-600 hover:text-emerald-500 transition-colors duration-200"
            href="/demo"
          >
            Demo
          </Link>
          {isLoggedIn && (
            <Link
              className="font-['Inter'] text-sm font-medium tracking-tight text-gray-600 hover:text-emerald-500 transition-colors duration-200"
              href="/dashboard"
            >
              Dashboard
            </Link>
          )}
        </div>
        <div className="flex gap-4 items-center">
          {isLoggedIn ? (
            <button 
              onClick={handleLogout}
              className="bg-error/10 text-error px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-error/20 transition-all active:scale-95 shadow-sm"
            >
              Logout
            </button>
          ) : (
            <>
              <Link href="/sign-in">
                <button className="text-sm font-medium text-gray-600 hover:text-emerald-500 transition-all">
                  Login
                </button>
              </Link>
              <Link href="/get-started">
                <button className="bg-primary hover:bg-on-primary-container text-white px-5 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all shadow-sm">
                  Get Started
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
