export type IncidentType =
  | "guest_injury"
  | "employee_injury"
  | "property_damage"
  | "security"
  | "near_miss"
  | "maintenance_safety";

export type SeverityLevel = "low" | "medium" | "high";

export type IncidentStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "sent_to_corporate"
  | "closed";

export type UserRole =
  | "submitter"
  | "property_hr"
  | "property_admin"
  | "corporate_admin";

export interface Hotel {
  id: string;
  name: string;
  city?: string;
  state?: string;
}

export interface IncidentFormData {
  hotel_id: string;
  incident_type: IncidentType;
  severity: SeverityLevel;
  incident_date_time: string; // ISO string from datetime-local
  location_detail: string;
  subject_name: string;
  subject_type: string;
  subject_identifier: string;
  subject_phone: string;
  subject_email: string;
  witness_name: string;
  witness_contact: string;
  narrative: string;
  actions_taken: string;
  contributing_factors: string;
  miscellaneous: string;
  ems_called: boolean;
  medical_refused: boolean;
  police_involved: boolean;
}

export interface Incident extends IncidentFormData {
  id: string;
  report_number: string;
  reported_date_time: string;
  submitted_by?: string;
  reported_by_name?: string;
  investigation_notes?: string;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
  hotel?: Hotel;
}

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  guest_injury: "Guest Injury",
  employee_injury: "Employee Injury",
  property_damage: "Property Damage",
  security: "Security",
  near_miss: "Near-Miss",
  maintenance_safety: "Maintenance / Safety",
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  sent_to_corporate: "Sent to Corporate",
  closed: "Closed",
};
