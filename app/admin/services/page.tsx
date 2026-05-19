import { Wrench } from "lucide-react";

const services = [
  { name: "Dahiliye", description: "İç hastalıkları muayene ve tedavi", duration: "30 dk", price: "₺350" },
  { name: "Kardiyoloji", description: "Kalp ve damar hastalıkları", duration: "45 dk", price: "₺500" },
  { name: "Pediatri", description: "Çocuk sağlığı ve hastalıkları", duration: "30 dk", price: "₺300" },
  { name: "Dermatoloji", description: "Cilt hastalıkları ve tedavisi", duration: "30 dk", price: "₺400" },
  { name: "Ortopedi", description: "Kemik ve eklem hastalıkları", duration: "45 dk", price: "₺450" },
  { name: "Nöroloji", description: "Sinir sistemi hastalıkları", duration: "60 dk", price: "₺600" },
];

export default function ServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hizmetler</h1>
        <p className="text-sm text-gray-500 mt-1">Kliniğimizin sunduğu tıbbi hizmetler</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Hizmet Adı</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Açıklama</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Süre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Ücret</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {services.map((service) => (
              <tr key={service.name} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50">
                      <Wrench className="h-3 w-3 text-indigo-500" />
                    </div>
                    <span className="font-medium text-gray-900">{service.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{service.description}</td>
                <td className="px-4 py-3 text-gray-600">{service.duration}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{service.price}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Aktif
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
