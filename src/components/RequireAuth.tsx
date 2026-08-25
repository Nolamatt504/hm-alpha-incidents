"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "@/components/Header";
import IdleTimeout from "@/components/IdleTimeout";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/auth";

function isInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const next =
          pathname && isInternalPath(pathname) ? pathname : "/dashboard";
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        setChecking(false);
        return;
      }

      const profile = await getCurrentProfile();

      if (!profile) {
        await supabase.auth.signOut();
        router.replace("/login?reason=noprofile");
        setChecking(false);
        return;
      }

      if (profile.is_active === false) {
        await supabase.auth.signOut();
        router.replace("/login?reason=deactivated");
        setChecking(false);
        return;
      }

      setAllowed(true);
      setChecking(false);
    }

    check();
  }, [router, pathname]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-24">
          <div
            className="h-9 w-9 rounded-full border-2 border-gray-200 border-t-[#0b1f3a] animate-spin"
            aria-label="Loading"
          />
        </div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <>
      <IdleTimeout />
      {children}
    </>
  );
}
