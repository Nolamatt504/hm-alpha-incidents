import { IncidentStatus, STATUS_LABELS } from "@/types/incident";

const STATUS_COLORS: Record<IncidentStatus, string> = {
  draft: "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200",
  submitted: "bg-sky-50 text-sky-900 ring-1 ring-inset ring-sky-200",
  under_review: "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200",
  sent_to_corporate:
    "bg-violet-50 text-violet-900 ring-1 ring-inset ring-violet-200",
  closed: "bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-200",
};

export default function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        STATUS_COLORS[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
