import Link from "next/link";
import Header from "@/components/Header";

const sections = [
  { id: "getting-started", label: "Getting started" },
  { id: "roles", label: "Roles" },
  { id: "file-report", label: "Filing a report" },
  { id: "drafts", label: "Drafts" },
  { id: "reviewing", label: "Reviewing reports" },
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
            properties.
          </p>
        </div>

        {/* On this page */}
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
          {/* Getting started */}
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
                A <strong>Property Admin</strong> or <strong>Corporate Admin</strong>{" "}
                must assign you to a hotel (and a role) before you can submit
                reports.
              </li>
              <li>
                After you are assigned, open{" "}
                <Link href="/new" className="text-[#0b1f3a] font-medium hover:underline">
                  New Report
                </Link>{" "}
                to file an incident.
              </li>
            </ol>
            <p className="mt-3 text-gray-500">
              If you see a message that your hotel is not assigned yet, contact
              your Property Admin or Corporate Admin.
            </p>
          </section>

          {/* Roles */}
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
                      reports for that hotel.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      Property HR
                    </td>
                    <td className="px-4 py-3">
                      Same hotel view as above, plus update investigation notes
                      and change report status. Cannot manage users.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      Property Admin
                    </td>
                    <td className="px-4 py-3">
                      Full access for their hotel: reports, status changes, and
                      managing users at that property (roles, remove users).
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      Corporate Admin
                    </td>
                    <td className="px-4 py-3">
                      See all hotels, manage all users, and update any report.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Filing a report */}
          <section id="file-report" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Filing a report
            </h2>
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
                Fill in type, severity, date/time, location, people involved, and
                the narrative. Fields marked required must be completed before
                submit.
              </li>
              <li>
                Optionally attach photos or videos and note EMS, medical refusal,
                or police involvement.
              </li>
              <li>
                Click <strong>Submit Report</strong> when the report is ready.
              </li>
            </ol>
            <p className="mt-3">
              After submit, the report appears on the Dashboard with status{" "}
              <strong>Submitted</strong>. Property and Corporate Admins may
              receive an email notification when email is configured.
            </p>
          </section>

          {/* Drafts */}
          <section id="drafts" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Drafts</h2>
            <p>
              Use <strong>Save Draft</strong> if you need to pause before
              submitting (for example, waiting on details or photos).
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

          {/* Reviewing */}
          <section id="reviewing" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Reviewing reports
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Dashboard</strong> lists reports you are allowed to see
                (your hotel, or all hotels for Corporate).
              </li>
              <li>
                Use filters for status, type, hotel (Corporate), and date range.
              </li>
              <li>
                <strong>Export CSV</strong> downloads the filtered list for
                Excel.
              </li>
              <li>
                Click <strong>View</strong> to open the full report, photos, and
                notes.
              </li>
              <li>
                Property HR, Property Admin, and Corporate Admin can change
                status: Submitted → Under Review → Sent to Corporate → Closed,
                and add investigation notes.
              </li>
              <li>
                Use <strong>Print / Save as PDF</strong> on a report to print or
                save a copy.
              </li>
            </ul>
          </section>

          {/* Admin */}
          <section id="admin" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Admin</h2>
            <p>
              Property Admins and Corporate Admins can open{" "}
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
                Property Admins only manage users at their own hotel. Corporate
                Admins manage everyone.
              </li>
            </ul>
          </section>

          {/* Password */}
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

          {/* Contact */}
          <section id="contact" className="scroll-mt-20">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Who to contact
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Hotel assignment or role</strong> — your Property Admin
                or a Corporate Admin.
              </li>
              <li>
                <strong>How to complete a specific report</strong> — your
                Property Admin or Property HR.
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
