"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";
import {
  getCurrentProfile,
  UserProfile,
  isCorporate,
  canManageUsers,
} from "@/lib/auth";
import {
  Incident,
  IncidentStatus,
  INCIDENT_TYPE_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
} from "@/types/incident";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  publicUrl?: string;
}

function ReportDetailContent() {
  const params = useParams();
  const id = params.id as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [investigationNotes, setInvestigationNotes] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const userProfile = await getCurrentProfile();
      setProfile(userProfile);

      const { data, error: fetchError } = await supabase
        .from("incidents")
        .select(`*, hotel:hotels ( id, name, city, state )`)
        .eq("id", id)
        .single();

      if (fetchError || !data) {
        setError(fetchError?.message || "Report not found");
        setLoading(false);
        return;
      }

      setIncident(data as any);
      setInvestigationNotes(data.investigation_notes || "");

      const { data: atts } = await supabase
        .from("incident_attachments")
        .select("id, file_name, file_path, file_type")
        .eq("incident_id", id);

      if (atts && atts.length > 0) {
        const withUrls = atts.map((a) => {
          const { data: urlData } = supabase.storage
            .from("incident-attachments")
            .getPublicUrl(a.file_path);
          return { ...a, publicUrl: urlData?.publicUrl };
        });
        setAttachments(withUrls);
      }

      setLoading(false);
    }

    if (id) load();
  }, [id]);

  async function updateStatus(newStatus: IncidentStatus) {
    if (!incident) return;
    setSaving(true);
    setMessage(null);

    const { error: updateError } = await supabase
      .from("incidents")
      .update({
        status: newStatus,
        investigation_notes: investigationNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", incident.id);

    if (updateError) {
      setMessage("Error: " + updateError.message);
    } else {
      setIncident({ ...incident, status: newStatus });
      setMessage("Status updated");
      setTimeout(() => setMessage(null), 2500);
    }
    setSaving(false);
  }

  async function saveNotes() {
    if (!incident) return;
    setSaving(true);
    setMessage(null);

    const { error: updateError } = await supabase
      .from("incidents")
      .update({
        investigation_notes: investigationNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", incident.id);

    if (updateError) {
      setMessage("Error: " + updateError.message);
    } else {
      setMessage("Notes saved");
      setTimeout(() => setMessage(null), 2500);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20 text-gray-500">
          Loading report…
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-red-600">{error || "Report not found"}</p>
          <Link href="/dashboard" className="text-blue-600 text-sm mt-4 inline-block">
            ← Back to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  const canEdit = canManageUsers(profile) || isCorporate(profile);

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

        {message && (
          <div
            className={`mb-4 rounded-lg px-4 py-2 text-sm ${
              message.startsWith("Error")
                ? "bg-red-50 border border-red-200 text-red-800"
                : "bg-green-50 border border-green-200 text-green-800"
            }`}
          >
            {message}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {incident.report_number}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {(incident as any).hotel?.name || "—"} ·{" "}
                {new Date(incident.incident_date_time).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={incident.status} />
          </div>

          <div className="px-6 py-5 space-y-6">
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
                  <p className="text-gray-500">Reported</p>
                  <p className="font-medium text-gray-900">
                    {incident.reported_date_time
                      ? new Date(incident.reported_date_time).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>
            </section>

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

            <section>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Narrative
              </h2>
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {incident.narrative}
              </p>
            </section>

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

            {attachments.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Photos / Videos ({attachments.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="rounded-lg border border-gray-200 overflow-hidden"
                    >
                      {att.file_type?.startsWith("video/") ? (
                        <video
                          src={att.publicUrl}
                          controls
                          className="w-full h-40 object-cover bg-black"
                        />
                      ) : (
                        <a
                          href={att.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={att.publicUrl}
                            alt={att.file_name}
                            className="w-full h-40 object-cover hover:opacity-90"
                          />
                        </a>
                      )}
                      <p className="text-xs text-gray-500 px-2 py-1 truncate">
                        {att.file_name}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {canEdit && (
              <section className="border-t border-gray-100 pt-6 space-y-4">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Investigation & Status
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Investigation Notes
                  </label>
                  <textarea
                    rows={3}
                    value={investigationNotes}
                    onChange={(e) => setInvestigationNotes(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add follow-up notes…"
                  />
                  <button
                    type="button"
                    onClick={saveNotes}
                    disabled={saving}
                    className="mt-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Save Notes
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Change Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        "submitted",
                        "under_review",
                        "sent_to_corporate",
                        "closed",
                      ] as IncidentStatus[]
                    ).map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={saving || incident.status === s}
                        onClick={() => updateStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 ${
                          incident.status === s
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReportDetailPage() {
  return (
    <RequireAuth>
      <ReportDetailContent />
    </RequireAuth>
  );
}
