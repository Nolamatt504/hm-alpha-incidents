"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile, UserProfile, canManageUsers } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const p = await getCurrentProfile();
        setProfile(p);
      }
      setLoading(false);
    }
    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await getCurrentProfile();
        setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 min-h-14 py-2 sm:py-0 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <BrandLogo />
          <span className="hidden sm:inline font-semibold text-gray-800 text-sm border-l border-gray-200 pl-2.5">
            Incident Reports
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-3 text-sm flex-shrink-0">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md text-gray-700 hover:bg-gray-100 font-medium text-xs sm:text-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/new"
                className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md text-gray-700 hover:bg-gray-100 font-medium text-xs sm:text-sm"
              >
                New Report
              </Link>
              <Link
                href="/help"
                className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md text-gray-700 hover:bg-gray-100 font-medium text-xs sm:text-sm"
              >
                Help
              </Link>
              {canManageUsers(profile) && (
                <Link
                  href="/admin"
                  className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md text-gray-700 hover:bg-gray-100 font-medium text-xs sm:text-sm"
                >
                  Admin
                </Link>
              )}
              <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
                <span className="text-xs text-gray-500 truncate max-w-[140px]">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium"
                >
                  Log out
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="sm:hidden px-2 py-1.5 text-xs text-gray-500 hover:text-red-600"
              >
                Log out
              </button>
            </>
          ) : (
            !loading && (
              <>
                <Link
                  href="/help"
                  className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md text-gray-700 hover:bg-gray-100 font-medium text-xs sm:text-sm"
                >
                  Help
                </Link>
                <Link
                  href="/login"
                  className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md bg-[#0b1f3a] text-white hover:bg-[#08182e] font-medium text-xs sm:text-sm"
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
