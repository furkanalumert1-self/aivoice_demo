export const dynamic = "force-dynamic";

import { db } from "@/db";
import { appointments } from "@/db/schema";
import { sql } from "drizzle-orm";
import { formatDateTime, formatTime, statusLabels, statusColors, sourceLabels } from "@/lib/utils";
import { Calendar, User } from "lucide-react";

export default async function AppointmentsPage() {
  let appointmentRecords: typeof appointments.$inferSelect[] = [];
  let dbError = false;

  try {
    appointmentRecords = await db
      .select()
      .from(appointments)
      .orderBy(sql`${appointments.appointmentAt} desc`);
  } catch (error) {
    console.error("Appointments fetch error:", error);
    dbError = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Randevu Kayıtları</h1>
        <p className="text-sm text-gray-500 mt-1">Tüm hasta randevuları</p>
      </div>

      {dbError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Veritabanı şeması güncellenmesi gerekiyor. Neon Console&apos;da{" "}
          <code className="font-mono text-xs bg-amber-100 px-1 rounded">drizzle/0001_add_missing_columns.sql</code>{" "}
          dosyasını çalıştırın.
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Hasta</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Doktor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tarih</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Saat</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Durum</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Kaynak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointmentRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    {dbError ? "Veritabanı hatası — şema güncellenmesi gerekiyor" : "Henüz randevu kaydı bulunmuyor"}
                  </td>
                </tr>
              ) : (
                appointmentRecords.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100">
                          <User className="h-3 w-3 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{appt.patientName ?? "-"}</p>
                          <p className="text-xs text-gray-400">{appt.phone ?? ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{appt.doctorName ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {appt.appointmentAt
                          ? new Date(appt.appointmentAt).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatTime(appt.appointmentAt)}
                    </td>
                    <td className="px-4 py-3">
                      {appt.status ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            statusColors[appt.status] ?? "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {statusLabels[appt.status] ?? appt.status}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {appt.source ? (sourceLabels[appt.source] ?? appt.source) : "-"}
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
