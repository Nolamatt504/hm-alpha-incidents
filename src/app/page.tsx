"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import BrandLogo from "@/components/BrandLogo";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setSignedIn(!!user);
      setReady(true);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1 px-4 py-10 sm:py-14">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <BrandLogo />
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
              HM Alpha Incident Reporting
            </h1>
            <p className="mt-3 text-sm text-gray-600 max-w-xl mx-auto">
              File guest and workplace incidents in about a minute. Records are
              confidential. After submit, only the submitter, Property HR, and
              Hotel Admin at that hotel can see them until Hotel Admin sends
              the report to Corporate.
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            {!ready ? null : signedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#0b1f3a] text-white font-medium hover:bg-[#08182e] transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/new"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  New Report
                </Link>
                <Link
                  href="/help"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Help
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#0b1f3a] text-white font-medium hover:bg-[#08182e] transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/help"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Help
                </Link>
              </>
            )}
          </div>

          <ol className="mt-10 bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6 space-y-3">
            <li className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              60-second file path
            </li>
            <li className="text-sm text-gray-800">
              <span className="font-semibold text-[#0b1f3a]">1.</span> Sign in
              with your work email.
            </li>
            <li className="text-sm text-gray-800">
              <span className="font-semibold text-[#0b1f3a]">2.</span> Open{" "}
              <strong>New Report</strong> on your phone or computer.
            </li>
            <li className="text-sm text-gray-800">
              <span className="font-semibold text-[#0b1f3a]">3.</span> Describe
              what happened <em>and</em> what staff did (first aid, photos, EMS,
              medical refused). Document while it is fresh.
            </li>
            <li className="text-sm text-gray-800">
              <span className="font-semibold text-[#0b1f3a]">4.</span> Submit.
              Hotel Admin and Property HR can see it. Corporate is notified
              only after Hotel Admin sends it up. Save a draft if you need a
              minute.
            </li>
          </ol>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">Submitter</p>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                File reports for your assigned hotel. See your own reports.
                Cannot change status or users.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">Hotel Admin</p>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                Full access for one property: review, notes, status, send to
                Corporate, and managing users at that hotel. Property HR can
                review but cannot send to Corporate or manage users.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">Corporate</p>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                Sees a report after Hotel Admin sends it up. Portfolio
                Overview of those reports, Archives, and the audit trail.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Confidential. Do not print, screenshot, or share reports outside
            authorized HM Alpha staff.
          </p>

          <p className="mt-8 text-center text-xs text-gray-400">
            Built for HM Alpha Hotels &amp; Resorts · hmalpha.com
          </p>
        </div>
      </div>
    </div>
  );
}
