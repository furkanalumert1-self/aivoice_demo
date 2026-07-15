export const dynamic = "force-dynamic";

import { db } from "@/db";
import { callLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Phone, AlertTriangle, RefreshCw } from "lucide-react";
import { CallsList, type CallRow } from "@/components/calls-list";
import { SyncCallsButton } from "@/components/sync-calls-button";

type ErrorKind = "migration" | "connection" | "unknown";

function classifyError(err: unknown): ErrorKind {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if ((msg.includes("relation") || msg.includes("column")) && msg.includes("does not exist")) return "migration";
  if (msg.includes("connect") || msg.includes("timeout") || msg.includes("enotfound")) return "connection";
  return "unknown";
}

export default async function CallsPage() {
  let callRecords: CallRow[] = [];
  let errorKind: ErrorKind | null = null;

  try {
    callRecords = await db
      .select({
        id: callLogs.id,
        callerNumber: callLogs.callerNumber,
        vapiCallId: callLogs.vapiCallId,
        transcript: callLogs.transcript,
        summary: callLogs.summary,
        duration: callLogs.duration,
        intent: callLogs.intent,
        callStatus: callLogs.callStatus,
        cost: callLogs.cost,
        recordingUrl: callLogs.recordingUrl,
        createdAt: callLogs.createdAt,
      })
      .from(callLogs)
      .orderBy(desc(callLogs.createdAt));
  } catch (error) {
    console.error("[CallsPage] DB error:", error instanceof Error ? error.message : error);
    errorKind = classifyError(error);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Çağrı Kayıtları</h1>
          <p className="mt-0.5 text-sm text-gray-500">AI asistan tarafından işlenen tüm çağrılar · satıra tıkla → transkript</p>
        </div>
        <SyncCallsButton />
      </div>

      {/* Errors */}
      {errorKind === "migration" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Veritabanı şeması güncellenmesi gerekiyor</p>
              <p className="text-sm text-amber-800 mt-0.5">
                <code className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">call_logs</code> tablosu veya kolonu eksik.
              </p>
            </div>
          </div>
        </div>
      )}

      {errorKind === "connection" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3">
          <RefreshCw className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-800">Veritabanı bağlantısı kurulamadı. <code className="font-mono text-xs">DATABASE_URL</code> env değişkenini kontrol edin.</p>
        </div>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {callRecords.length === 0 && !errorKind ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Phone className="h-10 w-10 mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">Henüz çağrı kaydı bulunmuyor</p>
          </div>
        ) : (
          <CallsList calls={callRecords} />
        )}
      </div>
    </div>
  );
}
