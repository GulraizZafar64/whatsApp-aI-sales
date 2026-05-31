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
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { BusinessProfileModal } from "@/components/business/BusinessProfileModal";
import {
  fetchDashboardProfile,
  saveDashboardProfile,
  type DashboardProfile,
} from "@/lib/dashboard/profile";
import {
  hasDashboardSession,
  notifyBusinessProfileUpdated,
} from "@/lib/dashboard/session";

type DashboardContextValue = {
  profile: DashboardProfile | null;
  businessType: string | null;
  refreshProfile: () => Promise<void>;
  profileSaving: boolean;
  saveProfile: (payload: {
    businessName: string;
    businessType: string;
    country: string;
  }) => Promise<boolean>;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard requires DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!hasDashboardSession()) return;
    const next = await fetchDashboardProfile();
    if (!next) return;
    setProfile(next);
    setProfileModalOpen(!next.profileComplete);
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

  const saveProfile = useCallback(
    async (payload: {
      businessName: string;
      businessType: string;
      country: string;
    }) => {
      if (!hasDashboardSession()) return false;
      setProfileSaving(true);
      try {
        const result = await saveDashboardProfile(payload);
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        setProfile(result.profile);
        setProfileModalOpen(!result.profile.profileComplete);
        notifyBusinessProfileUpdated();
        toast.success("Profile saved.");
        return true;
      } catch {
        toast.error("Network error.");
        return false;
      } finally {
        setProfileSaving(false);
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      profile,
      businessType: profile?.businessType ?? null,
      refreshProfile,
      profileSaving,
      saveProfile,
    }),
    [profile, refreshProfile, profileSaving, saveProfile]
  );

  if (!authed) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-[#d9dbd5]">
        <div className="animate-spin h-8 w-8 border-4 border-[#075E54] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={value}>
      <BusinessProfileModal
        open={profileModalOpen}
        initialBusinessName={profile?.businessName}
        initialBusinessType={profile?.businessType}
        initialCountry={profile?.country}
        whatsappNumber={profile?.whatsappNumber}
        saving={profileSaving}
        onSave={(data) => {
          void saveProfile(data);
        }}
      />
      {children}
    </DashboardContext.Provider>
  );
}
