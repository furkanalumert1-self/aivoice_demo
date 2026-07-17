export const dynamic = "force-dynamic";

import { db } from "@/db";
import { callLogs, appointments } from "@/db/schema";
import { sql, eq, count, desc } from "drizzle-orm";
import { Phone, Calendar, Clock, XCircle, ArrowRight } from "lucide-react";
import { formatDuration, formatDateTime } from "@/lib/utils";
import Link from "next/link";

const intentConfig: Record<string, { label: string; color: string; dot: string }> = {
  randevu_alma:  { label: "Randevu Alma",  color: "text-teal-700",   dot: "bg-teal-500"   },
  randevu_iptal: { label: "Randevu İptal", color: "text-red-700",    dot: "bg-red-500"    },
  bilgi:         { label: "Bilgi",         color: "text-blue-700",   dot: "bg-blue-500"   },
  geri_arama:    { label: "Geri Arama",    color: "text-amber-700",  dot: "bg-amber-500"  },
  diger:         { label: "Diğer",         color: "text-gray-600",   dot: "bg-gray-400"   },
};

type RecentCall = {
  id: string;
  callerNumber: string | null;
  summary: string | null;
  duration: number | null;
  intent: string | null;
  callStatus: string | null;
  createdAt: Date | null;
};

type RecentAppointment = {
  id: string;
  patientName: string;
  doctorName: string | null;
  appointmentDate: string | null;
  appointmentTime: string | null;
  createdAt: Date | null;
  status: string | null;
};

type Stats = {
  todayCallCount: number;
  aiAppointmentCount: number;
  avgDuration: number | null;
  cancelledCount: number;
  recentCalls: RecentCall[];
  recentAppointments: RecentAppointment[];
};

const emptyStats: Stats = {
  todayCallCount: 0,
  aiAppointmentCount: 0,
  avgDuration: null,
  cancelledCount: 0,
  recentCalls: [],
  recentAppointments: [],
};

async function getStats(): Promise<Stats> {
  const stats: Stats = { ...emptyStats };

  try {
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(callLogs).where(sql`date(${callLogs.createdAt}) = current_date`);
    stats.todayCallCount = row?.n ?? 0;
  } catch (e) { console.error("DASHBOARD_CALLS_ERROR todayCallCount:", e); }

  try {
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(appointments).where(sql`date(${appointments.createdAt}) = current_date`);
    stats.aiAppointmentCount = row?.n ?? 0;
  } catch (e) { console.error("DASHBOARD_APPOINTMENTS_ERROR aiAppointmentCount:", e); }

  try {
    const [row] = await db
      .select({ avg: sql<number | null>`round(avg(${callLogs.duration}) filter (where ${callLogs.duration} > 0))` })
      .from(callLogs)
      .where(sql`date(${callLogs.createdAt}) = current_date`);
    stats.avgDuration = row?.avg ? Math.round(Number(row.avg)) : null;
  } catch (e) { console.error("DASHBOARD_CALLS_ERROR avgDuration:", e); }

  try {
    const [{ count: n }] = await db.select({ count: count() }).from(appointments).where(eq(appointments.status, "iptal"));
    stats.cancelledCount = n;
  } catch (e) { console.error("DASHBOARD_APPOINTMENTS_ERROR cancelledCount:", e); }

  try {
    stats.recentCalls = await db
      .select({ id: callLogs.id, callerNumber: callLogs.callerNumber, summary: callLogs.summary, duration: callLogs.duration, intent: callLogs.intent, callStatus: callLogs.callStatus, createdAt: callLogs.createdAt })
      .from(callLogs).orderBy(desc(callLogs.createdAt)).limit(5);
  } catch (e) { console.error("DASHBOARD_CALLS_ERROR recentCalls:", e); }

  try {
    stats.recentAppointments = await db
      .select({ id: appointments.id, patientName: appointments.patientName, doctorName: appointments.doctorName, appointmentDate: appointments.appointmentDate, appointmentTime: appointments.appointmentTime, createdAt: appointments.createdAt, status: appointments.status })
      .from(appointments).orderBy(desc(appointments.createdAt)).limit(5);
  } catch (e) { console.error("DASHBOARD_APPOINTMENTS_ERROR recentAppointments:", e); }

  return stats;
}

const statCards = (s: Stats) => [
  { label: "Bugünkü Çağrı",       value: s.todayCallCount,             icon: Phone,     grad: "var(--grad-tile-1)", iconClass: "text-teal-600" },
  { label: "Bugünkü Randevu",     value: s.aiAppointmentCount,         icon: Calendar,  grad: "var(--grad-tile-2)", iconClass: "text-indigo-600" },
  { label: "Bugünkü Ort. Süre",   value: formatDuration(s.avgDuration),icon: Clock,     grad: "var(--grad-tile-3)", iconClass: "text-emerald-600" },
  { label: "İptal Randevu",       value: s.cancelledCount,             icon: XCircle,   grad: "var(--grad-tile-4)", iconClass: "text-rose-600" },
];

export default async function AdminPage() {
  const stats = await getStats();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">Klinik AI Call Center — canlı özet</p>
        </div>
      </div>

      {/* Stat tiles — Clinica gradient cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards(stats).map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-2xl p-5 ring-1 ring-gray-200"
              style={{ backgroundImage: card.grad, boxShadow: "var(--shadow-soft)" }}
            >
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/80 ring-1 ring-gray-200/60">
                  <Icon className={`h-[18px] w-[18px] ${card.iconClass}`} />
                </span>
              </div>
              <p className="mt-4 tnum text-3xl font-bold text-gray-900 leading-none">{card.value}</p>
              <p className="mt-1.5 text-[12.5px] font-medium text-gray-700">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Two-column lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Calls */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-[15px] font-semibold text-gray-900">Son Çağrılar</h2>
            <Link href="/admin/calls" className="flex items-center gap-1 text-[12px] text-teal-600 font-medium hover:text-teal-700 transition-colors">
              Tümünü gör <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Phone className="h-8 w-8 mb-2 text-gray-200" />
                <p className="text-[13px] text-gray-400">Henüz çağrı kaydı yok</p>
              </div>
            ) : stats.recentCalls.map((call) => {
              const cfg = intentConfig[call.intent ?? "diger"] ?? intentConfig.diger;
              return (
                <div key={call.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50">
                    <Phone className="h-4 w-4 text-teal-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{call.callerNumber ?? "Bilinmiyor"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <span className="text-[11px] text-gray-400">{cfg.label}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="tnum text-[12px] text-gray-500">{formatDuration(call.duration)}</p>
                    <p className="tnum text-[11px] text-gray-400">{formatDateTime(call.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-[15px] font-semibold text-gray-900">Son Randevular</h2>
            <Link href="/admin/appointments" className="flex items-center gap-1 text-[12px] text-teal-600 font-medium hover:text-teal-700 transition-colors">
              Tümünü gör <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-8 w-8 mb-2 text-gray-200" />
                <p className="text-[13px] text-gray-400">Henüz randevu kaydı yok</p>
              </div>
            ) : stats.recentAppointments.map((appt) => {
              const isIptal = appt.status === "iptal";
              return (
                <div key={appt.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                    <Calendar className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{appt.patientName ?? "Bilinmiyor"}</p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {appt.doctorName ?? "—"}
                      {appt.appointmentDate ? ` · ${appt.appointmentDate}` : ""}
                      {appt.appointmentTime ? ` ${appt.appointmentTime}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${isIptal ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-700"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isIptal ? "bg-red-500" : "bg-teal-500"}`} />
                    {isIptal ? "İptal" : "Aktif"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
