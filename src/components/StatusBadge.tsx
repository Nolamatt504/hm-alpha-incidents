import { IncidentStatus, STATUS_LABELS } from "@/types/incident";

const STATUS_COLORS: Record<IncidentStatus, string> = {
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  sent_to_corporate: "bg-purple-100 text-purple-800",
  closed: "bg-green-100 text-green-800",
};

export default function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
