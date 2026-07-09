export const dynamic = "force-dynamic";

import { db } from "@/db";
import { appointments } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

type AppointmentRow = {
  id: string;
  patientName: string;
  doctorName: string | null;
  appointmentAt: Date | null;
  status: string | null;
  createdAt: Date | null;
};

const statusConfig: Record<string, { label: string; dot: string; chip: string }> = {
  onaylandi:   { label: "Onaylandı",  dot: "bg-teal-500",   chip: "bg-teal-50 text-teal-700"   },
  bekliyor:    { label: "Bekliyor",   dot: "bg-amber-500",  chip: "bg-amber-50 text-amber-700"  },
  tamamlandi:  { label: "Tamamlandı", dot: "bg-blue-500",   chip: "bg-blue-50 text-blue-700"    },
  iptal:       { label: "İptal",      dot: "bg-red-500",    chip: "bg-red-50 text-red-700"      },
};

function StatusChip({ status }: { status: string | null }) {
  const cfg = statusConfig[status ?? ""] ?? { label: status ?? "—", dot: "bg-gray-400", chip: "bg-gray-100 text-gray-600" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", cfg.chip)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export default async function AppointmentsPage() {
  let appointmentRecords: AppointmentRow[] = [];
  let dbError = false;

  try {
    appointmentRecords = await db
      .select({
        id: appointments.id,
        patientName: appointments.patientName,
        doctorName: appointments.doctorName,
        appointmentAt: appointments.appointmentAt,
        status: appointments.status,
        createdAt: appointments.createdAt,
      })
      .from(appointments)
      .orderBy(desc(appointments.createdAt));
  } catch (error) {
    console.error("APPOINTMENTS_ERROR", error);
    dbError = true;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Randevu Kayıtları</h1>
          <p className="mt-0.5 text-sm text-gray-500">AI asistan tarafından oluşturulan tüm randevular</p>
        </div>
        {/* Summary chips */}
        <div className="flex gap-2">
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const c = appointmentRecords.filter((a) => (a.status ?? "onaylandi") === key).length;
            if (c === 0) return null;
            return (
              <span key={key} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", cfg.chip)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                {cfg.label} · <span className="tnum">{c}</span>
              </span>
            );
          })}
        </div>
      </div>

      {dbError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Randevu verileri şu an yüklenemiyor. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                {["Hasta", "Doktor", "Tarih", "Saat", "Durum"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left label-mono text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointmentRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-20 text-center">
                    <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                    <p className="text-[13px] text-gray-400">
                      {dbError ? "Veritabanı hatası" : "Henüz randevu kaydı bulunmuyor"}
                    </p>
                  </td>
                </tr>
              ) : (
                appointmentRecords.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
                          <User className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <p className="font-medium text-gray-900">{appt.patientName ?? "—"}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{appt.doctorName ?? "—"}</td>
                    <td className="px-5 py-3.5 tnum text-gray-600">
                      {appt.appointmentAt
                        ? new Date(appt.appointmentAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 tnum text-gray-600">
                      {appt.appointmentAt
                        ? new Date(appt.appointmentAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusChip status={appt.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
