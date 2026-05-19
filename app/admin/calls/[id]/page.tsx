import { db } from "@/db";
import { calls, appointments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { formatDateTime, formatDuration, formatCurrency, outcomeLabels } from "@/lib/utils";
import { Phone, Clock, DollarSign, FileText, ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [call] = await db.select().from(calls).where(eq(calls.id, id));
  if (!call) notFound();

  let appointment = null;
  if (call.appointmentId) {
    const [appt] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, call.appointmentId));
    appointment = appt ?? null;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/calls"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Çağrı Listesi
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Çağrı Detayı</h1>
        <p className="text-sm text-gray-500 mt-1">{call.callerPhone ?? "Bilinmeyen numara"}</p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Telefon", value: call.callerPhone ?? "-", icon: Phone },
          { label: "Süre", value: formatDuration(call.durationSeconds), icon: Clock },
          { label: "Maliyet", value: formatCurrency(call.cost), icon: DollarSign },
          { label: "Tarih", value: formatDateTime(call.createdAt), icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Outcome */}
      {call.outcome && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Çağrı Sonucu</h2>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
            {outcomeLabels[call.outcome] ?? call.outcome}
          </span>
        </div>
      )}

      {/* Summary */}
      {call.summary && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-700">AI Özeti</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{call.summary}</p>
        </div>
      )}

      {/* Transcript */}
      {call.transcript && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Tam Transkript</h2>
          </div>
          <pre className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed font-sans">
            {call.transcript}
          </pre>
        </div>
      )}

      {/* Linked Appointment */}
      {appointment && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <h2 className="text-sm font-semibold text-green-800">İlişkili Randevu</h2>
            </div>
            <Link
              href="/admin/appointments"
              className="text-xs text-green-700 hover:underline"
            >
              Randevuya Git →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-green-600 font-medium">Hasta:</span>{" "}
              <span className="text-green-900">{appointment.patientName}</span>
            </div>
            <div>
              <span className="text-green-600 font-medium">Doktor:</span>{" "}
              <span className="text-green-900">{appointment.doctorName}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recording */}
      {call.recordingUrl && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Ses Kaydı</h2>
          <audio controls className="w-full" src={call.recordingUrl}>
            Tarayıcınız ses oynatmayı desteklemiyor.
          </audio>
        </div>
      )}
    </div>
  );
}
