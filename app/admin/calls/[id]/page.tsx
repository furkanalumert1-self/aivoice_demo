export const dynamic = "force-dynamic";

import { db } from "@/db";
import { callLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { Phone, Clock, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

const intentConfig: Record<string, { label: string; className: string }> = {
  randevu_alma:  { label: "Randevu Alma",  className: "bg-green-100 text-green-800" },
  randevu_iptal: { label: "Randevu İptal", className: "bg-red-100 text-red-800"   },
  bilgi:         { label: "Bilgi",         className: "bg-blue-100 text-blue-800"  },
  geri_arama:    { label: "Geri Arama",    className: "bg-yellow-100 text-yellow-800" },
  diger:         { label: "Diğer",         className: "bg-gray-100 text-gray-700"  },
};

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let call: typeof callLogs.$inferSelect | undefined;
  try {
    const results = await db.select().from(callLogs).where(eq(callLogs.id, id)).limit(1);
    call = results[0];
  } catch {
    // DB error
  }

  if (!call) notFound();

  const intent = intentConfig[call.intent ?? "diger"] ?? intentConfig.diger;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link
        href="/admin/calls"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Çağrı Kayıtları
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Çağrı Detayı</h1>
          <p className="text-sm text-gray-500 mt-1">{formatDateTime(call.createdAt)}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${intent.className}`}>
          {intent.label}
        </span>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Phone className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wide">Arayan</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{call.callerNumber ?? "-"}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium uppercase tracking-wide">Süre</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{formatDuration(call.duration)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wide">Durum</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 capitalize">{call.callStatus ?? "completed"}</p>
        </div>
      </div>

      {/* Audio player */}
      {call.recordingUrl && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Ses Kaydı</h2>
          <audio
            controls
            src={`/api/audio/proxy?url=${encodeURIComponent(call.recordingUrl)}`}
            className="w-full rounded-lg"
            preload="metadata"
          >
            Tarayıcınız ses oynatmayı desteklemiyor.
          </audio>
        </div>
      )}

      {/* Summary */}
      {call.summary && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Çağrı Özeti</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{call.summary}</p>
        </div>
      )}

      {/* Transcript */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Transkript</h2>
        </div>
        {call.transcript ? (
          <pre className="whitespace-pre-wrap text-sm text-gray-600 leading-relaxed font-sans">
            {call.transcript}
          </pre>
        ) : (
          <p className="text-sm text-gray-400 italic">Bu çağrıya ait transkript bulunmuyor.</p>
        )}
      </div>
    </div>
  );
}
