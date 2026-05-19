export const dynamic = "force-dynamic";

import { PhoneCall, Plus } from "lucide-react";

const callList = [
  { name: "Ahmet Yıldız", phone: "+90 532 111 2233", reason: "Randevu takibi", priority: "Normal", status: "Bekliyor" },
  { name: "Zeynep Arslan", phone: "+90 541 222 3344", reason: "İptal sonrası yeniden randevu", priority: "Yüksek", status: "Bekliyor" },
  { name: "Mustafa Çelik", phone: "+90 553 333 4455", reason: "Test sonuçları", priority: "Normal", status: "Tamamlandı" },
];

const priorityColors: Record<string, string> = {
  "Yüksek": "bg-red-50 text-red-700",
  "Normal": "bg-gray-100 text-gray-700",
  "Düşük": "bg-blue-50 text-blue-700",
};

const statusColors: Record<string, string> = {
  "Bekliyor": "bg-yellow-50 text-yellow-700",
  "Tamamlandı": "bg-green-50 text-green-700",
  "İptal": "bg-red-50 text-red-700",
};

export default function CallListPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Arama Listesi</h1>
          <p className="text-sm text-gray-500 mt-1">Geri arama yapılacak hasta listesi</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Hasta</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Telefon</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Sebep</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Öncelik</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Durum</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {callList.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50">
                      <PhoneCall className="h-3 w-3 text-indigo-500" />
                    </div>
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{item.phone}</td>
                <td className="px-4 py-3 text-gray-600">{item.reason}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityColors[item.priority] ?? "bg-gray-100 text-gray-700"}`}>
                    {item.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors">
                    <PhoneCall className="h-3 w-3" />
                    Ara
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
