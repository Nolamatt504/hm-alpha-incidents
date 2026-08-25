"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getCurrentProfile,
  UserProfile,
  canManageUsers,
  isCorporate,
  ROLE_LABELS,
} from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

const navLink =
  "px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md text-gray-700 hover:bg-gray-100 font-medium text-xs sm:text-sm whitespace-nowrap";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hotelName, setHotelName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile(nextUser: User | null) {
      if (!nextUser) {
        setProfile(null);
        setHotelName(null);
        return;
      }
      const p = await getCurrentProfile();
      setProfile(p);
      if (p?.hotel_id) {
        const { data } = await supabase
          .from("hotels")
          .select("name")
          .eq("id", p.hotel_id)
          .single();
        setHotelName(data?.name ?? null);
      } else {
        setHotelName(null);
      }
    }

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      await loadProfile(user);
      setLoading(false);
    }
    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      await loadProfile(nextUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const roleLabel = profile ? ROLE_LABELS[profile.role] : null;
  const archivesActive = pathname === "/archives";

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 min-h-14 py-2 sm:py-0 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2.5 min-w-0 shrink-0">
          <BrandLogo />
          <span className="hidden sm:inline font-semibold text-gray-800 text-sm border-l border-gray-200 pl-2.5">
            Incident Reports
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-2 text-sm min-w-0 overflow-x-auto">
          {user ? (
            <>
              <Link href="/dashboard" className={navLink}>
                Dashboard
              </Link>
              {isCorporate(profile) && (
                <Link
                  href="/archives"
                  className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md font-medium text-xs sm:text-sm whitespace-nowrap ${
                    archivesActive
                      ? "bg-[#0b1f3a] text-white"
                      : "border border-[#0b1f3a] text-[#0b1f3a] hover:bg-slate-50"
                  }`}
                >
                  Archives
                </Link>
              )}
              <Link href="/new" className={navLink}>
                New Report
              </Link>
              <Link href="/help" className={`${navLink} hidden md:inline-flex`}>
                Help
              </Link>
              {canManageUsers(profile) && (
                <Link href="/admin" className={navLink}>
                  Admin
                </Link>
              )}
              <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 shrink-0">
                <div className="text-right leading-tight min-w-0">
                  {roleLabel && (
                    <p className="text-xs font-medium text-gray-700 truncate max-w-[160px]">
                      {roleLabel}
                    </p>
                  )}
                  {hotelName && (
                    <p className="text-[11px] text-gray-500 truncate max-w-[160px]">
                      {hotelName}
                    </p>
                  )}
                  <p className="hidden md:block text-[11px] text-gray-400 truncate max-w-[160px]">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium"
                >
                  Log out
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="sm:hidden px-2 py-1.5 text-xs text-gray-500 hover:text-red-600 shrink-0"
              >
                Log out
              </button>
            </>
          ) : (
            !loading && (
              <>
                <Link href="/help" className={navLink}>
                  Help
                </Link>
                <Link
                  href="/login"
                  className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md bg-[#0b1f3a] text-white hover:bg-[#08182e] font-medium text-xs sm:text-sm whitespace-nowrap"
                >
                  Sign In
                </Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
