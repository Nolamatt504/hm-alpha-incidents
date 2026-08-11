"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
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

const initialForm: IncidentFormData = {
  hotel_id: "",
  incident_type: "guest_injury",
  severity: "medium",
  incident_date_time: "",
  location_detail: "",
  subject_name: "",
  subject_type: "Guest",
  subject_identifier: "",
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
  const [form, setForm] = useState<IncidentFormData>(initialForm);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isLoadingHotels, setIsLoadingHotels] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      if (error) {
        console.error("Error loading hotels:", error);
        setErrorMessage("Could not load hotels. Make sure you ran the SQL setup.");
      } else if (data) {
        if (userProfile && !isCorporate(userProfile) && userProfile.hotel_id) {
          const filtered = data.filter((h: Hotel) => h.id === userProfile.hotel_id);
          setHotels(filtered);
          if (filtered.length === 1) {
            setForm((prev) => ({ ...prev, hotel_id: filtered[0].id }));
          }
        } else {
          setHotels(data);
        }
      }
      setIsLoadingHotels(false);
    }
    load();
  }, []);

  function updateField<K extends keyof IncidentFormData>(
    key: K,
    value: IncidentFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!form.hotel_id || !form.incident_date_time || !form.narrative.trim()) {
      setErrorMessage("Please fill in Hotel, Incident Date & Time, and Narrative.");
      setIsSubmitting(false);
      return;
    }

    try {
      const incidentDateTime = new Date(form.incident_date_time).toISOString();

      // 1. Insert the incident
      const { data: incident, error: insertError } = await supabase
        .from("incidents")
        .insert({
          hotel_id: form.hotel_id,
          incident_type: form.incident_type,
          severity: form.severity,
          incident_date_time: incidentDateTime,
          location_detail: form.location_detail || null,
          subject_name: form.subject_name || null,
          subject_type: form.subject_type || null,
          subject_identifier: form.subject_identifier || null,
          witness_name: form.witness_name || null,
          witness_contact: form.witness_contact || null,
          narrative: form.narrative,
          actions_taken: form.actions_taken || null,
          contributing_factors: form.contributing_factors || null,
          miscellaneous: form.miscellaneous || null,
          ems_called: form.ems_called,
          medical_refused: form.medical_refused,
          police_involved: form.police_involved,
          status: "submitted",
        })
        .select("id, report_number")
        .single();

      if (insertError || !incident) {
        console.error("Supabase insert error:", insertError);
        setErrorMessage(`Save failed: ${insertError?.message || "Unknown error"}`);
        return;
      }

      // 2. Upload files (if any)
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${incident.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("incident-attachments")
            .upload(fileName, file);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            // Continue with other files even if one fails
            continue;
          }

          // Save attachment record
          await supabase.from("incident_attachments").insert({
            incident_id: incident.id,
            file_name: file.name,
            file_path: fileName,
            file_type: file.type,
          });
        }
      }

      // Notify property + corporate admins (does not block save)
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

      setSuccessMessage(
        `Report ${incident.report_number} submitted successfully!${
          files.length > 0 ? ` ${files.length} file(s) uploaded.` : ""
        }`
      );
      setForm(initialForm);
      setFiles([]);
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Property users must be assigned to a hotel before submitting
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
            Your account is not linked to a hotel. Please contact your Property
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
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">New Incident Report</h1>
        <p className="mt-1 text-sm text-gray-500">
          Complete the form below. Fields marked with * are required.
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Classification */}
        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">
            Classification
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hotel <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.hotel_id}
              onChange={(e) => updateField("hotel_id", e.target.value)}
              disabled={isLoadingHotels}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* People */}
        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">
            People Involved
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Name
              </label>
              <input
                type="text"
                value={form.subject_name}
                onChange={(e) => updateField("subject_name", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Type
              </label>
              <select
                value={form.subject_type}
                onChange={(e) => updateField("subject_type", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* What Happened */}
        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2">
            What Happened
          </h2>

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
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        {/* Quick Flags */}
        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2 mb-4">
            Quick Flags
          </h2>
          <div className="flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ems_called}
                onChange={(e) => updateField("ems_called", e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">EMS Called</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.medical_refused}
                onChange={(e) => updateField("medical_refused", e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Medical Attention Refused</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.police_involved}
                onChange={(e) => updateField("police_involved", e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Police Involved</span>
            </label>
          </div>
        </section>

        {/* Photos / Videos */}
        <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-2 mb-4">
            Photos / Videos
          </h2>

          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg
                  className="w-8 h-8 mb-2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">Photos or videos (multiple allowed)</p>
              </div>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li
                    key={index}
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

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setForm(initialForm);
              setFiles([]);
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoadingHotels}
            className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving…" : "Submit Report"}
          </button>
        </div>
      </form>
    </div>
  );
}
