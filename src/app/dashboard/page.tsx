"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile, UserProfile, isCorporate } from "@/lib/auth";
import {
  Incident,
  IncidentType,
  IncidentStatus,
  INCIDENT_TYPE_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  Hotel,
} from "@/types/incident";

function DashboardContent() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterHotel, setFilterHotel] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      const userProfile = await getCurrentProfile();
      setProfile(userProfile);

      let query = supabase
        .from("incidents")
        .select(`*, hotel:hotels ( id, name, city, state )`)
        .order("created_at", { ascending: false });

      if (userProfile && !isCorporate(userProfile) && userProfile.hotel_id) {
        query = query.eq("hotel_id", userProfile.hotel_id);
      }

      const [incRes, hotelsRes] = await Promise.all([
        query,
        supabase.from("hotels").select("id, name, city, state").eq("is_active", true).order("name"),
      ]);

      if (incRes.error) {
        setError("Could not load reports. " + incRes.error.message);
      } else {
        setIncidents((incRes.data as any) || []);
      }

      if (hotelsRes.data) setHotels(hotelsRes.data);

      setIsLoading(false);
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      if (filterStatus && i.status !== filterStatus) return false;
      if (filterType && i.incident_type !== filterType) return false;
      if (filterHotel && i.hotel_id !== filterHotel) return false;
      if (filterFrom) {
        const d = new Date(i.incident_date_time);
        if (d < new Date(filterFrom)) return false;
      }
      if (filterTo) {
        const d = new Date(i.incident_date_time);
        const to = new Date(filterTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    });
  }, [incidents, filterStatus, filterType, filterHotel, filterFrom, filterTo]);

  function exportCSV() {
    const headers = [
      "Report #",
      "Hotel",
      "Type",
      "Severity",
      "Status",
      "Incident Date",
      "Location",
      "Subject",
      "Narrative",
    ];
    const rows = filtered.map((i) => [
      i.report_number,
      (i as any).hotel?.name || "",
      INCIDENT_TYPE_LABELS[i.incident_type],
      SEVERITY_LABELS[i.severity],
      STATUS_LABELS[i.status],
      new Date(i.incident_date_time).toLocaleString(),
      i.location_detail || "",
      i.subject_name || "",
      (i.narrative || "").replace(/"/g, '""'),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell)}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incident-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setFilterStatus("");
    setFilterType("");
    setFilterHotel("");
    setFilterFrom("");
    setFilterTo("");
  }

  const hasFilters = filterStatus || filterType || filterHotel || filterFrom || filterTo;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Incident Reports</h1>
            <p className="mt-1 text-sm text-gray-500">
              {isLoading
                ? "Loading…"
                : `Showing ${filtered.length} of ${incidents.length} report${incidents.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Export CSV
            </button>
            <Link
              href="/new"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm font-medium hover:bg-gray-50"
            >
              + New Report
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm"
              >
                <option value="">All statuses</option>
                {(Object.keys(STATUS_LABELS) as IncidentStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm"
              >
                <option value="">All types</option>
                {(Object.keys(INCIDENT_TYPE_LABELS) as IncidentType[]).map((t) => (
                  <option key={t} value={t}>{INCIDENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            {isCorporate(profile) && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hotel</label>
                <select
                  value={filterHotel}
                  onChange={(e) => setFilterHotel(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm"
                >
                  <option value="">All hotels</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From date</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To date</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm"
              />
            </div>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-sm text-[#0b1f3a] hover:text-[#08182e] font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Summary cards based on filtered */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{filtered.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Submitted</p>
              <p className="text-2xl font-semibold text-[#0b1f3a]">
                {filtered.filter((i) => i.status === "submitted").length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Under Review</p>
              <p className="text-2xl font-semibold text-yellow-600">
                {filtered.filter((i) => i.status === "under_review").length}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Closed</p>
              <p className="text-2xl font-semibold text-green-600">
                {filtered.filter((i) => i.status === "closed").length}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center text-gray-500">Loading reports…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="font-medium">No reports match your filters</p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-2 text-sm text-[#0b1f3a] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
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
                      Submitted by
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
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((incident) => (
                    <tr key={incident.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900">
                        {incident.report_number}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                        {(incident as any).hotel?.name || "—"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                        {incident.reported_by_name || "—"}
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
                      <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm">
                        <Link
                          href={`/reports/${incident.id}`}
                          className="text-[#0b1f3a] hover:text-[#08182e] font-medium"
                        >
                          View
                        </Link>
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
