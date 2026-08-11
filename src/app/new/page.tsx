import Header from "@/components/Header";
import NewIncidentForm from "@/components/NewIncidentForm";
import RequireAuth from "@/components/RequireAuth";

export default function NewIncidentPage() {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <NewIncidentForm />
        </main>
      </div>
    </RequireAuth>
  );
}
