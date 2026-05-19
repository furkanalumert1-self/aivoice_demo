export const dynamic = "force-dynamic";

import { ClipboardList } from "lucide-react";

export default function FormsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Form Kayıtları</h1>
        <p className="text-sm text-gray-500 mt-1">Hasta tarafından doldurulan formlar</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
            <ClipboardList className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">Henüz form kaydı yok</h3>
          <p className="text-sm text-gray-400">
            Hastalar form doldurduğunda burada görünecek
          </p>
        </div>
      </div>
    </div>
  );
}
