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

  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterHotel, setFilterHotel] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const needsHotel =
    !!profile && !isCorporate(profile) && !profile.hotel_id;

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      const userProfile = await getCurrentProfile();
      setProfile(userProfile);

      if (!userProfile) {
        setIncidents([]);
        setIsLoading(false);
        return;
      }

      if (!isCorporate(userProfile) && !userProfile.hotel_id) {
        setIncidents([]);
        setHotels([]);
        setIsLoading(false);
        return;
      }

      let query = supabase
        .from("incidents")
        .select(`*, hotel:hotels ( id, name, city, state )`)
        .order("created_at", { ascending: false });

      if (!isCorporate(userProfile) && userProfile.hotel_id) {
        query = query.eq("hotel_id", userProfile.hotel_id);
      }

      const [incRes, hotelsRes] = await Promise.all([
        query,
        supabase
          .from("hotels")
          .select("id, name, city, state")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (incRes.error) {
        setError("Could not load reports. " + incRes.error.message);
      } else {
        setIncidents((incRes.data as Incident[]) || []);
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
  }, [
    incidents,
    filterStatus,
    filterType,
    filterHotel,
    filterFrom,
    filterTo,
  ]);

  const drafts = useMemo(
    () => filtered.filter((i) => i.status === "draft"),
    [filtered]
  );
  const activeReports = useMemo(
    () => filtered.filter((i) => i.status !== "draft"),
    [filtered]
  );

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
      "Submitted by",
      "Narrative",
    ];
    const rows = filtered.map((i) => [
      i.report_number,
      i.hotel?.name || "",
      INCIDENT_TYPE_LABELS[i.incident_type],
      SEVERITY_LABELS[i.severity],
      STATUS_LABELS[i.status],
      new Date(i.incident_date_time).toLocaleString(),
      i.location_detail || "",
      i.subject_name || "",
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

  const hasFilters =
    filterStatus || filterType || filterHotel || filterFrom || filterTo;

  function ReportActions({ incident }: { incident: Incident }) {
    if (incident.status === "draft") {
      return (
        <Link
          href={`/new?draft=${incident.id}`}
          className="text-[#0b1f3a] hover:text-[#08182e] font-medium"
        >
          Continue
        </Link>
      );
    }
    return (
      <Link
        href={`/reports/${incident.id}`}
        className="text-[#0b1f3a] hover:text-[#08182e] font-medium"
      >
        View
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Incident Reports
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isLoading
                ? "Loading…"
                : needsHotel
                ? "Hotel not assigned"
                : isCorporate(profile)
                ? `All properties · ${filtered.length} shown`
                : `Your property · ${filtered.length} shown`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={exportCSV}
              disabled={filtered.length === 0 || needsHotel}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Export CSV
            </button>
            <Link
              href="/new"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-[#0b1f3a] text-white text-sm font-medium hover:bg-[#08182e]"
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

        {needsHotel && !isLoading ? (
          <div className="bg-white rounded-xl border border-amber-200 p-10 sm:p-12 text-center shadow-sm">
            <p className="font-medium text-gray-900">Hotel not assigned yet</p>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Your account is not linked to a hotel, so reports are not shown
              here. Contact your Hotel Admin or Corporate Admin so they can
              assign you on the Admin page.
            </p>
          </div>
        ) : (
          <>
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Filters
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm bg-white"
              >
                <option value="">All statuses</option>
                {(Object.keys(STATUS_LABELS) as IncidentStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
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
            {isCorporate(profile) && (
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
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                From date
              </label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                To date
              </label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-2 text-sm bg-white"
              />
            </div>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-sm text-[#0b1f3a] hover:underline font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              {
                label: "Total",
                value: filtered.length,
                className: "text-gray-900",
              },
              {
                label: "Drafts",
                value: drafts.length,
                className: "text-gray-700",
              },
              {
                label: "Submitted",
                value: filtered.filter((i) => i.status === "submitted").length,
                className: "text-sky-800",
              },
              {
                label: "Under Review",
                value: filtered.filter((i) => i.status === "under_review")
                  .length,
                className: "text-amber-700",
              },
              {
                label: "Closed",
                value: filtered.filter((i) => i.status === "closed").length,
                className: "text-emerald-700",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm"
              >
                <p className="text-xs sm:text-sm text-gray-500">{card.label}</p>
                <p
                  className={`text-xl sm:text-2xl font-semibold ${card.className}`}
                >
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
            Loading reports…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 sm:p-12 text-center shadow-sm">
            <p className="font-medium text-gray-900">
              {hasFilters
                ? "No reports match your filters"
                : "No incident reports yet"}
            </p>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              {hasFilters
                ? "Try clearing filters or adjusting the date range."
                : "When someone files a report for your property, it will show up here."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Clear filters
                </button>
              )}
              <Link
                href="/new"
                className="px-4 py-2 rounded-lg bg-[#0b1f3a] text-white text-sm font-medium hover:bg-[#08182e]"
              >
                + New Report
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {drafts.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-900 mb-3">
                  Drafts ({drafts.length})
                </h2>
                <div className="space-y-3 sm:hidden">
                  {drafts.map((incident) => (
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
                        {new Date(
                          incident.incident_date_time
                        ).toLocaleDateString()}
                      </p>
                      <div className="mt-3">
                        <ReportActions incident={incident} />
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
                          Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {drafts.map((incident) => (
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
                            {new Date(
                              incident.incident_date_time
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <ReportActions incident={incident} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Reports ({activeReports.length})
              </h2>

              <div className="space-y-3 sm:hidden">
                {activeReports.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
                    No submitted reports in this view.
                  </div>
                ) : (
                  activeReports.map((incident) => (
                    <div
                      key={incident.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">
                            {incident.report_number}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {incident.hotel?.name || "—"}
                          </p>
                        </div>
                        <StatusBadge status={incident.status} />
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {INCIDENT_TYPE_LABELS[incident.incident_type]} ·{" "}
                        {SEVERITY_LABELS[incident.severity]} ·{" "}
                        {new Date(
                          incident.incident_date_time
                        ).toLocaleDateString()}
                      </p>
                      {incident.reported_by_name && (
                        <p className="text-xs text-gray-400 mt-1">
                          By {incident.reported_by_name}
                        </p>
                      )}
                      <div className="mt-3">
                        <ReportActions incident={incident} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {activeReports.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    No submitted reports in this view.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Report #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Hotel
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                            Submitted by
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Type
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                            Severity
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {activeReports.map((incident) => (
                          <tr key={incident.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900">
                              {incident.report_number}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                              {incident.hotel?.name || "—"}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700 hidden lg:table-cell">
                              {incident.reported_by_name || "—"}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                              {INCIDENT_TYPE_LABELS[incident.incident_type]}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                              {new Date(
                                incident.incident_date_time
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700 hidden md:table-cell">
                              {SEVERITY_LABELS[incident.severity]}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <StatusBadge status={incident.status} />
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm">
                              <ReportActions incident={incident} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
          </>
        )}
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
