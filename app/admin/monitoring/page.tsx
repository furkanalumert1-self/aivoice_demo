export const dynamic = "force-dynamic";

import { db } from "@/db";
import { workflowLogs, workflowHealth } from "@/db/schema";
import { desc } from "drizzle-orm";
import { CheckCircle, XCircle, Activity } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default async function MonitoringPage() {
  let logs: typeof workflowLogs.$inferSelect[] = [];
  let health: typeof workflowHealth.$inferSelect[] = [];
  let dbError = false;

  try {
    [logs, health] = await Promise.all([
      db.select().from(workflowLogs).orderBy(desc(workflowLogs.createdAt)).limit(50),
      db.select().from(workflowHealth).orderBy(workflowHealth.workflowName),
    ]);
  } catch (e) {
    console.error("Monitoring fetch error:", e);
    dbError = true;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workflow Monitoring</h1>
        <p className="text-sm text-gray-500 mt-1">N8N workflow execution durumu ve geçmişi</p>
      </div>

      {dbError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Monitoring tabloları henüz oluşturulmamış. Neon Console&apos;da{" "}
          <code className="font-mono text-xs">drizzle/0003_observability_tables.sql</code> çalıştırın.
        </div>
      )}

      {/* Workflow Health Cards */}
      {health.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {health.map((wf) => (
            <div key={wf.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900 truncate">{wf.workflowName}</p>
                <Activity className="h-4 w-4 text-gray-400" />
              </div>
              <div className="space-y-1 text-xs text-gray-500">
                <p>Başarı Oranı: <span className="font-medium text-gray-900">{wf.successRate ? `${(Number(wf.successRate) * 100).toFixed(1)}%` : "-"}</span></p>
                <p>Ort. Süre: <span className="font-medium text-gray-900">{wf.avgDuration ? `${wf.avgDuration}ms` : "-"}</span></p>
                <p>Başarısız: <span className="font-medium text-red-600">{wf.failedCount ?? 0}</span></p>
                <p>Son Çalışma: <span className="font-medium text-gray-900">{wf.lastExecution ? formatDateTime(wf.lastExecution) : "-"}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Execution Log Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Son Çalışmalar</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Workflow</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Durum</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Süre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Correlation ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tarih</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Hata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  {dbError ? "Tablo bulunamadı" : "Henüz execution kaydı yok"}
                </td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{log.workflowName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                      log.status === "success" ? "bg-green-50 text-green-700 border-green-200" :
                      log.status === "failed" ? "bg-red-50 text-red-700 border-red-200" :
                      "bg-yellow-50 text-yellow-700 border-yellow-200"
                    }`}>
                      {log.status === "success" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.executionDuration ? `${log.executionDuration}ms` : "-"}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.correlationId?.slice(0, 12) ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3 max-w-xs"><p className="text-red-600 truncate text-xs">{log.errorMessage ?? "-"}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
