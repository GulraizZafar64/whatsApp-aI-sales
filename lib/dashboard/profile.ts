import { dashboardFetch } from "@/lib/dashboard/session";

export type DashboardProfile = {
  businessType: string | null;
  businessName: string | null;
  country: string | null;
  whatsappNumber: string | null;
  profileComplete: boolean;
};

export async function fetchDashboardProfile(): Promise<DashboardProfile | null> {
  const res = await dashboardFetch("/api/business/profile", {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    businessType?: string;
    businessName?: string;
    country?: string;
    whatsappNumber?: string;
    profileComplete?: boolean;
  };
  return {
    businessType: j.businessType?.trim() || null,
    businessName: j.businessName?.trim() || null,
    country: j.country?.trim() || null,
    whatsappNumber: j.whatsappNumber?.trim() || null,
    profileComplete: Boolean(j.profileComplete),
  };
}

export async function saveDashboardProfile(payload: {
  businessName: string;
  businessType: string;
  country: string;
}): Promise<{ ok: true; profile: DashboardProfile } | { ok: false; error: string }> {
  const res = await dashboardFetch("/api/business/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const j = (await res.json().catch(() => ({}))) as {
    error?: string;
    businessType?: string;
    businessName?: string;
    country?: string;
    whatsappNumber?: string;
    profileComplete?: boolean;
  };
  if (!res.ok) {
    return {
      ok: false,
      error: typeof j.error === "string" ? j.error : "Could not save profile.",
    };
  }
  return {
    ok: true,
    profile: {
      businessType: j.businessType?.trim() || payload.businessType,
      businessName: j.businessName?.trim() || payload.businessName,
      country: j.country?.trim() || payload.country,
      whatsappNumber: j.whatsappNumber?.trim() || null,
      profileComplete: Boolean(j.profileComplete),
    },
  };
}
