export const dynamic = "force-dynamic";

import { db } from "@/db";
import { callLogs, appointments } from "@/db/schema";
import { sql, count, eq } from "drizzle-orm";
import { Phone, TrendingUp, Clock, Calendar } from "lucide-react";
import { formatDuration } from "@/lib/utils";

export default async function AnalyticsPage() {
  let stats = {
    totalCalls: 0, avgDuration: 0, totalCost: "0.00",
    byIntent: [] as {intent: string|null, cnt: number}[],
    byStatus: [] as {status: string|null, cnt: number}[],
    appointmentConversion: 0,
  };
  let dbError = false;

  try {
    const [total, avgDur, totalCostRes, byIntent, byStatus, totalAppts] = await Promise.all([
      db.select({ count: count() }).from(callLogs),
      db.select({ avg: sql<number>`round(avg(${callLogs.duration}))` }).from(callLogs),
      db.select({ total: sql<number>`sum(cast(${callLogs.cost} as numeric))` }).from(callLogs),
      db.select({ intent: callLogs.intent, cnt: count() }).from(callLogs).groupBy(callLogs.intent),
      db.select({ status: appointments.status, cnt: count() }).from(appointments).groupBy(appointments.status),
      db.select({ count: count() }).from(appointments).where(eq(appointments.source, "voice_agent")),
    ]);
    const totalCallsCount = total[0].count;
    stats = {
      totalCalls: totalCallsCount,
      avgDuration: Math.round(avgDur[0]?.avg ?? 0),
      totalCost: Number(totalCostRes[0]?.total ?? 0).toFixed(2),
      byIntent: byIntent.map(r => ({ intent: r.intent, cnt: Number(r.cnt) })),
      byStatus: byStatus.map(r => ({ status: r.status, cnt: Number(r.cnt) })),
      appointmentConversion: totalCallsCount > 0 ? Math.round((totalAppts[0].count / totalCallsCount) * 100) : 0,
    };
  } catch (e) {
    console.error("Analytics error:", e);
    dbError = true;
  }

  const intentLabels: Record<string, string> = {
    randevu_alma: "Randevu Alma", randevu_iptal: "İptal",
    bilgi: "Bilgi", geri_arama: "Geri Arama", diger: "Diğer",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Çağrı Analitiği</h1>
        <p className="text-sm text-gray-500 mt-1">Performans metrikleri ve istatistikler</p>
      </div>

      {dbError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Veri yüklenemedi. Neon bağlantısını kontrol edin.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Toplam Çağrı", value: stats.totalCalls, icon: Phone, color: "bg-indigo-50 text-indigo-600" },
          { label: "Ort. Süre", value: formatDuration(stats.avgDuration), icon: Clock, color: "bg-blue-50 text-blue-600" },
          { label: "Toplam Maliyet", value: `$${stats.totalCost}`, icon: TrendingUp, color: "bg-amber-50 text-amber-600" },
          { label: "Randevu Dönüşüm", value: `${stats.appointmentConversion}%`, icon: Calendar, color: "bg-green-50 text-green-600" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <div className={`rounded-lg p-2 ${card.color}`}><Icon className="h-4 w-4" /></div>
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Niyet Dağılımı</h2>
          </div>
          <div className="p-6 space-y-3">
            {stats.byIntent.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Veri yok</p>
            ) : stats.byIntent.map(({ intent, cnt }) => (
              <div key={intent ?? "diger"} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{intentLabels[intent ?? "diger"] ?? intent ?? "Diğer"}</span>
                <span className="text-sm font-semibold text-gray-900">{cnt}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Randevu Durumları</h2>
          </div>
          <div className="p-6 space-y-3">
            {stats.byStatus.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Veri yok</p>
            ) : stats.byStatus.map(({ status, cnt }) => (
              <div key={status ?? "bilinmiyor"} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 capitalize">{status ?? "Bilinmiyor"}</span>
                <span className="text-sm font-semibold text-gray-900">{cnt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
