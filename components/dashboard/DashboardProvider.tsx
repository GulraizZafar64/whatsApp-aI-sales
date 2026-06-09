"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { BusinessProfileModal } from "@/components/business/BusinessProfileModal";
import { BallLoader } from "@/components/ui/BallLoader";
import {
  resetWhatsAppConnectPostGuard,
  WhatsAppQrPanel,
} from "@/components/dashboard/WhatsAppQrPanel";
import {
  fetchDashboardProfile,
  saveDashboardProfile,
  type DashboardProfile,
} from "@/lib/dashboard/profile";
import {
  consumeOpenBusinessSettingsRequest,
  clearDashboardSession,
  dashboardFetch,
  hasDashboardSession,
  notifyBusinessProfileUpdated,
  setAuthToken,
} from "@/lib/dashboard/session";
import { BillingAccessBanner } from "@/components/dashboard/BillingAccessBanner";
import { SubscriptionRequiredModal } from "@/components/dashboard/SubscriptionRequiredModal";

export type BillingBlockReason =
  | "trial_expired"
  | "subscription_expired"
  | "renewal_failed";

type DashboardContextValue = {
  profile: DashboardProfile | null;
  userName: string | null;
  userEmail: string;
  /** True after the first profile / auth bootstrap finishes. */
  bootstrapped: boolean;
  /** Business profile modal must be completed first. */
  needsSetup: boolean;
  businessType: string | null;
  waStatus: string;
  refreshProfile: () => Promise<void>;
  profileSaving: boolean;
  saveProfile: (payload: {
    businessName: string;
    businessType: string;
    country: string;
    currency: string;
    whatsappNumber?: string;
  }) => Promise<boolean>;
  currency: string;
  disconnectWhatsApp: () => Promise<boolean>;
  billingBlockReason: BillingBlockReason | null;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard requires DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authed, setAuthed] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [waStatus, setWaStatus] = useState("disconnected");
  const [bootstrapped, setBootstrapped] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [needsQr, setNeedsQr] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [businessSettingsOpen, setBusinessSettingsOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [trialStartedPopupOpen, setTrialStartedPopupOpen] = useState(false);
  const [billingBlockReason, setBillingBlockReason] =
    useState<BillingBlockReason | null>(null);
  const [billingPlan, setBillingPlan] = useState<string | null>(null);
  const [boundWhatsappNumber, setBoundWhatsappNumber] = useState<string | null>(
    null
  );

  const refreshProfile = useCallback(async () => {
    if (!hasDashboardSession()) {
      setBootstrapped(true);
      return;
    }
    try {
    const meRes = await dashboardFetch("/api/auth/me", { cache: "no-store" });
    if (meRes.ok) {
      const me = (await meRes.json()) as {
        token?: string;
        businessId?: number | null;
        user?: { name?: string | null; email?: string };
        profileComplete?: boolean;
        waStatus?: string;
        businessName?: string | null;
        businessType?: string | null;
        country?: string | null;
        currency?: string | null;
        whatsappNumber?: string | null;
        boundWhatsappNumber?: string | null;
        billing?: {
          accessAllowed?: boolean;
          blockReason?: BillingBlockReason | null;
          plan?: string | null;
        } | null;
      };
      const blockReason =
        me.billing?.accessAllowed === false && me.billing.blockReason
          ? me.billing.blockReason
          : null;
      setBillingBlockReason(blockReason);
      setBillingPlan(me.billing?.plan?.trim() || null);
      setBoundWhatsappNumber(me.boundWhatsappNumber?.trim() || null);
      if (typeof me.token === "string" && me.token.trim()) {
        setAuthToken(me.token);
      }
      setUserName(me.user?.name?.trim() || null);
      setUserEmail(me.user?.email?.trim() || "");
      setWaStatus(me.waStatus ?? "disconnected");
      setNeedsSetup(!me.businessId || !me.profileComplete);
      setNeedsQr(
        Boolean(
          me.businessId &&
            me.profileComplete &&
            (me as { needsQrModal?: boolean }).needsQrModal === true &&
            !blockReason
        )
      );
      if (me.businessId) {
        setProfile({
          businessType: me.businessType?.trim() || null,
          businessName: me.businessName?.trim() || null,
          country: me.country?.trim() || null,
          currency: me.currency?.trim() || null,
          whatsappNumber: me.whatsappNumber?.trim() || null,
          profileComplete: Boolean(me.profileComplete),
        });
        setProfileModalOpen(!me.profileComplete);
        return;
      }
    }

    const next = await fetchDashboardProfile();
    if (!next) {
      setNeedsSetup(true);
      setProfileModalOpen(true);
      return;
    }
    setProfile(next);
    setNeedsSetup(!next.profileComplete);
    setProfileModalOpen(!next.profileComplete);
    } finally {
      setBootstrapped(true);
    }
  }, []);

  useEffect(() => {
    if (!hasDashboardSession()) {
      router.replace("/sign-in");
      return;
    }
    setAuthed(true);
    void refreshProfile();
  }, [router, refreshProfile]);

  useEffect(() => {
    const onUpdate = () => void refreshProfile();
    window.addEventListener("businessProfileUpdated", onUpdate);
    return () => window.removeEventListener("businessProfileUpdated", onUpdate);
  }, [refreshProfile]);
  const disconnectWhatsApp = useCallback(async () => {
    if (!hasDashboardSession()) return false;
    try {
      const res = await dashboardFetch("/api/whatsapp/disconnect", { method: "POST" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error ?? "Could not disconnect WhatsApp.");
        return false;
      }
      setWaStatus("disconnected");
      setNeedsQr(true);
      void refreshProfile();
      toast.success("WhatsApp disconnected.");
      return true;
    } catch {
      toast.error("Network error disconnecting WhatsApp.");
      return false;
    }
  }, [refreshProfile]);

  useEffect(() => {
    if (needsQr && !needsSetup) {
      resetWhatsAppConnectPostGuard();
    }
  }, [needsQr, needsSetup]);

  useEffect(() => {
    const open = () => setBusinessSettingsOpen(true);
    window.addEventListener("openBusinessSettings", open);
    return () => window.removeEventListener("openBusinessSettings", open);
  }, []);

  useEffect(() => {
    if (bootstrapped && consumeOpenBusinessSettingsRequest()) {
      setBusinessSettingsOpen(true);
    }
  }, [bootstrapped]);

  useEffect(() => {
    if (!bootstrapped || !hasDashboardSession()) return;
    const billing = searchParams.get("billing");
    if (!billing) return;

    const run = async () => {
      if (billing === "success") {
        await dashboardFetch("/api/billing/sync", { method: "POST" });
        await refreshProfile();
        toast.success("Subscription active. Welcome back!");
      } else if (billing === "error") {
        toast.error("Could not confirm payment. Contact support if you were charged.");
      }
      router.replace("/dashboard");
    };
    void run();
  }, [bootstrapped, searchParams, router, refreshProfile]);

  const saveProfile = useCallback(
    async (payload: {
      businessName: string;
      businessType: string;
      country: string;
      currency: string;
    }) => {
      if (!hasDashboardSession()) return false;
      setProfileSaving(true);
      try {
        const setupRes = await dashboardFetch("/api/business/setup", {
          method: "POST",
          body: JSON.stringify({
            businessName: payload.businessName,
            businessType: payload.businessType,
            country: payload.country,
            currency: payload.currency,
          }),
        });
        const setupJson = (await setupRes.json().catch(() => ({}))) as {
          error?: string;
          token?: string;
        };

        if (setupRes.ok && setupJson.token) {
          setAuthToken(setupJson.token);
          setNeedsSetup(false);
          setNeedsQr(true);
          setProfile({
            businessName: payload.businessName,
            businessType: payload.businessType,
            country: payload.country,
            currency: payload.currency,
            whatsappNumber: null,
            profileComplete: true,
          });
          setProfileModalOpen(false);
          setTrialStartedPopupOpen(true);
          notifyBusinessProfileUpdated();
          toast.success("Business saved. Scan the QR code to connect WhatsApp.");
          return true;
        }

        const result = await saveDashboardProfile(payload);
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        setProfile(result.profile);
        setProfileModalOpen(!result.profile.profileComplete);
        setBusinessSettingsOpen(false);
        void refreshProfile();
        notifyBusinessProfileUpdated();
        toast.success(
          businessSettingsOpen
            ? "Business settings saved."
            : "Profile saved."
        );
        return true;
      } catch {
        toast.error("Network error.");
        return false;
      } finally {
        setProfileSaving(false);
      }
    },
    [refreshProfile, businessSettingsOpen]
  );

  const value = useMemo(
    () => ({
      profile,
      userName,
      userEmail,
      bootstrapped,
      needsSetup,
      businessType: profile?.businessType ?? null,
      currency: profile?.currency?.trim() || "PKR",
      waStatus,
      refreshProfile,
      profileSaving,
      saveProfile,
      disconnectWhatsApp,
      billingBlockReason,
    }),
    [
      profile,
      userName,
      userEmail,
      bootstrapped,
      needsSetup,
      waStatus,
      refreshProfile,
      profileSaving,
      saveProfile,
      businessSettingsOpen,
      billingBlockReason,
    ]
  );

  if (!authed) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-[#d9dbd5]">
        <BallLoader size="md" />
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={value}>
      {billingBlockReason && (
        <BillingAccessBanner blockReason={billingBlockReason} />
      )}
      <BusinessProfileModal
        open={profileModalOpen || needsSetup || businessSettingsOpen}
        variant={
          needsSetup || profileModalOpen ? "setup" : "edit"
        }
        initialBusinessName={profile?.businessName}
        initialBusinessType={profile?.businessType}
        initialCountry={profile?.country}
        initialCurrency={profile?.currency}
        saving={profileSaving}
        onClose={
          businessSettingsOpen && !needsSetup
            ? () => setBusinessSettingsOpen(false)
            : undefined
        }
        onSave={(data) => {
          void saveProfile(data);
        }}
        onDisconnectWhatsApp={
          billingPlan === "trial"
            ? undefined
            : () => {
                void disconnectWhatsApp();
              }
        }
      />
      {needsQr && !needsSetup && !billingBlockReason && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/50 p-4">
          <WhatsAppQrPanel
            key="whatsapp-qr-connect"
            boundWhatsappNumber={boundWhatsappNumber}
            onConnected={() => {
              setNeedsQr(false);
              setWaStatus("ready");
              void refreshProfile();
              toast.success("WhatsApp connected!");
            }}
          />
        </div>
      )}
      {billingBlockReason === "trial_expired" &&
        !needsSetup &&
        bootstrapped && (
          <SubscriptionRequiredModal blockReason={billingBlockReason} />
        )}
      {trialStartedPopupOpen && (
        <div className="fixed inset-0 z-[195] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#111827]">Trial started</h3>
            <p className="mt-2 text-sm text-[#4b5563]">
              Your 1-day free trial has started successfully.
            </p>
            <button
              type="button"
              onClick={() => setTrialStartedPopupOpen(false)}
              className="mt-5 w-full rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#20bd5a] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}
      {children}
    </DashboardContext.Provider>
  );
}
