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
        // Property admins only see users at their hotel
        if (isPropertyAdmin(profile) && profile.hotel_id) {
          list = list.filter((p) => p.hotel_id === profile.hotel_id);
        }
        setProfiles(
          list.map((p) => ({
            ...p,
            is_active: p.is_active !== false,
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

    // Property admins cannot assign corporate_admin or change hotel away from theirs
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
              ? "Manage all users across every hotel. Assign roles and hotels, or deactivate accounts."
              : "Manage users at your property. Assign roles or deactivate accounts when someone leaves."}
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isCorp ? 4 : 3}
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
                          disabled={savingId === p.id || p.id === currentUser?.id}
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
                              savingId === p.id || p.role === "corporate_admin"
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
                        <button
                          type="button"
                          disabled={
                            savingId === p.id || p.id === currentUser?.id
                          }
                          onClick={() =>
                            updateProfile(p.id, { is_active: !p.is_active })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 ${
                            p.is_active
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                        >
                          {p.is_active ? "Active" : "Deactivated"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <p>Changes save automatically when you change a dropdown or status.</p>
          <p>
            <strong>Deactivated</strong> users cannot log in. Use this when
            someone leaves the company.
          </p>
          {!isCorp && (
            <p>
              New users create their own account first. After they sign up,
              Corporate can assign them to your hotel, or you can manage them
              once they appear here.
            </p>
          )}
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
