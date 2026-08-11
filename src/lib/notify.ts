import { supabase } from "./supabase";
import { INCIDENT_TYPE_LABELS, SEVERITY_LABELS } from "@/types/incident";

type NotifyType = "new_report" | "sent_to_corporate";

interface NotifyPayload {
  type: NotifyType;
  incidentId: string;
  reportNumber: string;
  hotelId: string;
  hotelName?: string;
  incidentType?: string;
  severity?: string;
}

/**
 * Looks up Property Admins for the hotel + all Corporate Admins,
 * then asks the API route to email them.
 * Fails silently so report save is never blocked by email issues.
 */
export async function notifyStakeholders(payload: NotifyPayload) {
  try {
    const emails = new Set<string>();

    // Property admins at this hotel
    if (payload.hotelId) {
      const { data: propertyAdmins } = await supabase
        .from("profiles")
        .select("email")
        .eq("role", "property_admin")
        .eq("hotel_id", payload.hotelId)
        .eq("is_active", true);

      propertyAdmins?.forEach((p) => {
        if (p.email) emails.add(p.email);
      });
    }

    // All corporate admins
    const { data: corporate } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "corporate_admin")
      .eq("is_active", true);

    corporate?.forEach((p) => {
      if (p.email) emails.add(p.email);
    });

    const recipients = Array.from(emails);
    if (recipients.length === 0) return;

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const reportUrl = origin
      ? `${origin}/reports/${payload.incidentId}`
      : undefined;

    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: payload.type,
        reportNumber: payload.reportNumber,
        hotelName: payload.hotelName,
        incidentType: payload.incidentType
          ? INCIDENT_TYPE_LABELS[
              payload.incidentType as keyof typeof INCIDENT_TYPE_LABELS
            ] || payload.incidentType
          : undefined,
        severity: payload.severity
          ? SEVERITY_LABELS[
              payload.severity as keyof typeof SEVERITY_LABELS
            ] || payload.severity
          : undefined,
        reportUrl,
        recipients,
      }),
    });
  } catch (err) {
    console.error("notifyStakeholders failed", err);
  }
}
