"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile, isCorporate, UserProfile } from "@/lib/auth";
import {
  Hotel,
  Incident,
  IncidentType,
  INCIDENT_TYPE_LABELS,
  SEVERITY_LABELS,
} from "@/types/incident";

function ArchivesContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filterHotel, setFilterHotel] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      const userProfile = await getCurrentProfile();
      setProfile(userProfile);

      if (!userProfile || !isCorporate(userProfile)) {
        router.replace("/dashboard");
        return;
      }

      const [incRes, hotelsRes] = await Promise.all([
        supabase
          .from("incidents")
          .select(`*, hotel:hotels ( id, name, city, state )`)
          .not("archived_at", "is", null)
          .order("archived_at", { ascending: false }),
        supabase
          .from("hotels")
          .select("id, name, city, state")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (incRes.error) {
        setError("Could not load archives. " + incRes.error.message);
      } else {
        setIncidents((incRes.data as Incident[]) || []);
      }
      if (hotelsRes.data) setHotels(hotelsRes.data);
      setIsLoading(false);
    }

    load();
  }, [router]);

  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      if (filterHotel && i.hotel_id !== filterHotel) return false;
      if (filterType && i.incident_type !== filterType) return false;
      return true;
    });
  }, [incidents, filterHotel, filterType]);

  async function restore(incident: Incident) {
    setSavingId(incident.id);
    setError(null);
    const { error: updateError } = await supabase
      .from("incidents")
      .update({
        archived_at: null,
        archived_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", incident.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setIncidents((prev) => prev.filter((p) => p.id !== incident.id));
    }
    setSavingId(null);
  }

  function exportCSV() {
    const headers = [
      "Report #",
      "Hotel",
      "Type",
      "Severity",
      "Status",
      "Incident Date",
      "Archived",
      "Submitted by",
      "Narrative",
    ];
    const rows = filtered.map((i) => [
      i.report_number,
      i.hotel?.name || "",
      INCIDENT_TYPE_LABELS[i.incident_type],
      SEVERITY_LABELS[i.severity],
      i.status,
      new Date(i.incident_date_time).toLocaleString(),
      i.archived_at ? new Date(i.archived_at).toLocaleString() : "",
      i.reported_by_name || "",
      (i.narrative || "").replace(/"/g, '""'),
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${String(cell)}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incident-archives-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Archives
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Corporate only. Archived reports are hidden from hotel dashboards.
              {isLoading ? "" : ` ${filtered.length} shown.`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Export CSV
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Hotel
              </label>
              <select
                value={filterHotel}
                onChange={(e) => setFilterHotel(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm bg-white"
              >
                <option value="">All hotels</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm bg-white"
              >
                <option value="">All types</option>
                {(Object.keys(INCIDENT_TYPE_LABELS) as IncidentType[]).map(
                  (t) => (
                    <option key={t} value={t}>
                      {INCIDENT_TYPE_LABELS[t]}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
            Loading archives…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center shadow-sm">
            <p className="font-medium text-gray-900">No archived reports</p>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Open a report and choose Archive. It leaves the live dashboard and
              shows up here.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 sm:hidden">
              {filtered.map((incident) => (
                <div
                  key={incident.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {incident.report_number}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {incident.hotel?.name || "—"}
                      </p>
                    </div>
                    <StatusBadge status={incident.status} />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {INCIDENT_TYPE_LABELS[incident.incident_type]} ·{" "}
                    {incident.archived_at
                      ? `Archived ${new Date(
                          incident.archived_at
                        ).toLocaleDateString()}`
                      : ""}
                  </p>
                  <div className="mt-3 flex gap-3">
                    <Link
                      href={`/reports/${incident.id}`}
                      className="text-sm font-medium text-[#0b1f3a]"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      disabled={savingId === incident.id}
                      onClick={() => restore(incident)}
                      className="text-sm font-medium text-gray-700 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Report #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Hotel
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Archived
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((incident) => (
                    <tr key={incident.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {incident.report_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {incident.hotel?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {INCIDENT_TYPE_LABELS[incident.incident_type]}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {incident.archived_at
                          ? new Date(incident.archived_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-right space-x-3">
                        <Link
                          href={`/reports/${incident.id}`}
                          className="font-medium text-[#0b1f3a]"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          disabled={savingId === incident.id}
                          onClick={() => restore(incident)}
                          className="font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function ArchivesPage() {
  return (
    <RequireAuth>
      <ArchivesContent />
    </RequireAuth>
  );
}
