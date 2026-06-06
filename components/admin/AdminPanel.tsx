"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AppLogo } from "@/components/brand/AppLogo";
import { BallLoader } from "@/components/ui/BallLoader";
import {
  adminFetch,
  clearAdminSession,
  hasAdminSession,
} from "@/lib/admin-session";
import type { AdminUserRow } from "@/lib/admin-service";

type EditTarget = {
  user: AdminUserRow;
};

export function AdminPanel() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [saving, setSaving] = useState(false);

  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPlan, setFormPlan] = useState("starter");
  const [formBillingStatus, setFormBillingStatus] = useState("active");
  const [formPeriodEnd, setFormPeriodEnd] = useState("");
  const [formAiBonus, setFormAiBonus] = useState("0");
  const [formContactsBonus, setFormContactsBonus] = useState("0");
  const [formGrantDays, setFormGrantDays] = useState("30");
  const [formGrantPlan, setFormGrantPlan] = useState("starter");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/users", { cache: "no-store" });
      if (res.status === 401) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) {
        toast.error("Could not load users.");
        return;
      }
      const json = (await res.json()) as { users?: AdminUserRow[] };
      setUsers(json.users ?? []);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!hasAdminSession()) {
      router.replace("/admin/login");
      return;
    }
    void loadUsers();
  }, [loadUsers, router]);

  const openEdit = (user: AdminUserRow) => {
    setEdit({ user });
    setFormEmail(user.email);
    setFormName(user.name ?? "");
    setFormPassword("");
    const b = user.business;
    setFormPlan(b?.plan ?? "starter");
    setFormBillingStatus(b?.billingStatus ?? "trial_active");
    setFormPeriodEnd(
      b?.periodEndsAt ? b.periodEndsAt.slice(0, 16) : ""
    );
    setFormAiBonus(String(b?.quotaAiBonus ?? 0));
    setFormContactsBonus(String(b?.quotaContactsBonus ?? 0));
    setFormGrantPlan(b?.plan ?? "starter");
    setFormGrantDays("30");
  };

  const closeEdit = () => setEdit(null);

  const saveUser = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      const patch: Record<string, string | null> = {
        email: formEmail,
        name: formName.trim() || null,
      };
      if (formPassword.trim()) patch.password = formPassword;

      const res = await adminFetch(`/api/admin/users/${edit.user.userId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "Save failed");
        return;
      }

      const b = edit.user.business;
      if (b) {
        const bRes = await adminFetch(`/api/admin/businesses/${b.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            plan: formPlan,
            billingStatus: formBillingStatus,
            periodEndsAt: formPeriodEnd
              ? new Date(formPeriodEnd).toISOString()
              : null,
            quotaAiBonus: Number.parseInt(formAiBonus, 10) || 0,
            quotaContactsBonus:
              Number.parseInt(formContactsBonus, 10) || 0,
          }),
        });
        if (!bRes.ok) {
          const j = (await bRes.json()) as { error?: string };
          toast.error(j.error ?? "Business update failed");
          return;
        }
      }

      toast.success("Saved");
      closeEdit();
      await loadUsers();
    } finally {
      setSaving(false);
    }
  };

  const runBusinessAction = async (
    businessId: number,
    action: "reset-usage" | "disconnect-whatsapp" | "subscription"
  ) => {
    setSaving(true);
    try {
      let path = `/api/admin/businesses/${businessId}/${action}`;
      let body: string | undefined;
      if (action === "subscription") {
        body = JSON.stringify({
          plan: formGrantPlan,
          days: Number.parseInt(formGrantDays, 10) || 30,
          resetUsage: true,
        });
      }
      const res = await adminFetch(path, {
        method: "POST",
        body,
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "Action failed");
        return;
      }
      toast.success("Done");
      await loadUsers();
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (userId: number) => {
    if (
      !window.confirm(
        "Delete this user and their business data permanently?"
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "Delete failed");
        return;
      }
      toast.success("User deleted");
      closeEdit();
      await loadUsers();
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    clearAdminSession();
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <header className="bg-[#075E54] text-white px-4 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3 min-w-0">
          <AppLogo size="sm" className="brightness-110" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold">Admin panel</h1>
            <p className="text-xs text-white/80">Users, billing, WhatsApp, limits</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="px-3 py-1.5 rounded-lg bg-white/15 text-sm font-medium hover:bg-white/25"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={logout}
            className="px-3 py-1.5 rounded-lg bg-white text-[#075E54] text-sm font-semibold"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <BallLoader size="lg" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-600 py-8 text-center">No users yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-black/10 bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3">Business</th>
                  <th className="px-3 py-3">Plan</th>
                  <th className="px-3 py-3">AI usage</th>
                  <th className="px-3 py-3">Contacts</th>
                  <th className="px-3 py-3">WhatsApp</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.userId} className="border-t border-gray-100">
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900">{u.email}</div>
                      <div className="text-xs text-gray-500">
                        #{u.userId}
                        {u.name ? ` · ${u.name}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {u.business?.businessName ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs">
                        {u.business?.plan ?? "—"} /{" "}
                        {u.business?.billingStatus ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {u.business
                        ? `${u.business.usage.aiRepliesUsed} / ${
                            u.business.usage.aiRepliesLimit ?? "∞"
                          }`
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {u.business
                        ? `${u.business.usage.contactsUsed} / ${
                            u.business.usage.contactsLimit ?? "∞"
                          }`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 capitalize">
                      {u.business?.waStatus ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="text-[#075E54] font-semibold hover:underline"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">
              Manage {edit.user.email}
            </h2>

            <section className="mt-4 space-y-3">
              <h3 className="text-xs font-bold uppercase text-gray-500">
                Account
              </h3>
              <label className="block text-sm">
                Email
                <input
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                Name
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                New password (leave blank to keep)
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </label>
            </section>

            {edit.user.business && (
              <>
                <section className="mt-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase text-gray-500">
                    Subscription & limits
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                      Plan
                      <select
                        value={formPlan}
                        onChange={(e) => setFormPlan(e.target.value)}
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                      >
                        <option value="trial">trial</option>
                        <option value="starter">starter</option>
                        <option value="pro">pro</option>
                        <option value="enterprise">enterprise</option>
                      </select>
                    </label>
                    <label className="block text-sm">
                      Billing status
                      <select
                        value={formBillingStatus}
                        onChange={(e) =>
                          setFormBillingStatus(e.target.value)
                        }
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                      >
                        <option value="trial_active">trial_active</option>
                        <option value="trial_expired">trial_expired</option>
                        <option value="active">active</option>
                        <option value="expired">expired</option>
                        <option value="renewal_failed">renewal_failed</option>
                        <option value="checkout_pending">
                          checkout_pending
                        </option>
                      </select>
                    </label>
                  </div>
                  <label className="block text-sm">
                    Period ends (local)
                    <input
                      type="datetime-local"
                      value={formPeriodEnd}
                      onChange={(e) => setFormPeriodEnd(e.target.value)}
                      className="mt-1 w-full rounded-lg border px-3 py-2"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                      AI reply bonus
                      <input
                        type="number"
                        min={0}
                        value={formAiBonus}
                        onChange={(e) => setFormAiBonus(e.target.value)}
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                      />
                    </label>
                    <label className="block text-sm">
                      Contact bonus
                      <input
                        type="number"
                        min={0}
                        value={formContactsBonus}
                        onChange={(e) =>
                          setFormContactsBonus(e.target.value)
                        }
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                      />
                    </label>
                  </div>
                </section>

                <section className="mt-5 space-y-2">
                  <h3 className="text-xs font-bold uppercase text-gray-500">
                    Quick actions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void runBusinessAction(
                          edit.user.business!.id,
                          "reset-usage"
                        )
                      }
                      className="px-3 py-2 rounded-lg bg-blue-50 text-blue-800 text-sm font-medium"
                    >
                      Reset usage period
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void runBusinessAction(
                          edit.user.business!.id,
                          "disconnect-whatsapp"
                        )
                      }
                      className="px-3 py-2 rounded-lg bg-orange-50 text-orange-800 text-sm font-medium"
                    >
                      Disconnect WhatsApp
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 items-end pt-2">
                    <label className="text-sm">
                      Grant plan
                      <select
                        value={formGrantPlan}
                        onChange={(e) => setFormGrantPlan(e.target.value)}
                        className="mt-1 block rounded-lg border px-3 py-2"
                      >
                        <option value="trial">trial</option>
                        <option value="starter">starter</option>
                        <option value="pro">pro</option>
                        <option value="enterprise">enterprise</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      Days
                      <input
                        type="number"
                        min={1}
                        value={formGrantDays}
                        onChange={(e) => setFormGrantDays(e.target.value)}
                        className="mt-1 block w-20 rounded-lg border px-3 py-2"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void runBusinessAction(
                          edit.user.business!.id,
                          "subscription"
                        )
                      }
                      className="px-3 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold"
                    >
                      Apply subscription
                    </button>
                  </div>
                </section>
              </>
            )}

            <div className="mt-6 flex flex-wrap gap-2 justify-between">
              <button
                type="button"
                disabled={saving}
                onClick={() => void deleteUser(edit.user.userId)}
                className="px-4 py-2 rounded-lg text-red-600 border border-red-200 text-sm font-medium"
              >
                Delete user
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="px-4 py-2 rounded-lg border text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveUser()}
                  className="px-4 py-2 rounded-lg bg-[#075E54] text-white text-sm font-semibold"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
