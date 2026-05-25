export const dynamic = "force-dynamic";

import { db } from "@/db";
import { callLogs, appointments } from "@/db/schema";
import { sql, eq, gte, count } from "drizzle-orm";
import { Phone, Calendar, Clock, XCircle } from "lucide-react";
import { formatDuration, formatDateTime } from "@/lib/utils";
import Link from "next/link";

const intentConfig: Record<string, { label: string; dot: string }> = {
  randevu_alma:  { label: "Randevu Alma",  dot: "bg-green-500" },
  randevu_iptal: { label: "Randevu İptal", dot: "bg-red-500"   },
  bilgi:         { label: "Bilgi",         dot: "bg-blue-500"  },
  geri_arama:    { label: "Geri Arama",    dot: "bg-yellow-500"},
  diger:         { label: "Diğer",         dot: "bg-gray-400"  },
};

const emptyStats = {
  todayCallCount: 0,
  aiAppointmentCount: 0,
  avgDuration: 0,
  cancelledCount: 0,
  recentCalls: [] as typeof callLogs.$inferSelect[],
  recentAppointments: [] as typeof appointments.$inferSelect[],
};

async function getStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCalls, aiAppointments, avgDurationResult, cancelledAppointments, recentCalls, recentAppointments] =
      await Promise.all([
        db.select({ count: count() }).from(callLogs).where(gte(callLogs.createdAt, today)),
        db.select({ count: count() }).from(appointments).where(eq(appointments.source, "voice_agent")),
        db.select({ avg: sql<number>`round(avg(${callLogs.duration}))` }).from(callLogs),
        db.select({ count: count() }).from(appointments).where(eq(appointments.status, "iptal")),
        db.select().from(callLogs).orderBy(sql`${callLogs.createdAt} desc`).limit(6),
        db.select().from(appointments).orderBy(sql`${appointments.createdAt} desc`).limit(6),
      ]);

    return {
      todayCallCount: todayCalls[0].count,
      aiAppointmentCount: aiAppointments[0].count,
      avgDuration: Math.round(avgDurationResult[0]?.avg ?? 0),
      cancelledCount: cancelledAppointments[0].count,
      recentCalls,
      recentAppointments,
    };
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return emptyStats;
  }
}

export default async function AdminPage() {
  const stats = await getStats();

  const statCards = [
    {
      label: "Bugünkü Çağrı",
      value: stats.todayCallCount,
      icon: Phone,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-100",
    },
    {
      label: "AI Randevu",
      value: stats.aiAppointmentCount,
      icon: Calendar,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
    },
    {
      label: "Ort. Görüşme Süresi",
      value: formatDuration(stats.avgDuration),
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "İptal Edilen Randevu",
      value: stats.cancelledCount,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Klinik AI Call Center — canlı özet</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-2xl border ${card.border} bg-white p-6 shadow-sm`}>
              <div className={`inline-flex rounded-xl p-2.5 ${card.bg} mb-4`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="mt-1 text-sm text-gray-500">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Two-column content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Calls */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Son Çağrılar</h2>
            <Link href="/admin/calls" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              Tümünü gör →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Phone className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Henüz çağrı kaydı yok</p>
              </div>
            ) : (
              stats.recentCalls.map((call) => {
                const cfg = intentConfig[call.intent ?? "diger"] ?? intentConfig.diger;
                return (
                  <div key={call.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 shrink-0">
                      <Phone className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {call.callerNumber ?? "Bilinmiyor"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        <span className="text-xs text-gray-400">{cfg.label}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">{formatDuration(call.duration)}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(call.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Son Randevular</h2>
            <Link href="/admin/appointments" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              Tümünü gör →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Calendar className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Henüz randevu kaydı yok</p>
              </div>
            ) : (
              stats.recentAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 shrink-0">
                    <Calendar className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {appt.patientName ?? "Bilinmiyor"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{appt.doctorName ?? "-"}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    appt.status === "iptal"
                      ? "bg-red-50 text-red-700"
                      : "bg-green-50 text-green-700"
                  }`}>
                    {appt.status === "iptal" ? "İptal" : "Aktif"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
