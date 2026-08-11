"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";
import {
  getCurrentProfile,
  UserProfile,
  isCorporate,
  isPropertyAdmin,
  canManageUsers,
  UserRole,
} from "@/lib/auth";
import { Hotel } from "@/types/incident";

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  hotel_id: string | null;
  is_active: boolean;
}

function AdminContent() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const profile = await getCurrentProfile();
      setCurrentUser(profile);

      if (!profile || !canManageUsers(profile)) {
        router.replace("/dashboard");
        return;
      }

      const [profilesRes, hotelsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, role, hotel_id, is_active")
          .order("email"),
        supabase
          .from("hotels")
          .select("id, name, city, state")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (profilesRes.error) {
        setError(profilesRes.error.message);
      } else {
        let list = (profilesRes.data as ProfileRow[]) || [];
        if (isPropertyAdmin(profile) && profile.hotel_id) {
          list = list.filter((p) => p.hotel_id === profile.hotel_id);
        }
        setProfiles(
          list
            .filter((p) => p.is_active !== false)
            .map((p) => ({
              ...p,
              is_active: true,
            }))
        );
      }

      if (hotelsRes.data) {
        setHotels(hotelsRes.data);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  async function updateProfile(
    id: string,
    updates: Partial<Pick<ProfileRow, "role" | "hotel_id" | "is_active">>
  ) {
    setSavingId(id);
    setMessage(null);
    setError(null);

    if (currentUser && isPropertyAdmin(currentUser)) {
      if (updates.role === "corporate_admin") {
        setError("Property Admins cannot assign Corporate Admin role.");
        setSavingId(null);
        return;
      }
      if (updates.hotel_id && updates.hotel_id !== currentUser.hotel_id) {
        setError("You can only assign users to your own hotel.");
        setSavingId(null);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
      setMessage("Saved");
      setTimeout(() => setMessage(null), 2000);
    }

    setSavingId(null);
  }

  async function removeUser(p: ProfileRow) {
    if (p.id === currentUser?.id) {
      setError("You cannot remove your own account.");
      return;
    }

    if (
      currentUser &&
      isPropertyAdmin(currentUser) &&
      p.role === "corporate_admin"
    ) {
      setError("Property Admins cannot remove Corporate Admins.");
      return;
    }

    const label = p.full_name || p.email || "this user";
    const confirmed = window.confirm(
      `Remove ${label}?\n\nThey will no longer be able to sign in. You can do this when someone leaves the company.`
    );
    if (!confirmed) return;

    setSavingId(p.id);
    setMessage(null);
    setError(null);

    // Soft-remove: deactivate and clear hotel so they cannot access the system
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        is_active: false,
        hotel_id: null,
      })
      .eq("id", p.id);

    if (updateError) {
      setError(updateError.message);
      setSavingId(null);
      return;
    }

    // Remove from the admin list permanently (no restore in UI)
    setProfiles((prev) => prev.filter((x) => x.id !== p.id));

    setMessage(
      `${label} has been removed and can no longer sign in. If they need access later, they must create a new account.`
    );
    setTimeout(() => setMessage(null), 3000);
    setSavingId(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20 text-gray-500">
          Loading…
        </div>
      </div>
    );
  }

  const isCorp = isCorporate(currentUser);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">User Admin</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isCorp
              ? "Manage all users across every hotel. Assign roles and hotels, or remove accounts when someone leaves."
              : "Manage users at your property. Assign roles or remove accounts when someone leaves."}
          </p>
        </div>

        {message && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  {isCorp && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hotel
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isCorp ? 5 : 4}
                      className="px-4 py-8 text-center text-gray-500 text-sm"
                    >
                      No users found yet.
                      {!isCorp &&
                        " Users appear here after they create an account and are assigned to your hotel."}
                    </td>
                  </tr>
                ) : (
                  profiles.map((p) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50 ${
                        !p.is_active ? "opacity-60" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="text-sm font-medium text-gray-900">
                          {p.full_name || "—"}
                        </div>
                        <div className="text-xs text-gray-500">{p.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          value={p.role}
                          disabled={
                            savingId === p.id ||
                            p.id === currentUser?.id ||
                            !p.is_active
                          }
                          onChange={(e) =>
                            updateProfile(p.id, {
                              role: e.target.value as UserRole,
                            })
                          }
                          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a] disabled:opacity-50"
                        >
                          <option value="submitter">Submitter</option>
                          <option value="property_admin">Property Admin</option>
                          {isCorp && (
                            <option value="corporate_admin">
                              Corporate Admin
                            </option>
                          )}
                        </select>
                      </td>
                      {isCorp && (
                        <td className="px-4 py-3.5">
                          <select
                            value={p.hotel_id || ""}
                            disabled={
                              savingId === p.id ||
                              p.role === "corporate_admin" ||
                              !p.is_active
                            }
                            onChange={(e) =>
                              updateProfile(p.id, {
                                hotel_id: e.target.value || null,
                              })
                            }
                            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a] disabled:opacity-50 min-w-[180px]"
                          >
                            <option value="">— No hotel —</option>
                            {hotels.map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.name}
                              </option>
                            ))}
                          </select>
                          {p.role === "corporate_admin" && (
                            <p className="text-xs text-gray-400 mt-1">
                              Sees all hotels
                            </p>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${
                            p.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {p.is_active ? "Active" : "Removed"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {p.id !== currentUser?.id && p.is_active && (
                          <button
                            type="button"
                            disabled={savingId === p.id}
                            onClick={() => removeUser(p)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <p>
            <strong>Remove</strong> permanently blocks sign-in for that account.
            If they need access again, they must create a new account.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth>
      <AdminContent />
    </RequireAuth>
  );
}
