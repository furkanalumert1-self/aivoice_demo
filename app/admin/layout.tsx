import { Sidebar } from "@/components/sidebar";
import { AdminShell } from "@/components/admin-shell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminShell>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="ml-64 flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </AdminShell>
  );
}
