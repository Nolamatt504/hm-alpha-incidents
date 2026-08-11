import Link from "next/link";
import Header from "@/components/Header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
            HM Alpha Incident Reporting
          </h1>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[#0b1f3a] text-white font-medium hover:bg-[#08182e] transition"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Go to Dashboard
            </Link>
          </div>

          <p className="mt-10 text-xs text-gray-400">
            Built for HM Alpha Hotels & Resorts · hmalpha.com
          </p>
        </div>
      </div>
    </div>
  );
}
