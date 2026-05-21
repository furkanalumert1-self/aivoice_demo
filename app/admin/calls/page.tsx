export const dynamic = "force-dynamic";

import { db } from "@/db";
import { callLogs } from "@/db/schema";
import { sql } from "drizzle-orm";
import { formatDateTime, formatDuration, formatCurrency } from "@/lib/utils";
import { Phone, Download, ExternalLink } from "lucide-react";
import Link from "next/link";

const intentConfig: Record<string, { label: string; className: string }> = {
  randevu_alma: {
    label: "Randevu Alma",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  randevu_iptal: {
    label: "Randevu İptal",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  bilgi: {
    label: "Bilgi",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  geri_arama: {
    label: "Geri Arama",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  diger: {
    label: "Diğer",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

export default async function CallsPage() {
  let callRecords: typeof callLogs.$inferSelect[] = [];
  let dbError = false;

  try {
    callRecords = await db
      .select()
      .from(callLogs)
      .orderBy(sql`${callLogs.createdAt} desc`);
  } catch (error) {
    console.error("Calls fetch error:", error);
    dbError = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Çağrı Kayıtları</h1>
        <p className="text-sm text-gray-500 mt-1">AI asistan tarafından işlenen tüm çağrılar</p>
      </div>

      {dbError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Veritabanı şeması güncellenmesi gerekiyor. Neon Console&apos;da{" "}
          <code className="font-mono text-xs bg-amber-100 px-1 rounded">drizzle/0002_new_tables.sql</code>{" "}
          dosyasını çalıştırın.
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Telefon</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tarih</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Süre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Özet</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Niyet</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Maliyet</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {callRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {dbError ? "Veritabanı hatası — şema güncellenmesi gerekiyor" : "Henüz çağrı kaydı bulunmuyor"}
                  </td>
                </tr>
              ) : (
                callRecords.map((call) => {
                  const intent = intentConfig[call.intent ?? "diger"] ?? intentConfig.diger;
                  return (
                    <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50">
                            <Phone className="h-3 w-3 text-indigo-500" />
                          </div>
                          <span className="font-medium text-gray-900">
                            {call.callerNumber ?? "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDateTime(call.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-gray-600 truncate">{call.summary ?? "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {call.intent ? (
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${intent.className}`}
                          >
                            {intent.label}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(call.cost)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/calls/${call.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Detay
                          </Link>
                          {call.transcript && (
                            <button className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                              <Download className="h-3 w-3" />
                              Transkript
                            </button>
                          )}
                        </div>
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
