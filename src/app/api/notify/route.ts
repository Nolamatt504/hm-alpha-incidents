import { NextRequest, NextResponse } from "next/server";

/**
 * Sends notification emails via Resend (https://resend.com – free tier works).
 * Set these in Vercel → Project → Settings → Environment Variables:
 *   RESEND_API_KEY=re_xxxxx
 *   NOTIFY_FROM_EMAIL=Incident Reports <onboarding@resend.dev>
 *
 * Without RESEND_API_KEY the endpoint returns ok but skips sending (safe for local dev).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type, // "new_report" | "sent_to_corporate"
      reportNumber,
      hotelName,
      incidentType,
      severity,
      reportUrl,
      recipients, // string[]
    } = body;

    if (!recipients?.length) {
      return NextResponse.json({ ok: true, sent: 0, reason: "no recipients" });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log("[notify] RESEND_API_KEY not set – skipping email", {
        type,
        reportNumber,
        recipients,
      });
      return NextResponse.json({
        ok: true,
        sent: 0,
        reason: "RESEND_API_KEY not configured",
      });
    }

    const from =
      process.env.NOTIFY_FROM_EMAIL ||
      "HM Alpha Incidents <onboarding@resend.dev>";

    const subject =
      type === "sent_to_corporate"
        ? `Report ${reportNumber} sent to corporate – ${hotelName || "Hotel"}`
        : `New incident report ${reportNumber} – ${hotelName || "Hotel"}`;

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">${
          type === "sent_to_corporate"
            ? "Report escalated to corporate"
            : "New incident report submitted"
        }</h2>
        <p><strong>Report #:</strong> ${reportNumber || "—"}</p>
        <p><strong>Hotel:</strong> ${hotelName || "—"}</p>
        <p><strong>Type:</strong> ${incidentType || "—"}</p>
        <p><strong>Severity:</strong> ${severity || "—"}</p>
        ${
          reportUrl
            ? `<p><a href="${reportUrl}" style="color:#2563eb;">Open report</a></p>`
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
        to: recipients,
        subject,
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("[notify] Resend error", data);
      return NextResponse.json(
        { ok: false, error: data?.message || "Email send failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, sent: recipients.length, id: data?.id });
  } catch (err: any) {
    console.error("[notify]", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
