"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile, UserProfile, isCorporate } from "@/lib/auth";
import {
  Incident,
  INCIDENT_TYPE_LABELS,
  SEVERITY_LABELS,
} from "@/types/incident";

function DashboardContent() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      const userProfile = await getCurrentProfile();
      setProfile(userProfile);

      let query = supabase
        .from("incidents")
        .select(`
          *,
          hotel:hotels ( id, name, city, state )
        `)
        .order("created_at", { ascending: false });

      // Property users only see their hotel (RLS also enforces this)
      if (userProfile && !isCorporate(userProfile) && userProfile.hotel_id) {
        query = query.eq("hotel_id", userProfile.hotel_id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error(fetchError);
        setError("Could not load reports. " + fetchError.message);
      } else {
        setIncidents((data as any) || []);
      }
      setIsLoading(false);
    }

    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Incident Reports</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isLoading
                ? "Loading…"
                : isCorporate(profile)
                ? `Showing all reports (${incidents.length})`
                : `Showing reports for your property (${incidents.length})`}
            </p>
          </div>
          <Link
            href="/new"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            + New Report
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{incidents.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Submitted</p>
              <p className="text-2xl font-semibold text-blue-600">
                {incidents.filter((i) => i.status === "submitted").length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Under Review</p>
              <p className="text-2xl font-semibold text-yellow-600">
                {incidents.filter((i) => i.status === "under_review").length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Closed</p>
              <p className="text-2xl font-semibold text-green-600">
                {incidents.filter((i) => i.status === "closed").length}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center text-gray-500">Loading reports…</div>
            ) : incidents.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="font-medium">No reports yet</p>
                <p className="mt-1 text-sm">
                  <Link href="/new" className="text-blue-600 hover:underline">
                    Create the first incident report
                  </Link>
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hotel
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900">
                        {incident.report_number}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                        {(incident as any).hotel?.name || "—"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                        {INCIDENT_TYPE_LABELS[incident.incident_type]}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                        {new Date(incident.incident_date_time).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700 capitalize">
                        {SEVERITY_LABELS[incident.severity]}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={incident.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
