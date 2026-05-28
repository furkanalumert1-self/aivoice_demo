export const dynamic = "force-dynamic";

import { db } from "@/db";
import { callLogs } from "@/db/schema";
import { sql } from "drizzle-orm";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { Phone, Play, ExternalLink } from "lucide-react";
import Link from "next/link";

const intentConfig: Record<string, { label: string; className: string }> = {
  randevu_alma: {
    label: "Randevu Alma",
    className: "bg-green-100 text-green-800",
  },
  randevu_iptal: {
    label: "Randevu İptal",
    className: "bg-red-100 text-red-800",
  },
  bilgi: {
    label: "Bilgi",
    className: "bg-blue-100 text-blue-800",
  },
  geri_arama: {
    label: "Geri Arama",
    className: "bg-yellow-100 text-yellow-800",
  },
  diger: {
    label: "Diğer",
    className: "bg-gray-100 text-gray-700",
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
          Çağrı verileri şu an yüklenemiyor. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Telefon</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tarih</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Süre</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Özet</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Niyet</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Kayıt</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {callRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Phone className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                    <p className="text-sm text-gray-400">
                      {dbError ? "Veritabanı hatası" : "Henüz çağrı kaydı bulunmuyor"}
                    </p>
                  </td>
                </tr>
              ) : (
                callRecords.map((call) => {
                  const intent = intentConfig[call.intent ?? "diger"] ?? intentConfig.diger;
                  return (
                    <tr key={call.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 shrink-0">
                            <Phone className="h-3.5 w-3.5 text-indigo-500" />
                          </div>
                          <span className="font-medium text-gray-900">{call.callerNumber ?? "-"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        {formatDateTime(call.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-gray-600 truncate">{call.summary ?? "-"}</p>
                      </td>
                      <td className="px-5 py-4">
                        {call.intent ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${intent.className}`}>
                            {intent.label}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {call.recordingUrl ? (
                          <a
                            href={call.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            <Play className="h-3 w-3" />
                            Dinle
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/calls/${call.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Detay
                        </Link>
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
