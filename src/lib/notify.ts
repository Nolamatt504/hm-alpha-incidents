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
 * Asks the API to email Hotel Admins for the hotel plus Corporate Admins.
 * Recipients are resolved server-side. Fails silently so report save is never blocked.
 */
export async function notifyStakeholders(payload: NotifyPayload) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return;

    await fetch("/api/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        type: payload.type,
        incidentId: payload.incidentId,
        reportNumber: payload.reportNumber,
        hotelId: payload.hotelId,
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
        reportUrl: `/reports/${payload.incidentId}`,
      }),
    });
  } catch (err) {
    console.error("notifyStakeholders failed", err);
  }
}
