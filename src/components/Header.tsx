"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile, UserProfile, isCorporate } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            HM
          </div>
          <span className="font-semibold text-gray-900 text-sm sm:text-base">
            Alpha Incident Reports
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-3 text-sm">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-md text-gray-700 hover:bg-gray-100 font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/new"
                className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium"
              >
                New Report
              </Link>
              {isCorporate(profile) && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-md text-gray-700 hover:bg-gray-100 font-medium"
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
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium"
              >
                Sign In
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
