"use client";

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  INCIDENT_TYPE_LABELS,
  SEVERITY_LABELS,
  IncidentFormData,
  IncidentType,
  SeverityLevel,
  Hotel,
} from "@/types/incident";
import { getCurrentProfile, UserProfile, isCorporate } from "@/lib/auth";
import { notifyStakeholders } from "@/lib/notify";

const DRAFT_KEY = "hm-alpha-new-incident-draft";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const initialForm: IncidentFormData = {
  hotel_id: "",
  incident_type: "guest_injury",
  severity: "medium",
  incident_date_time: "",
  location_detail: "",
  subject_name: "",
  subject_type: "Guest",
  subject_identifier: "",
  subject_phone: "",
  subject_email: "",
  witness_name: "",
  witness_contact: "",
  narrative: "",
  actions_taken: "",
  contributing_factors: "",
  miscellaneous: "",
  ems_called: false,
  medical_refused: false,
  police_involved: false,
};

export default function NewIncidentForm() {
  const searchParams = useSearchParams();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [form, setForm] = useState<IncidentFormData>(initialForm);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const skipPersistRef = useRef(false);

  useEffect(() => {
    async function load() {
      setIsLoadingHotels(true);
      const userProfile = await getCurrentProfile();
      setProfile(userProfile);

      const { data, error } = await supabase
        .from("hotels")
        .select("id, name, city, state")
        .eq("is_active", true)
        .order("name");

      let nextHotels: Hotel[] = [];
      if (error) {
        console.error("Error loading hotels:", error);
        setErrorMessage("Could not load hotels. Make sure you ran the SQL setup.");
      } else if (data) {
        if (userProfile && !isCorporate(userProfile) && userProfile.hotel_id) {
          nextHotels = data.filter((h: Hotel) => h.id === userProfile.hotel_id);
          setHotels(nextHotels);
          if (nextHotels.length === 1) {
            setForm((prev) => ({ ...prev, hotel_id: nextHotels[0].id }));
          }
        } else {
          nextHotels = data;
          setHotels(data);
        }
      }

      const qDraft = searchParams.get("draft");
      let restoredServerDraft = false;
      if (qDraft) {
        const { data: draft } = await supabase
          .from("incidents")
          .select("*")
          .eq("id", qDraft)
          .eq("status", "draft")
          .single();
        if (draft) {
          restoredServerDraft = true;
          setDraftId(draft.id);
          setForm({
            hotel_id: draft.hotel_id || "",
            incident_type: draft.incident_type,
            severity: draft.severity,
            incident_date_time: draft.incident_date_time
              ? new Date(draft.incident_date_time).toISOString().slice(0, 16)
              : "",
            location_detail: draft.location_detail || "",
            subject_name: draft.subject_name || "",
            subject_type: draft.subject_type || "",
            subject_identifier: draft.subject_identifier || "",
            subject_phone: draft.subject_phone || "",
            subject_email: draft.subject_email || "",
            witness_name: draft.witness_name || "",
            witness_contact: draft.witness_contact || "",
            narrative: draft.narrative || "",
            actions_taken: draft.actions_taken || "",
            contributing_factors: draft.contributing_factors || "",
            miscellaneous: draft.miscellaneous || "",
            ems_called: !!draft.ems_called,
            medical_refused: !!draft.medical_refused,
            police_involved: !!draft.police_involved,
          });
        }
      }

      if (!restoredServerDraft) {
        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          if (raw) {
            const saved = JSON.parse(raw) as Partial<IncidentFormData>;
            if (saved && typeof saved === "object") {
              setForm((prev) => {
                const next = { ...prev, ...saved };
                if (
                  userProfile &&
                  !isCorporate(userProfile) &&
                  userProfile.hotel_id
                ) {
                  next.hotel_id = userProfile.hotel_id;
                }
                return next;
              });
            }
          }
        } catch {
          // ignore corrupt drafts
        }
      }

      setIsLoadingHotels(false);
      setHydrated(true);
    }
    load();
  }, [searchParams]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      // quota / private mode
    }
  }, [form, hydrated]);

  function updateField<K extends keyof IncidentFormData>(
    key: K,
    value: IncidentFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addFiles(selected: File[]) {
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of selected) {
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(file.name);
      } else {
        accepted.push(file);
      }
    }
    if (rejected.length > 0) {
      setErrorMessage(
        `These files were skipped because they exceed 10MB: ${rejected.join(", ")}`
      );
    }
    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function clearLocalDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }

  async function saveIncident(asDraft: boolean) {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!form.hotel_id) {
      setErrorMessage("Please select a hotel.");
      return;
    }
    if (!asDraft && (!form.incident_date_time || !form.narrative.trim())) {
      setErrorMessage("Please fill in Hotel, Incident Date & Time, and Narrative before submitting.");
      return;
    }

    if (asDraft) setIsSavingDraft(true);
    else setIsSubmitting(true);

    try {
      const incidentDateTime = form.incident_date_time
        ? new Date(form.incident_date_time).toISOString()
        : new Date().toISOString();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const submitterName =
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        user?.email ||
        "Unknown";

      const payload = {
        hotel_id: form.hotel_id,
        incident_type: form.incident_type,
        severity: form.severity,
        incident_date_time: incidentDateTime,
        location_detail: form.location_detail || null,
        subject_name: form.subject_name || null,
        subject_type: form.subject_type || null,
        subject_identifier: form.subject_identifier || null,
        subject_phone: form.subject_phone || null,
        subject_email: form.subject_email || null,
        witness_name: form.witness_name || null,
        witness_contact: form.witness_contact || null,
        narrative: form.narrative || (asDraft ? "(Draft — incomplete)" : ""),
        actions_taken: form.actions_taken || null,
        contributing_factors: form.contributing_factors || null,
        miscellaneous: form.miscellaneous || null,
        ems_called: form.ems_called,
        medical_refused: form.medical_refused,
        police_involved: form.police_involved,
        status: asDraft ? "draft" : "submitted",
        submitted_by: user?.id || null,
        reported_by_name: submitterName,
      };

      let incident: { id: string; report_number: string } | null = null;
      let writeError: { message?: string } | null = null;

      if (draftId) {
        const { data, error } = await supabase
          .from("incidents")
          .update(payload)
          .eq("id", draftId)
          .select("id, report_number")
          .single();
        incident = data;
        writeError = error;
      } else {
        const { data, error } = await supabase
          .from("incidents")
          .insert(payload)
          .select("id, report_number")
          .single();
        incident = data;
        writeError = error;
      }

      if (writeError || !incident) {
        console.error("Supabase write error:", writeError);
        setErrorMessage(`Save failed: ${writeError?.message || "Unknown error"}`);
        return;
      }

      let uploadedCount = 0;
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${incident.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("incident-attachments")
            .upload(fileName, file);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }

          const { error: attError } = await supabase.from("incident_attachments").insert({
            incident_id: incident.id,
            file_name: file.name,
            file_path: fileName,
            file_type: file.type,
          });

          if (attError) {
            console.error("Attachment record error:", attError);
            continue;
          }

          uploadedCount += 1;
        }
      }

      if (!asDraft) {
        const hotelName =
          hotels.find((h) => h.id === form.hotel_id)?.name || undefined;
        await notifyStakeholders({
          type: "new_report",
          incidentId: incident.id,
          reportNumber: incident.report_number,
          hotelId: form.hotel_id,
          hotelName,
          incidentType: form.incident_type,
          severity: form.severity,
        });

        let fileNote = "";
        if (files.length > 0) {
          if (uploadedCount > 0) {
            fileNote = ` ${uploadedCount} file(s) uploaded.`;
            if (uploadedCount < files.length) {
              fileNote += " Some files could not be uploaded.";
            }
          } else {
            fileNote = " Photos/videos could not be uploaded.";
          }
        }

        setSuccessMessage(
          `Report ${incident.report_number} submitted successfully.${fileNote} You can view it on the Dashboard.`
        );
        skipPersistRef.current = true;
        clearLocalDraft();
        setForm({
          ...initialForm,
          hotel_id:
            profile && !isCorporate(profile) && profile.hotel_id
              ? profile.hotel_id
              : "",
        });
        setFiles([]);
        setDraftId(null);
      } else {
        setDraftId(incident.id);
        setSuccessMessage(
          `Draft ${incident.report_number} saved. Open Dashboard → Drafts → Continue when you are ready to finish.`
        );
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsSavingDraft(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await saveIncident(false);
  }

  async function handleSaveDraft() {
    await saveIncident(true);
  }

  const needsHotelAssignment =
    profile &&
    !isCorporate(profile) &&
    !profile.hotel_id &&
    !isLoadingHotels;

  if (needsHotelAssignment) {
    return (
      <div className="max-w-3xl mx-auto px-1">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">New Incident Report</h1>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-6 text-amber-900">
          <p className="font-medium">Hotel not assigned yet</p>
          <p className="mt-2 text-sm leading-relaxed">
            Your account is not linked to a hotel. Please contact your Hotel
            Admin or Corporate Admin so they can assign you on the Admin page.
            You will be able to submit reports after that.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-1 sm:px-0">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
          {draftId ? "Continue draft" : "New Incident Report"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Fields marked with <span className="text-red-600 font-medium">*</span> are required to submit.
          You can <strong>Save Draft</strong> anytime and finish later.
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm leading-relaxed">
          <p>{successMessage}</p>
          <a href="/dashboard" className="inline-block mt-2 font-medium text-[#0b1f3a] hover:underline">
            Go to Dashboard →
          </a>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="border-b border-gray-100 pb-2">
            <h2 className="text-lg font-medium text-gray-900">1. Classification</h2>
            <p className="text-xs text-gray-500 mt-0.5">Hotel, type, severity, and when it happened</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hotel <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.hotel_id}
              onChange={(e) => updateField("hotel_id", e.target.value)}
              disabled={isLoadingHotels}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a] focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">
                {isLoadingHotels ? "Loading hotels…" : "Select hotel…"}
              </option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.city}, {h.state})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Incident Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.incident_type}
                onChange={(e) =>
                  updateField("incident_type", e.target.value as IncidentType)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
              >
                {Object.entries(INCIDENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={form.severity}
                onChange={(e) =>
                  updateField("severity", e.target.value as SeverityLevel)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
              >
                {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Incident Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={form.incident_date_time}
                onChange={(e) => updateField("incident_date_time", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specific Location
              </label>
              <input
                type="text"
                placeholder="e.g. Room 949, Pool Deck, Loading Dock"
                value={form.location_detail}
                onChange={(e) => updateField("location_detail", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
              />
            </div>
          </div>
        </section>

        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="border-b border-gray-100 pb-2">
            <h2 className="text-lg font-medium text-gray-900">2. People involved</h2>
            <p className="text-xs text-gray-500 mt-0.5">Subject, witnesses, and identifiers</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Name
              </label>
              <input
                type="text"
                value={form.subject_name}
                onChange={(e) => updateField("subject_name", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Type
              </label>
              <select
                value={form.subject_type}
                onChange={(e) => updateField("subject_type", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
              >
                <option value="Guest">Guest</option>
                <option value="Employee">Employee</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room # or Employee ID
            </label>
            <input
              type="text"
              value={form.subject_identifier}
              onChange={(e) => updateField("subject_identifier", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone number
              </label>
              <input
                type="tel"
                value={form.subject_phone}
                onChange={(e) => updateField("subject_phone", e.target.value)}
                placeholder="(555) 555-5555"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.subject_email}
                onChange={(e) => updateField("subject_email", e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Witness Name (optional)
              </label>
              <input
                type="text"
                value={form.witness_name}
                onChange={(e) => updateField("witness_name", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Witness Contact
              </label>
              <input
                type="text"
                placeholder="Phone or email"
                value={form.witness_contact}
                onChange={(e) => updateField("witness_contact", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
              />
            </div>
          </div>
        </section>

        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="border-b border-gray-100 pb-2">
            <h2 className="text-lg font-medium text-gray-900">3. What happened</h2>
            <p className="text-xs text-gray-500 mt-0.5">Narrative and follow-up details</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Narrative / Statement of Facts <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              value={form.narrative}
              onChange={(e) => updateField("narrative", e.target.value)}
              placeholder="Describe what occurred…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Immediate Actions Taken
            </label>
            <textarea
              rows={3}
              value={form.actions_taken}
              onChange={(e) => updateField("actions_taken", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contributing Factors
            </label>
            <textarea
              rows={2}
              value={form.contributing_factors}
              onChange={(e) => updateField("contributing_factors", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Miscellaneous
            </label>
            <textarea
              rows={2}
              value={form.miscellaneous}
              onChange={(e) => updateField("miscellaneous", e.target.value)}
              placeholder="Anything else worth noting…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
            />
          </div>
        </section>

        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
          <div className="border-b border-gray-100 pb-2 mb-4">
            <h2 className="text-lg font-medium text-gray-900">4. Response flags</h2>
            <p className="text-xs text-gray-500 mt-0.5">EMS, medical refusal, police</p>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ems_called}
                onChange={(e) => updateField("ems_called", e.target.checked)}
                className="rounded border-gray-300 text-[#0b1f3a] focus:ring-[#0b1f3a]"
              />
              <span className="text-sm text-gray-700">EMS Called</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.medical_refused}
                onChange={(e) => updateField("medical_refused", e.target.checked)}
                className="rounded border-gray-300 text-[#0b1f3a] focus:ring-[#0b1f3a]"
              />
              <span className="text-sm text-gray-700">Medical Attention Refused</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.police_involved}
                onChange={(e) => updateField("police_involved", e.target.checked)}
                className="rounded border-gray-300 text-[#0b1f3a] focus:ring-[#0b1f3a]"
              />
              <span className="text-sm text-gray-700">Police Involved</span>
            </label>
          </div>
        </section>

        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
          <div className="border-b border-gray-100 pb-2 mb-4">
            <h2 className="text-lg font-medium text-gray-900">5. Photos &amp; videos</h2>
            <p className="text-xs text-gray-500 mt-0.5">Optional. Max 10MB per file.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center min-h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition px-3 py-4">
                <p className="text-sm font-medium text-[#0b1f3a]">Take photo</p>
                <p className="text-xs text-gray-400 mt-1">Opens camera</p>
                <input
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <label className="flex flex-col items-center justify-center min-h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition px-3 py-4">
                <p className="text-sm font-medium text-[#0b1f3a]">Photo library</p>
                <p className="text-xs text-gray-400 mt-1">Choose files (multiple allowed)</p>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="truncate text-gray-700">
                      {file.name}{" "}
                      <span className="text-gray-400">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-3 text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              skipPersistRef.current = true;
              clearLocalDraft();
              setForm({
                ...initialForm,
                hotel_id:
                  profile && !isCorporate(profile) && profile.hotel_id
                    ? profile.hotel_id
                    : "",
              });
              setFiles([]);
              setDraftId(null);
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSubmitting || isSavingDraft || isLoadingHotels}
            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60"
          >
            {isSavingDraft ? "Saving draft…" : "Save Draft"}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isSavingDraft || isLoadingHotels}
            className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-lg bg-[#0b1f3a] text-white text-sm font-medium hover:bg-[#08182e] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting…" : "Submit Report"}
          </button>
        </div>
      </form>
    </div>
  );
}
