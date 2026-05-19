export const dynamic = "force-dynamic";

import { Stethoscope } from "lucide-react";

const doctors = [
  { name: "Dr. Ayşe Kaya", specialty: "Dahiliye", phone: "+90 212 555 01 01", status: "Aktif" },
  { name: "Dr. Mehmet Yılmaz", specialty: "Kardiyoloji", phone: "+90 212 555 01 02", status: "Aktif" },
  { name: "Dr. Fatma Demir", specialty: "Pediatri", phone: "+90 212 555 01 03", status: "Aktif" },
];

export default function DoctorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Doktor / Takvim</h1>
        <p className="text-sm text-gray-500 mt-1">Klinik doktorları ve takvimleri</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((doctor) => (
          <div key={doctor.name} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                <Stethoscope className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{doctor.name}</p>
                <p className="text-sm text-gray-500">{doctor.specialty}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Telefon</span>
                <span className="text-gray-700">{doctor.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Durum</span>
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  {doctor.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
