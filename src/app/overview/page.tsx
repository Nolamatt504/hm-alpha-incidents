"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import RequireAuth from "@/components/RequireAuth";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile, isCorporate } from "@/lib/auth";
import {
  Hotel,
  Incident,
  IncidentType,
  SeverityLevel,
  INCIDENT_TYPE_LABELS,
  SEVERITY_LABELS,
  isAgingIncident,
} from "@/types/incident";

const OPEN_STATUSES = new Set(["submitted", "under_review", "sent_to_corporate"]);

function OverviewContent() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      const userProfile = await getCurrentProfile();

      if (!userProfile || !isCorporate(userProfile)) {
        router.replace("/dashboard");
        return;
      }

      const [incRes, hotelsRes] = await Promise.all([
        supabase
          .from("incidents")
          .select(`*, hotel:hotels ( id, name, city, state )`)
          .is("archived_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("hotels")
          .select("id, name, city, state")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (incRes.error) {
        setError("Could not load overview. " + incRes.error.message);
      } else {
        setIncidents((incRes.data as Incident[]) || []);
      }
      if (hotelsRes.data) setHotels(hotelsRes.data);
      setIsLoading(false);
    }

    load();
  }, [router]);

  const live = useMemo(
    () => incidents.filter((i) => i.status !== "draft"),
    [incidents]
  );
  const open = useMemo(
    () => live.filter((i) => OPEN_STATUSES.has(i.status)),
    [live]
  );
  const closed = useMemo(
    () => live.filter((i) => i.status === "closed"),
    [live]
  );
  const aging = useMemo(() => open.filter(isAgingIncident), [open]);

  const severityMix = useMemo(() => {
    const counts: Record<SeverityLevel, number> = { low: 0, medium: 0, high: 0 };
    for (const i of live) {
      counts[i.severity] = (counts[i.severity] || 0) + 1;
    }
    return counts;
  }, [live]);

  const typeMix = useMemo(() => {
    const counts: Partial<Record<IncidentType, number>> = {};
    for (const i of live) {
      counts[i.incident_type] = (counts[i.incident_type] || 0) + 1;
    }
    return Object.entries(INCIDENT_TYPE_LABELS).map(([key, label]) => ({
      key: key as IncidentType,
      label,
      value: counts[key as IncidentType] || 0,
    }));
  }, [live]);

  const byHotel = useMemo(() => {
    return hotels
      .map((h) => {
        const rows = live.filter((i) => i.hotel_id === h.id);
        const hotelOpen = rows.filter((i) => OPEN_STATUSES.has(i.status));
        return {
          hotel: h,
          open: hotelOpen.length,
          aging: hotelOpen.filter(isAgingIncident).length,
          closed: rows.filter((i) => i.status === "closed").length,
          high: rows.filter((i) => i.severity === "high").length,
          total: rows.length,
        };
      })
      .sort((a, b) => b.open - a.open || b.aging - a.aging || a.hotel.name.localeCompare(b.hotel.name));
  }, [hotels, live]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Portfolio overview
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Corporate only. Live (non-archived) reports across all properties.
              Aging means still open more than 7 days.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-[#0b1f3a] text-white text-sm font-medium hover:bg-[#08182e]"
            >
              Dashboard
            </Link>
            <Link
              href="/archives"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-[#0b1f3a] text-[#0b1f3a] text-sm font-medium hover:bg-slate-50"
            >
              Archives
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
            Loading overview…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Live reports", value: live.length, className: "text-gray-900" },
                { label: "Open", value: open.length, className: "text-sky-800" },
                { label: "Aging (>7 days)", value: aging.length, className: "text-orange-800" },
                { label: "Closed", value: closed.length, className: "text-emerald-700" },
              ].map((card) => (
                <div
                  key={card.label}
                  className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm"
                >
                  <p className="text-xs sm:text-sm text-gray-500">{card.label}</p>
                  <p className={`text-xl sm:text-2xl font-semibold ${card.className}`}>
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">
                  Severity mix
                </h2>
                <div className="space-y-2">
                  {(Object.keys(SEVERITY_LABELS) as SeverityLevel[]).map((s) => {
                    const value = severityMix[s];
                    const pct = live.length ? Math.round((value / live.length) * 100) : 0;
                    return (
                      <div key={s}>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>{SEVERITY_LABELS[s]}</span>
                          <span>
                            {value} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full ${
                              s === "high"
                                ? "bg-red-600"
                                : s === "medium"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">
                  Type mix
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {typeMix.map((t) => (
                    <li
                      key={t.key}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <span className="text-gray-700">{t.label}</span>
                      <span className="font-semibold text-gray-900">{t.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <section className="mb-8">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                By hotel
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Hotel
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Open
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Aging
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Closed
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          High
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Reports
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {byHotel.map((row) => (
                        <tr key={row.hotel.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">
                            <Link
                              href={`/dashboard?hotel=${row.hotel.id}`}
                              className="text-[#0b1f3a] hover:underline"
                            >
                              {row.hotel.name}
                            </Link>
                            {row.hotel.city && (
                              <span className="block text-xs font-normal text-gray-500">
                                {row.hotel.city}
                                {row.hotel.state ? `, ${row.hotel.state}` : ""}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-800">
                            {row.open}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span
                              className={
                                row.aging > 0
                                  ? "font-semibold text-orange-800"
                                  : "text-gray-500"
                              }
                            >
                              {row.aging}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-800">
                            {row.closed}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-800">
                            {row.high}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-800">
                            {row.total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                Aging open reports ({aging.length})
              </h2>
              {aging.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500 shadow-sm">
                  No submitted / under review / sent-to-corporate reports older
                  than 7 days.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <ul className="divide-y divide-gray-100">
                    {aging.slice(0, 25).map((incident) => (
                      <li
                        key={incident.id}
                        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/reports/${incident.id}`}
                            className="font-medium text-[#0b1f3a] hover:underline"
                          >
                            {incident.report_number}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {incident.hotel?.name || "—"} ·{" "}
                            {INCIDENT_TYPE_LABELS[incident.incident_type]} · filed{" "}
                            {new Date(incident.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={incident.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <RequireAuth>
      <OverviewContent />
    </RequireAuth>
  );
}
