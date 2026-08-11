"use client";

import { Suspense } from "react";
import Header from "@/components/Header";
import NewIncidentForm from "@/components/NewIncidentForm";
import RequireAuth from "@/components/RequireAuth";

function FormShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-8 px-4 sm:px-6 lg:px-8">
        <NewIncidentForm />
      </main>
    </div>
  );
}

export default function NewIncidentPage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">
            Loading form…
          </div>
        }
      >
        <FormShell />
      </Suspense>
    </RequireAuth>
  );
}
