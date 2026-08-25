"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const IDLE_MS = 15 * 60 * 1000; // 15 minutes
const WARN_MS = 14 * 60 * 1000; // 14 minutes

/**
 * Signs the user out after 15 minutes with no mouse, keyboard, touch, or scroll activity.
 * Shows a 1-minute warning at 14 minutes.
 */
export default function IdleTimeout() {
  const router = useRouter();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const logout = useCallback(async () => {
    setShowWarning(false);
    await supabase.auth.signOut();
    router.replace("/login?reason=idle");
    router.refresh();
  }, [router]);

  const resetTimer = useCallback(() => {
    setShowWarning(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    warnTimerRef.current = setTimeout(() => setShowWarning(true), WARN_MS);
    idleTimerRef.current = setTimeout(() => {
      logout();
    }, IDLE_MS);
  }, [logout]);

  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ] as const;

    resetTimer();
    events.forEach((e) =>
      window.addEventListener(e, resetTimer, { passive: true })
    );

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [resetTimer]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="idle-warning-title"
        className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6"
      >
        <p
          id="idle-warning-title"
          className="text-gray-900 font-semibold text-base"
        >
          You&apos;ll be signed out in 1 minute
        </p>
        <p className="text-sm text-gray-500 mt-2">
          For security, we sign you out after 15 minutes of inactivity.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={resetTimer}
            className="flex-1 min-h-11 px-4 py-2.5 rounded-lg bg-[#0b1f3a] text-white text-sm font-medium hover:bg-[#08182e]"
          >
            Stay signed in
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex-1 min-h-11 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
