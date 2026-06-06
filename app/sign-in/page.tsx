"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { AppLogo } from "@/components/brand/AppLogo";
import { BallLoader } from "@/components/ui/BallLoader";
import { setAuthToken } from "@/lib/dashboard/session";

function safeNextPath(raw: string | null): string {
  if (!raw?.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string; token?: string };
      if (!res.ok || !data.token) {
        toast.error(data.error ?? "Login failed");
        return;
      }
      setAuthToken(data.token);
      toast.success("Welcome back!");
      router.push(nextPath);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout demoSide="left">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex justify-center mb-6">
          <AppLogo href="/" size="lg" />
        </div>
        <h1 className="text-headline-md text-on-surface mb-2 text-center">Sign in</h1>
        <p className="text-body-md text-on-secondary-container mb-6">
          Email and password to access your WhatsApp AI dashboard.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#25D366] text-white font-bold hover:bg-[#20bd5a] disabled:opacity-70 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-on-secondary-container">
          No account?{" "}
          <Link
            href={
              nextPath !== "/dashboard"
                ? `/sign-up?next=${encodeURIComponent(nextPath)}`
                : "/sign-up"
            }
            className="text-primary font-semibold hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
          <BallLoader size="md" />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
