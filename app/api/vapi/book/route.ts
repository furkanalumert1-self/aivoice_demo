export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, aiActions } from "@/db/schema";
import { extractToolCall, parseDate, parseTime } from "@/lib/vapi";

type AppointmentInsert = {
  patientName: string;
  patientPhone: string | null;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentAt: Date;
  status: string;
  source: string;
  notes: string | null;
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`timeout_${ms}ms`)), ms)),
  ]);
}

async function insertAppointmentWithRetry(values: AppointmentInsert) {
  const doInsert = () => db.insert(appointments).values(values).returning();
  // First attempt: generous timeout to survive Neon cold start (typically 2-6s)
  try {
    return await withTimeout(doInsert(), 7000);
  } catch (err) {
    console.warn("[BOOK] First insert attempt failed, retrying:", (err as Error).message);
  }
  // Retry: Neon is warm after first attempt triggered resume
  return withTimeout(doInsert(), 2500);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Full body dump for diagnosing unknown VAPI payload shapes
    console.log("[BOOK] Full body:", JSON.stringify(body).slice(0, 800));

    const { toolCallId, params } = extractToolCall(body);
    console.log("[BOOK] toolCallId:", toolCallId, "| params:", JSON.stringify(params));

    // Accept flexible parameter names from VAPI tool schemas
    const patientName = params.patientName ?? params.patient_name ?? params.name ?? null;
    const phone = params.phone ?? params.patientPhone ?? params.patient_phone ?? params.phoneNumber ?? null;
    const doctorName = params.doctorName ?? params.doctor_name ?? params.doctor ?? null;
    const notes = params.notes ?? null;

    let rawDate: string | null =
      params.date ?? params.appointmentDate ?? params.appointment_date ??
      params.tarih ?? params.dateStr ?? params.dateString ?? null;
    let rawTime: string | null =
      params.time ?? params.appointmentTime ?? params.appointment_time ??
      params.saat ?? params.timeStr ?? params.timeString ?? null;

    // Fallback: scan all params for ISO date / time-looking values
    if (!rawDate || !rawTime) {
      for (const val of Object.values(params)) {
        const s = String(val ?? "").trim();
        if (!rawDate && /^\d{4}-\d{2}-\d{2}/.test(s)) rawDate = s.slice(0, 10);
        if (!rawTime && /^\d{2}:\d{2}/.test(s)) rawTime = s.slice(0, 5);
      }
    }

    // Split combined datetime (e.g. "2026-07-23T14:00") into date + time
    if (rawDate && rawDate.includes("T") && !rawTime) {
      const [d, t] = rawDate.split("T");
      rawDate = d;
      rawTime = t?.slice(0, 5) ?? null;
    }

    const datePart = parseDate(rawDate);
    const timePart = parseTime(rawTime);

    console.log("[BOOK] Resolved → date:", datePart, "| time:", timePart, "| patient:", patientName, "| phone:", phone);

    if (!patientName || !phone || !datePart || !timePart) {
      console.error("[BOOK] Missing:", { patientName: !!patientName, phone: !!phone, rawDate, datePart, rawTime, timePart, allKeys: Object.keys(params) });
      const missing = [
        !patientName && "hasta adı",
        !phone && "telefon numarası",
        !datePart && "randevu tarihi",
        !timePart && "randevu saati",
      ].filter(Boolean).join(", ");
      return NextResponse.json({
        results: [{
          toolCallId,
          result: `${missing} alınamadı. Lütfen hastadan ${missing} tekrar alın.`,
        }],
      });
    }

    const appointmentAt = new Date(`${datePart}T${timePart}:00`);
    if (isNaN(appointmentAt.getTime())) {
      console.error("[BOOK] Invalid datetime:", datePart, timePart);
      return NextResponse.json({
        results: [{ toolCallId, result: "Tarih veya saat geçersiz. Lütfen hastadan tarihi ve saati tekrar alın." }],
      });
    }

    let newAppointment;
    try {
      [newAppointment] = await insertAppointmentWithRetry({
        patientName,
        patientPhone: phone,
        doctorName: doctorName ?? "Belirtilmedi",
        appointmentDate: datePart,
        appointmentTime: timePart,
        appointmentAt,
        status: "onaylandi",
        source: "voice_agent",
        notes: notes ?? null,
      });
    } catch (dbErr) {
      const errMsg = (dbErr as Error)?.message ?? String(dbErr);
      console.error("[BOOK] DB insert failed after retry — type:", typeof dbErr, "| msg:", errMsg);
      return NextResponse.json({
        results: [{ toolCallId, result: "Randevu kaydedilemedi, sistem geçici olarak yanıt vermiyor. Lütfen tekrar deneyin." }],
      });
    }

    console.log("[BOOK] Appointment created:", newAppointment.id);

    try {
      await db.insert(aiActions).values({
        actionType: "create_appointment",
        payload: { patientName, phone, doctorName, date: datePart, time: timePart },
        result: `Randevu başarıyla oluşturuldu. ID: ${newAppointment.id}`,
      });
    } catch { /* ignore */ }

    const n8nBase = process.env.N8N_WEBHOOK_BASE_URL;
    if (n8nBase) {
      try {
        await fetch(`${n8nBase}/webhook/create-appointment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAppointment),
        });
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      results: [{
        toolCallId,
        result: `Randevunuz ${datePart} tarihinde saat ${timePart} için ${doctorName ?? "doktorunuzla"} başarıyla oluşturuldu.`,
      }],
    });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({
      results: [{ toolCallId: "unknown", result: "Randevu sistemi şu an yanıt vermiyor, lütfen tekrar deneyin." }],
    });
  }
}
