export const dynamic = "force-dynamic";

import { Brain } from "lucide-react";

const specialties = [
  { name: "Dahiliye", description: "İç hastalıkları ve genel tıp", doctorCount: 1 },
  { name: "Kardiyoloji", description: "Kalp ve damar hastalıkları", doctorCount: 1 },
  { name: "Pediatri", description: "Çocuk sağlığı ve hastalıkları", doctorCount: 1 },
  { name: "Dermatoloji", description: "Cilt ve zührevi hastalıklar", doctorCount: 0 },
  { name: "Ortopedi", description: "Kas ve iskelet sistemi", doctorCount: 0 },
  { name: "Nöroloji", description: "Beyin ve sinir sistemi", doctorCount: 0 },
  { name: "Göz Hastalıkları", description: "Göz sağlığı ve tedavisi", doctorCount: 0 },
  { name: "Kulak Burun Boğaz", description: "KBB hastalıkları", doctorCount: 0 },
];

export default function SpecialtiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Uzmanlık Alanları</h1>
        <p className="text-sm text-gray-500 mt-1">Klinikte mevcut tıbbi uzmanlık alanları</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specialties.map((specialty) => (
          <div key={specialty.name} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                <Brain className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{specialty.name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-3">{specialty.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {specialty.doctorCount} doktor
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                specialty.doctorCount > 0 
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {specialty.doctorCount > 0 ? "Aktif" : "Doktor Yok"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
