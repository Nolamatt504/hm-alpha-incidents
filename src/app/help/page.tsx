import Link from "next/link";
import Header from "@/components/Header";

const sections = [
  { id: "getting-started", label: "Getting started" },
  { id: "roles", label: "Roles" },
  { id: "file-report", label: "Filing a report" },
  { id: "drafts", label: "Drafts" },
  { id: "reviewing", label: "Reviewing reports" },
  { id: "overview-archives", label: "Overview & Archives" },
  { id: "admin", label: "Admin" },
  { id: "password", label: "Password reset" },
  { id: "contact", label: "Who to contact" },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            Help
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            How to use the HM Alpha Incident Reporting system across all
            properties. Reports are confidential.
          </p>
        </div>

        <nav className="mb-10 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            On this page
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-[#0b1f3a] hover:underline font-medium"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-10 text-sm text-gray-700 leading-relaxed">
          <section id="getting-started" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Getting started
            </h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Go to{" "}
                <Link href="/login" className="text-[#0b1f3a] font-medium hover:underline">
                  Sign in
                </Link>{" "}
                and choose <strong>Create one</strong> to make an account.
              </li>
              <li>Sign in with your email and password.</li>
              <li>
                A <strong>Hotel Admin</strong> or <strong>Corporate Admin</strong>{" "}
                must assign you to a hotel (and a role) before you can submit
                reports.
              </li>
              <li>
                After you are assigned, open{" "}
                <Link href="/new" className="text-[#0b1f3a] font-medium hover:underline">
                  New Report
                </Link>{" "}
                to file an incident — typically about a minute on a phone.
              </li>
            </ol>
            <p className="mt-3 text-gray-500">
              If you see a message that your hotel is not assigned yet, contact
              your Hotel Admin or Corporate Admin.
            </p>
          </section>

          <section id="roles" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Roles</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">What they can do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      Submitter
                    </td>
                    <td className="px-4 py-3">
                      Create and submit reports for their assigned hotel. View
                      reports for that hotel only. Cannot change status, add
                      follow-ups, or manage users.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      Property HR
                    </td>
                    <td className="px-4 py-3">
                      Same hotel-scoped view, plus investigation notes, status
                      changes, and follow-up comments. Cannot manage users.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      Hotel Admin
                    </td>
                    <td className="px-4 py-3">
                      Full access for their hotel: reports, status, notes,
                      follow-ups, and managing users at that property. The
                      on-screen label is always <strong>Hotel Admin</strong>{" "}
                      (not Property Admin).
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      Corporate Admin
                    </td>
                    <td className="px-4 py-3">
                      See every hotel. Portfolio{" "}
                      <Link href="/overview" className="text-[#0b1f3a] font-medium hover:underline">
                        Overview
                      </Link>
                      , search across properties,{" "}
                      <Link href="/archives" className="text-[#0b1f3a] font-medium hover:underline">
                        Archives
                      </Link>
                      , and manage all users and reports.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="file-report" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Filing a report
            </h2>
            <div className="mb-4 rounded-lg border border-[#0b1f3a]/20 bg-slate-50 px-4 py-3">
              <p className="font-medium text-gray-900">
                What staff did matters more than a long story of what happened.
              </p>
              <p className="mt-1 text-gray-600">
                Insurance and claims teams look first at the response: first
                aid, area secured, photos, EMS called, medical attention
                offered or refused, and who was notified. Write that while it
                is fresh. The report is a confidential contemporaneous record.
              </p>
            </div>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Open{" "}
                <Link href="/new" className="text-[#0b1f3a] font-medium hover:underline">
                  New Report
                </Link>
                .
              </li>
              <li>
                Choose the hotel (property users are limited to their hotel).
              </li>
              <li>
                Fill in type, severity, date/time, location, people involved,
                and the narrative.
              </li>
              <li>
                Complete <strong>What staff did</strong> — the response field.
                Attach photos. Mark EMS, medical refusal, or police if
                applicable.
              </li>
              <li>
                Click <strong>Submit Report</strong> when the report is ready.
              </li>
            </ol>
            <p className="mt-3">
              After submit, the report appears on the Dashboard with status{" "}
              <strong>Submitted</strong>. Hotel Admin and Corporate Admin are
              notified. An activity log records who created it and later
              changes.
            </p>
          </section>

          <section id="drafts" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Drafts</h2>
            <p>
              Use <strong>Save Draft</strong> if you need to pause before
              submitting (for example, waiting on details or photos). The form
              also autosaves locally as you type.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Hotel is required to save a draft.</li>
              <li>
                Drafts show on the{" "}
                <Link href="/dashboard" className="text-[#0b1f3a] font-medium hover:underline">
                  Dashboard
                </Link>{" "}
                with status <strong>Draft</strong>.
              </li>
              <li>
                Click <strong>Continue</strong> to reopen the form, finish the
                report, then <strong>Submit Report</strong>.
              </li>
            </ul>
          </section>

          <section id="reviewing" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Reviewing reports
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Dashboard</strong> lists reports you are allowed to see
                (your hotel, or all hotels for Corporate). Archived reports are
                hidden from this live list.
              </li>
              <li>
                Search by report number, subject, location, submitted by,
                narrative, or hotel name. Hotel staff search only their hotel;
                Corporate searches the whole portfolio.
              </li>
              <li>
                Filters still work for status, type, hotel (Corporate), and
                date range.
              </li>
              <li>
                An <strong>Aging</strong> badge appears on reports that have
                been open more than 7 days (not draft or closed).
              </li>
              <li>
                Click <strong>View</strong> for the full report, signed photos,
                investigation notes, and the activity / follow-up timeline.
              </li>
              <li>
                Property HR, Hotel Admin, and Corporate Admin can change
                status: Submitted → Under Review → Sent to Corporate → Closed,
                add investigation notes, and leave follow-up comments.
              </li>
              <li>
                Use <strong>Print / Save as PDF</strong> on a report. The
                confidential banner prints with it.
              </li>
            </ul>
          </section>

          <section id="overview-archives" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Overview &amp; Archives
            </h2>
            <p className="mb-2">
              These pages are for <strong>Corporate Admin</strong> only. Other
              roles are sent back to the Dashboard.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <Link href="/overview" className="text-[#0b1f3a] font-medium hover:underline">
                  Overview
                </Link>{" "}
                is the portfolio snapshot: open vs closed vs aging by hotel,
                severity mix, type mix, and reports still open after 7 days.
                Hotel names link into the Dashboard with that hotel filtered.
              </li>
              <li>
                <Link href="/archives" className="text-[#0b1f3a] font-medium hover:underline">
                  Archives
                </Link>{" "}
                holds closed reports that Corporate has removed from hotel
                dashboards. Restore puts them back on the live list. The
                Archives button in the header uses a navy outline so it is easy
                to find on a phone.
              </li>
            </ul>
          </section>

          <section id="admin" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Admin</h2>
            <p>
              Hotel Admins and Corporate Admins can open{" "}
              <Link href="/admin" className="text-[#0b1f3a] font-medium hover:underline">
                Admin
              </Link>{" "}
              from the header.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Assign each user a role and (for property users) a hotel.</li>
              <li>
                <strong>Remove</strong> a user when they leave — they will no
                longer be able to sign in. If they need access later, they create
                a new account.
              </li>
              <li>
                Hotel Admins manage users at their own hotel and can assign
                unassigned users to that hotel. Corporate Admins manage everyone.
              </li>
            </ul>
          </section>

          <section id="password" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Password reset
            </h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                On the{" "}
                <Link href="/login" className="text-[#0b1f3a] font-medium hover:underline">
                  sign-in page
                </Link>
                , click <strong>Forgot password?</strong>
              </li>
              <li>Enter your work email and send the reset link.</li>
              <li>
                Open the email, follow the link, and choose a new password.
              </li>
              <li>Sign in with the new password.</li>
            </ol>
            <p className="mt-3 text-gray-500">
              Check spam/junk if the email does not arrive within a few minutes.
            </p>
          </section>

          <section id="contact" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Who to contact
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Hotel assignment or role</strong> — your Hotel Admin
                or a Corporate Admin.
              </li>
              <li>
                <strong>How to complete a specific report</strong> — your
                Hotel Admin or Property HR.
              </li>
              <li>
                <strong>System-wide questions</strong> — Corporate Admin for HM
                Alpha Hotels &amp; Resorts.
              </li>
            </ul>
            <p className="mt-4 text-gray-500">
              Company site:{" "}
              <a
                href="https://hmalpha.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0b1f3a] hover:underline"
              >
                hmalpha.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-wrap gap-3 text-sm">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-[#0b1f3a] text-white font-medium hover:bg-[#08182e]"
          >
            Sign in
          </Link>
          <Link
            href="/new"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            New Report
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Dashboard
          </Link>
          <Link
            href="/overview"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Overview
          </Link>
          <Link
            href="/archives"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Archives
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Admin
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
