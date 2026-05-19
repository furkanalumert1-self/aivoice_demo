import { formatTime, statusLabels, statusColors, sourceLabels } from "@/lib/utils";
import { Calendar, User } from "lucide-react";
import type { Appointment } from "@/db/schema";

interface AppointmentsTableProps {
  appointments: Appointment[];
  compact?: boolean;
}

export function RecentAppointmentsTable({ appointments, compact = false }: AppointmentsTableProps) {
  if (appointments.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-sm text-gray-400">
        Henüz randevu kaydı yok
      </p>
    );
  }

  if (compact) {
    return (
      <div className="divide-y divide-gray-50">
        {appointments.map((appt) => (
          <div key={appt.id} className="flex items-center gap-4 px-6 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 shrink-0">
              <User className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {appt.patientName ?? "Bilinmiyor"}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {appt.doctorName ?? "-"}
              </p>
            </div>
            <div className="text-right shrink-0">
              {appt.status && (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                    statusColors[appt.status] ?? "bg-gray-100 text-gray-700 border-gray-200"
                  }`}
                >
                  {statusLabels[appt.status] ?? appt.status}
                </span>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                {formatTime(appt.appointmentAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
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
          {appointments.map((appt) => (
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
                ) : "-"}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {appt.source ? (sourceLabels[appt.source] ?? appt.source) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
