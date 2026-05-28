export const dynamic = "force-dynamic";

import { db } from "@/db";
import { callLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { Phone, Play, ExternalLink, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

const intentConfig: Record<string, { label: string; className: string }> = {
  randevu_alma:  { label: "Randevu Alma",  className: "bg-green-100 text-green-800" },
  randevu_iptal: { label: "Randevu İptal", className: "bg-red-100 text-red-800"   },
  bilgi:         { label: "Bilgi",         className: "bg-blue-100 text-blue-800"  },
  geri_arama:    { label: "Geri Arama",    className: "bg-yellow-100 text-yellow-800" },
  diger:         { label: "Diğer",         className: "bg-gray-100 text-gray-700"  },
};

type ErrorKind = "migration" | "connection" | "unknown";

function classifyError(err: unknown): ErrorKind {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (msg.includes("relation") && msg.includes("does not exist")) return "migration";
  if (msg.includes("column") && msg.includes("does not exist")) return "migration";
  if (msg.includes("connect") || msg.includes("timeout") || msg.includes("enotfound")) return "connection";
  return "unknown";
}

export default async function CallsPage() {
  let callRecords: typeof callLogs.$inferSelect[] = [];
  let errorKind: ErrorKind | null = null;

  try {
    callRecords = await db
      .select()
      .from(callLogs)
      .orderBy(desc(callLogs.createdAt));
  } catch (error) {
    console.error("[CallsPage] DB error:", error instanceof Error ? error.message : error);
    errorKind = classifyError(error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Çağrı Kayıtları</h1>
        <p className="text-sm text-gray-500 mt-1">AI asistan tarafından işlenen tüm çağrılar</p>
      </div>

      {/* Migration error — actionable */}
      {errorKind === "migration" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-900">Veritabanı şeması güncellenmesi gerekiyor</p>
              <p className="text-sm text-amber-800">
                <code className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">call_logs</code> tablosu veya bir kolonu eksik.
                Neon Console → SQL Editor'da şu dosyayı çalıştırın:
              </p>
              <code className="block font-mono text-xs bg-amber-100 text-amber-900 px-3 py-2 rounded-lg">
                drizzle/0004_ensure_call_logs.sql
              </code>
              <p className="text-xs text-amber-700 mt-1">
                Bu migration idempotent — birden fazla kez çalıştırmak güvenlidir.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection error */}
      {errorKind === "connection" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3">
          <RefreshCw className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-800">
            Veritabanı bağlantısı kurulamadı. <code className="font-mono text-xs">DATABASE_URL</code> env değişkenini kontrol edin.
          </p>
        </div>
      )}

      {/* Generic error */}
      {errorKind === "unknown" && (
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
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {callRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Phone className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                    <p className="text-sm text-gray-400">
                      {errorKind ? "Veri yüklenemedi" : "Henüz çağrı kaydı bulunmuyor"}
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
                          <span className="font-medium text-gray-900">
                            {call.callerNumber || "Bilinmiyor"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        {formatDateTime(call.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-gray-600 truncate">
                          {call.summary || "Özet bulunmuyor"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {call.intent ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${intent.className}`}>
                            {intent.label}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
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
