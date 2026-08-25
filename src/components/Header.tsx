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

const mobileLink =
  "block px-3 py-3 rounded-md text-gray-800 hover:bg-gray-100 font-medium text-sm";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hotelName, setHotelName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const roleLabel = profile ? ROLE_LABELS[profile.role] : null;
  const archivesActive = pathname === "/archives";
  const overviewActive = pathname === "/overview";
  const corporate = isCorporate(profile);

  const archivesClass = (mobile: boolean) =>
    mobile
      ? `block mx-1 my-1 px-3 py-3 rounded-md font-medium text-sm text-center ${
          archivesActive
            ? "bg-[#0b1f3a] text-white"
            : "border border-[#0b1f3a] text-[#0b1f3a] hover:bg-slate-50"
        }`
      : `px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-md font-medium text-xs sm:text-sm whitespace-nowrap ${
          archivesActive
            ? "bg-[#0b1f3a] text-white"
            : "border border-[#0b1f3a] text-[#0b1f3a] hover:bg-slate-50"
        }`;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 min-h-14 py-2 sm:py-0 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2.5 min-w-0 shrink-0">
          <BrandLogo />
          <span className="hidden sm:inline font-semibold text-gray-800 text-sm border-l border-gray-200 pl-2.5">
            Incident Reports
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 lg:gap-2 text-sm min-w-0">
          {user ? (
            <>
              <Link href="/dashboard" className={navLink}>
                Dashboard
              </Link>
              {corporate && (
                <Link
                  href="/overview"
                  className={`${navLink} ${
                    overviewActive ? "bg-gray-100 text-[#0b1f3a]" : ""
                  }`}
                >
                  Overview
                </Link>
              )}
              {corporate && (
                <Link href="/archives" className={archivesClass(false)}>
                  Archives
                </Link>
              )}
              <Link href="/new" className={navLink}>
                New Report
              </Link>
              <Link href="/help" className={navLink}>
                Help
              </Link>
              {canManageUsers(profile) && (
                <Link href="/admin" className={navLink}>
                  Admin
                </Link>
              )}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 shrink-0">
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
                  <p className="hidden lg:block text-[11px] text-gray-400 truncate max-w-[160px]">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium"
                >
                  Log out
                </button>
              </div>
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

        <div className="flex md:hidden items-center gap-2 shrink-0">
          {user ? (
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="p-2 rounded-md text-[#0b1f3a] hover:bg-gray-100"
            >
              {menuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6"
                  aria-hidden
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          ) : (
            !loading && (
              <>
                <Link href="/help" className="px-2 py-1.5 text-xs font-medium text-gray-700">
                  Help
                </Link>
                <Link
                  href="/login"
                  className="px-3 py-2 rounded-md bg-[#0b1f3a] text-white hover:bg-[#08182e] font-medium text-xs whitespace-nowrap"
                >
                  Sign In
                </Link>
              </>
            )
          )}
        </div>
      </div>

      {user && menuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <nav className="max-w-6xl mx-auto px-3 py-2 flex flex-col pb-6">
            <Link
              href="/dashboard"
              className={mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              Dashboard
            </Link>
            {corporate && (
              <Link
                href="/overview"
                className={mobileLink}
                onClick={() => setMenuOpen(false)}
              >
                Overview
              </Link>
            )}
            {corporate && (
              <Link
                href="/archives"
                className={archivesClass(true)}
                onClick={() => setMenuOpen(false)}
              >
                Archives
              </Link>
            )}
            <Link
              href="/new"
              className={mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              New Report
            </Link>
            <Link
              href="/help"
              className={mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              Help
            </Link>
            {canManageUsers(profile) && (
              <Link
                href="/admin"
                className={mobileLink}
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </Link>
            )}
            <div className="mt-2 px-3 py-3 border-t border-gray-200">
              {roleLabel && (
                <p className="text-sm font-medium text-gray-800">{roleLabel}</p>
              )}
              {hotelName && (
                <p className="text-xs text-gray-500 mt-0.5">{hotelName}</p>
              )}
              {user.email && (
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {user.email}
                </p>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
              >
                Log out
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
