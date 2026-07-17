export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, aiActions } from "@/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { extractToolCall } from "@/lib/vapi";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toolCallId, params } = extractToolCall(body);

    const appointmentId = params.appointmentId ?? params.appointment_id ?? params.id ?? null;
    const phone = params.phone ?? params.patientPhone ?? params.patient_phone ?? params.phoneNumber ?? null;
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

    if (appointmentId) {
      const [result] = await db
        .update(appointments)
        .set(updateData)
        .where(eq(appointments.id, appointmentId))
        .returning();
      rescheduled = result;
    } else if (phone) {
      const [result] = await db
        .update(appointments)
        .set(updateData)
        .where(sql`(patient_phone = ${phone} OR phone = ${phone}) AND status != 'iptal'`)
        .returning();
      rescheduled = result;
    }

    if (!rescheduled) {
      return NextResponse.json({
        results: [
          {
            toolCallId,
            result: "Randevu bulunamadı. Lütfen telefon numaranızı veya randevu bilgilerinizi kontrol edin.",
          },
        ],
      });
    }

    try {
      await db.insert(aiActions).values({
        actionType: "reschedule",
        payload: { appointmentId: rescheduled.id, phone, newDate: datePart, newTime },
        result: `Randevu ${datePart} ${newTime}'e taşındı.`,
      });
    } catch { /* ignore */ }

    return NextResponse.json({
      results: [
        {
          toolCallId,
          result: `Randevunuz ${datePart} tarihinde saat ${newTime} için başarıyla yeniden planlandı.`,
        },
      ],
    });
  } catch (error) {
    console.error("Reschedule error:", error);
    return NextResponse.json({
      results: [{ toolCallId: "unknown", result: "Yeniden planlama sırasında bir hata oluştu. Lütfen tekrar deneyin." }],
    });
  }
}
