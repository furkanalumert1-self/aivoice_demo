export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, aiActions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toolCall = body?.message?.toolCallList?.[0];
    const toolCallId = toolCall?.id ?? "unknown";

    let params: Record<string, string> = {};
    try {
      params = JSON.parse(toolCall?.function?.arguments ?? "{}");
    } catch {
      params = toolCall?.function?.parameters ?? body;
    }

    const { appointmentId, phone, newDate, newTime, doctorName } = params;

    if (!newDate || !newTime) {
      return NextResponse.json(
        { error: "Yeni tarih ve saat gerekli" },
        { status: 400 }
      );
    }

    const [datePart] = newDate.split("T");
    const newAppointmentAt = new Date(`${datePart}T${newTime}:00`);

    let rescheduled = null;

    const updateData: Record<string, unknown> = {
      appointmentAt: newAppointmentAt,
      appointmentDate: datePart,
      appointmentTime: newTime,
      status: "onaylandi",
      updatedAt: new Date(),
    };

    if (doctorName) {
      updateData.doctorName = doctorName;
    }

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
        .where(eq(appointments.patientPhone, phone))
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

    // Log ai_action
    await db.insert(aiActions).values({
      actionType: "reschedule",
      payload: { appointmentId: rescheduled.id, phone, newDate: datePart, newTime },
      result: `Randevu ${datePart} ${newTime}'e taşındı.`,
    });

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
    return NextResponse.json({ error: "Yeniden planlama başarısız" }, { status: 500 });
  }
}
