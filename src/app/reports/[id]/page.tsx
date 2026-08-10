import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { MOCK_INCIDENTS } from "@/lib/mock-data";
import {
  INCIDENT_TYPE_LABELS,
  SEVERITY_LABELS,
} from "@/types/incident";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params;
  const incident = MOCK_INCIDENTS.find((i) => i.id === id);

  if (!incident) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {incident.report_number}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {incident.hotel?.name} ·{" "}
                {new Date(incident.incident_date_time).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={incident.status} />
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Classification */}
            <section>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Classification
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium text-gray-900">
                    {INCIDENT_TYPE_LABELS[incident.incident_type]}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Severity</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {SEVERITY_LABELS[incident.severity]}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">
                    {incident.location_detail || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Reported by</p>
                  <p className="font-medium text-gray-900">
                    {incident.reported_by_name || "—"}
                  </p>
                </div>
              </div>
            </section>

            {/* People */}
            <section>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                People Involved
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Subject</p>
                  <p className="font-medium text-gray-900">
                    {incident.subject_name || "—"}{" "}
                    {incident.subject_type && (
                      <span className="text-gray-500 font-normal">
                        ({incident.subject_type})
                      </span>
                    )}
                  </p>
                  {incident.subject_identifier && (
                    <p className="text-gray-500 text-xs mt-0.5">
                      ID / Room: {incident.subject_identifier}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500">Witness</p>
                  <p className="font-medium text-gray-900">
                    {incident.witness_name || "—"}
                  </p>
                  {incident.witness_contact && (
                    <p className="text-gray-500 text-xs mt-0.5">
                      {incident.witness_contact}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Narrative */}
            <section>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Narrative
              </h2>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {incident.narrative}
              </p>
            </section>

            {/* Actions & Factors */}
            {(incident.actions_taken ||
              incident.contributing_factors ||
              incident.miscellaneous) && (
              <section className="space-y-4">
                {incident.actions_taken && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Immediate Actions Taken
                    </h3>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {incident.actions_taken}
                    </p>
                  </div>
                )}
                {incident.contributing_factors && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Contributing Factors
                    </h3>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {incident.contributing_factors}
                    </p>
                  </div>
                )}
                {incident.miscellaneous && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Miscellaneous
                    </h3>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {incident.miscellaneous}
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Flags */}
            <section>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Flags
              </h2>
              <div className="flex flex-wrap gap-3 text-sm">
                <span
                  className={`px-2.5 py-1 rounded-full ${
                    incident.ems_called
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  EMS Called: {incident.ems_called ? "Yes" : "No"}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full ${
                    incident.medical_refused
                      ? "bg-orange-100 text-orange-800"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  Medical Refused: {incident.medical_refused ? "Yes" : "No"}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full ${
                    incident.police_involved
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  Police Involved: {incident.police_involved ? "Yes" : "No"}
                </span>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
