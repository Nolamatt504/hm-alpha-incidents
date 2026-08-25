import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://jwztnydfwvivubmpgeoh.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3enRueWRmd3ZpdnVibXBnZW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzY4NDQsImV4cCI6MjEwMTk1Mjg0NH0.yijHIRAWfgBrBDXe5Ll9Yj-hRAdc-f3Ur0OrDH6yDWY";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeReportUrl(
  reportUrl: unknown,
  origin: string
): string | null {
  if (typeof reportUrl !== "string" || !reportUrl) return null;

  if (reportUrl.startsWith("/") && !reportUrl.startsWith("//")) {
    return `${origin}${reportUrl}`;
  }

  try {
    const parsed = new URL(reportUrl);
    const originUrl = new URL(origin);
    if (parsed.origin === originUrl.origin) {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

function extractEmails(rows: unknown): string[] {
  if (!Array.isArray(rows)) return [];
  const emails = new Set<string>();

  for (const row of rows) {
    if (typeof row === "string" && row.includes("@")) {
      emails.add(row.trim());
      continue;
    }
    if (row && typeof row === "object") {
      const record = row as Record<string, unknown>;
      const candidate =
        record.email ?? record.get_incident_notify_emails ?? null;
      if (typeof candidate === "string" && candidate.includes("@")) {
        emails.add(candidate.trim());
      }
    }
  }

  return Array.from(emails);
}

/**
 * Sends notification emails via Resend.
 * Recipients come from get_incident_notify_emails — never from the request body.
 * Without RESEND_API_KEY the endpoint returns ok but skips sending (safe for local dev).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      type, // "new_report" | "sent_to_corporate"
      reportNumber,
      hotelId,
      hotelName,
      incidentType,
      severity,
      reportUrl,
    } = body;

    if (!hotelId) {
      return NextResponse.json(
        { ok: false, error: "hotelId is required" },
        { status: 400 }
      );
    }

    const { data: emailRows, error: rpcError } = await supabase.rpc(
      "get_incident_notify_emails",
      { p_hotel_id: hotelId }
    );

    if (rpcError) {
      console.error("[notify] recipient lookup failed");
      return NextResponse.json(
        { ok: false, error: "Could not load recipients" },
        { status: 500 }
      );
    }

    const emails = extractEmails(emailRows);
    if (emails.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, reason: "no recipients" });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log("[notify] RESEND_API_KEY not set – skipping email", {
        type,
        reportNumber,
        recipientCount: emails.length,
      });
      return NextResponse.json({
        ok: true,
        sent: 0,
        reason: "RESEND_API_KEY not configured",
      });
    }

    const origin = req.nextUrl.origin;
    const safeReportUrl = sanitizeReportUrl(reportUrl, origin);
    const safeReportNumber = escapeHtml(reportNumber || "—");
    const safeHotelName = escapeHtml(hotelName || "—");
    const safeIncidentType = escapeHtml(incidentType || "—");
    const safeSeverity = escapeHtml(severity || "—");
    const safeLink = safeReportUrl ? escapeHtml(safeReportUrl) : null;
    const displayHotel = hotelName || "Hotel";

    const from =
      process.env.NOTIFY_FROM_EMAIL ||
      "HM Alpha Incidents <onboarding@resend.dev>";

    const subject =
      type === "sent_to_corporate"
        ? `Report ${reportNumber} sent to corporate – ${displayHotel}`
        : `New incident report ${reportNumber} – ${displayHotel}`;

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">${
          type === "sent_to_corporate"
            ? "Report escalated to corporate"
            : "New incident report submitted"
        }</h2>
        <p><strong>Report #:</strong> ${safeReportNumber}</p>
        <p><strong>Hotel:</strong> ${safeHotelName}</p>
        <p><strong>Type:</strong> ${safeIncidentType}</p>
        <p><strong>Severity:</strong> ${safeSeverity}</p>
        ${
          safeLink
            ? `<p><a href="${safeLink}" style="color:#2563eb;">Open report</a></p>`
            : ""
        }
        <p style="color:#6b7280; font-size: 13px; margin-top: 24px;">
          HM Alpha Incident Reporting System
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: emails,
        subject,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[notify] Resend error");
      return NextResponse.json(
        { ok: false, error: data?.message || "Email send failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      sent: emails.length,
      id: data?.id,
    });
  } catch (err: unknown) {
    console.error("[notify]", err instanceof Error ? err.message : "error");
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unexpected error",
      },
      { status: 500 }
    );
  }
}
