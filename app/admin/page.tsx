export const dynamic = "force-dynamic";

import { db } from "@/db";
import { callLogs, appointments, notifications } from "@/db/schema";
import { sql, eq, gte, count } from "drizzle-orm";
import { Phone, Calendar, Clock, DollarSign, XCircle, Bell } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import Link from "next/link";

const emptyStats = {
  todayCallCount: 0,
  aiAppointmentCount: 0,
  avgDuration: 0,
  totalCost: "0.00",
  cancelledCount: 0,
  recentCalls: [] as typeof callLogs.$inferSelect[],
  unreadNotifications: [] as typeof notifications.$inferSelect[],
};

async function getStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCalls] = await db
      .select({ count: count() })
      .from(callLogs)
      .where(gte(callLogs.createdAt, today));

    const [aiAppointments] = await db
      .select({ count: count() })
      .from(appointments)
      .where(eq(appointments.source, "voice_agent"));

    const avgDurationResult = await db
      .select({ avg: sql<number>`avg(${callLogs.duration})` })
      .from(callLogs);

    const totalCostResult = await db
      .select({ total: sql<number>`sum(cast(${callLogs.cost} as numeric))` })
      .from(callLogs);

    const [cancelledAppointments] = await db
      .select({ count: count() })
      .from(appointments)
      .where(eq(appointments.status, "iptal"));

    const recentCalls = await db
      .select()
      .from(callLogs)
      .orderBy(sql`${callLogs.createdAt} desc`)
      .limit(5);

    const unreadNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.isRead, false))
      .orderBy(sql`${notifications.createdAt} desc`)
      .limit(5);

    return {
      todayCallCount: todayCalls.count,
      aiAppointmentCount: aiAppointments.count,
      avgDuration: Math.round(avgDurationResult[0]?.avg ?? 0),
      totalCost: Number(totalCostResult[0]?.total ?? 0).toFixed(2),
      cancelledCount: cancelledAppointments.count,
      recentCalls,
      unreadNotifications,
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
      color: "bg-indigo-50 text-indigo-600",
      border: "border-indigo-100",
    },
    {
      label: "AI Randevu",
      value: stats.aiAppointmentCount,
      icon: Calendar,
      color: "bg-green-50 text-green-600",
      border: "border-green-100",
    },
    {
      label: "Ort. Görüşme Süresi",
      value: formatDuration(stats.avgDuration),
      icon: Clock,
      color: "bg-blue-50 text-blue-600",
      border: "border-blue-100",
    },
    {
      label: "Toplam AI Maliyeti",
      value: `$${stats.totalCost}`,
      icon: DollarSign,
      color: "bg-amber-50 text-amber-600",
      border: "border-amber-100",
    },
    {
      label: "İptal Edilen Randevu",
      value: stats.cancelledCount,
      icon: XCircle,
      color: "bg-red-50 text-red-600",
      border: "border-red-100",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Klinik AI Call Center genel bakış</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`rounded-xl border ${card.border} bg-white p-5 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <div className={`rounded-lg p-2 ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Calls */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Son Çağrılar</h2>
            <Link href="/admin/calls" className="text-xs text-indigo-600 hover:underline">
              Tümünü gör
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentCalls.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">Henüz çağrı kaydı yok</p>
            ) : (
              stats.recentCalls.map((call) => (
                <div key={call.id} className="flex items-center gap-4 px-6 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
                    <Phone className="h-3.5 w-3.5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {call.callerNumber ?? "Bilinmiyor"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{call.summary?.slice(0, 60) ?? "-"}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDuration(call.duration)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Bildirimler</h2>
            <Bell className="h-4 w-4 text-gray-400" />
          </div>
          <div className="divide-y divide-gray-50">
            {stats.unreadNotifications.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">Okunmamış bildirim yok</p>
            ) : (
              stats.unreadNotifications.map((notif) => (
                <div key={notif.id} className="flex items-start gap-3 px-6 py-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{notif.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
