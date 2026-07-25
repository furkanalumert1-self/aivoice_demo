export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, aiActions } from "@/db/schema";
import { eq, sql, ilike } from "drizzle-orm";
import { extractToolCall } from "@/lib/vapi";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toolCallId, params } = extractToolCall(body);

    const appointmentId = params.appointmentId ?? params.appointment_id ?? params.id ?? null;
    const phone = params.phone ?? params.patientPhone ?? params.patient_phone ?? params.phoneNumber ?? null;
    const patientName = params.patientName ?? params.patient_name ?? params.name ?? null;
    const newDate = params.newDate ?? params.new_date ?? params.date ?? params.appointmentDate ?? null;
    const newTime = params.newTime ?? params.new_time ?? params.time ?? params.appointmentTime ?? null;
    const doctorName = params.doctorName ?? params.doctor_name ?? params.doctor ?? null;

    if (!newDate || !newTime) {
      return NextResponse.json({
        results: [{
          toolCallId,
          result: "Yeniden planlama için yeni tarih ve saat bilgisi gereklidir.",
        }],
      });
    }

    const [datePart] = newDate.split("T");
    const newAppointmentAt = new Date(`${datePart}T${newTime}:00`);

    let rescheduled = null;

    const updateData = {
      appointmentAt: newAppointmentAt,
      appointmentDate: datePart,
      appointmentTime: newTime,
      status: "onaylandi" as const,
      ...(doctorName ? { doctorName } : {}),
    };

    // 1. Lookup by explicit appointmentId
    if (appointmentId) {
      const [result] = await db
        .update(appointments)
        .set(updateData)
        .where(eq(appointments.id, appointmentId))
        .returning();
      rescheduled = result ?? null;
    }

    // 2. Lookup by phone — suffix match using as many digits as given (up to 9)
    // This handles country-code prefixes AND partially-heard numbers from STT
    if (!rescheduled && phone) {
      const cleanedDigits = phone.replace(/[^0-9]/g, "");
      const suffixLen = Math.min(cleanedDigits.length, 9);
      const suffix = cleanedDigits.slice(-suffixLen);
      const [result] = await db
        .update(appointments)
        .set(updateData)
        .where(sql`
          id = (
            SELECT id FROM appointments
            WHERE REGEXP_REPLACE(COALESCE(patient_phone, ''), '[^0-9]', '', 'g')
                  LIKE ${"%" + suffix}
              AND status != 'iptal'
            ORDER BY created_at DESC
            LIMIT 1
          )
        `)
        .returning();
      rescheduled = result ?? null;
      console.log("[RESCHEDULE] phone:", phone, "| suffix:", suffix, "| found:", rescheduled?.id ?? "none");
    }

    // 3. Fallback: lookup by patient name (AI often knows the name from the conversation)
    if (!rescheduled && patientName) {
      const [result] = await db
        .update(appointments)
        .set(updateData)
        .where(sql`
          id = (
            SELECT id FROM appointments
            WHERE LOWER(patient_name) LIKE LOWER(${`%${patientName}%`})
              AND status != 'iptal'
            ORDER BY created_at DESC
            LIMIT 1
          )
        `)
        .returning();
      rescheduled = result ?? null;
      console.log("[RESCHEDULE] patientName fallback:", patientName, "| found:", rescheduled?.id ?? "none");
    }

    if (!rescheduled) {
      return NextResponse.json({
        results: [
          {
            toolCallId,
            result: "Appuntamento non trovato. Verifichi il numero di telefono e riprovi.",
          },
        ],
      });
    }

    try {
      await db.insert(aiActions).values({
        actionType: "reschedule",
        payload: { appointmentId: rescheduled.id, phone, patientName, newDate: datePart, newTime },
        result: `Randevu ${datePart} ${newTime}'e taşındı.`,
      });
    } catch { /* ignore */ }

    return NextResponse.json({
      results: [
        {
          toolCallId,
          result: `L'appuntamento è stato aggiornato a ${datePart} alle ${newTime}.`,
        },
      ],
    });
  } catch (error) {
    console.error("Reschedule error:", error);
    return NextResponse.json({
      results: [{ toolCallId: "unknown", result: "Errore durante la ripianificazione. Riprovi." }],
    });
  }
}
