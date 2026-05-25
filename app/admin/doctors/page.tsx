export const dynamic = "force-dynamic";

import { db } from "@/db";
import { doctors } from "@/db/schema";
import { Stethoscope, Clock } from "lucide-react";

const dayLabels: Record<string, string> = {
  mon: "Pzt",
  tue: "Sal",
  wed: "Çar",
  thu: "Per",
  fri: "Cum",
  sat: "Cmt",
  sun: "Paz",
};

export default async function DoctorsPage() {
  let doctorRecords: typeof doctors.$inferSelect[] = [];
  let dbError = false;

  try {
    doctorRecords = await db.select().from(doctors);
  } catch (error) {
    console.error("Doctors fetch error:", error);
    dbError = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Doktor / Takvim</h1>
        <p className="text-sm text-gray-500 mt-1">Klinik doktorları ve takvimleri</p>
      </div>

      {dbError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Doktor verileri şu an yüklenemiyor. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
        </div>
      )}

      {doctorRecords.length === 0 && !dbError ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          Henüz doktor kaydı bulunmuyor.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctorRecords.map((doctor) => {
            const wh = doctor.workingHours as Record<string, string | null> | null;
            const activeDays = wh
              ? Object.entries(wh).filter(([, v]) => v)
              : [];

            return (
              <div key={doctor.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                    <Stethoscope className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{doctor.fullName}</p>
                    <p className="text-sm text-gray-500">{doctor.specialization}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Durum</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        doctor.active
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {doctor.active ? "Aktif" : "Pasif"}
                    </span>
                  </div>

                  {activeDays.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-gray-500 mb-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Çalışma Saatleri</span>
                      </div>
                      <div className="space-y-0.5 pl-5">
                        {activeDays.map(([day, hours]) => (
                          <div key={day} className="flex justify-between text-xs">
                            <span className="text-gray-500 w-8">{dayLabels[day] ?? day}</span>
                            <span className="text-gray-700">{hours}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
