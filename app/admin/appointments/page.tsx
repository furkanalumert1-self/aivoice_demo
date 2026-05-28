export const dynamic = "force-dynamic";

import { db } from "@/db";
import { appointments } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Calendar, User } from "lucide-react";

type AppointmentRow = {
  id: string;
  patientName: string;
  doctorName: string | null;
  appointmentAt: Date | null;
  status: string | null;
  createdAt: Date | null;
};

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Randevu Kayıtları</h1>
        <p className="text-sm text-gray-500 mt-1">AI asistan tarafından oluşturulan tüm randevular</p>
      </div>

      {dbError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Randevu verileri şu an yüklenemiyor. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Hasta</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Doktor</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tarih</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Saat</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointmentRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                    <p className="text-sm text-gray-400">
                      {dbError ? "Veritabanı hatası" : "Henüz randevu kaydı bulunmuyor"}
                    </p>
                  </td>
                </tr>
              ) : (
                appointmentRecords.map((appt) => {
                  const isIptal = appt.status === "iptal";
                  return (
                    <tr key={appt.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 shrink-0">
                            <User className="h-3.5 w-3.5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{appt.patientName ?? "-"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{appt.doctorName ?? "-"}</td>
                      <td className="px-5 py-4 text-gray-600">
                        {appt.appointmentAt
                          ? new Date(appt.appointmentAt).toLocaleDateString("tr-TR", {
                              day: "numeric", month: "long", year: "numeric",
                            })
                          : "-"}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {appt.appointmentAt
                          ? new Date(appt.appointmentAt).toLocaleTimeString("tr-TR", {
                              hour: "2-digit", minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isIptal
                            ? "bg-red-50 text-red-700"
                            : "bg-green-50 text-green-700"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isIptal ? "bg-red-500" : "bg-green-500"}`} />
                          {isIptal ? "İptal" : "Aktif"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
