export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = body?.message?.toolCallList?.[0]?.function?.parameters ?? body;
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
      status: "onaylandi",
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
        .where(eq(appointments.phone, phone))
        .returning();
      rescheduled = result;
    }

    if (!rescheduled) {
      return NextResponse.json({
        results: [
          {
            toolCallId: body?.message?.toolCallList?.[0]?.id ?? "unknown",
            result: {
              success: false,
              message: "Randevu bulunamadı.",
            },
          },
        ],
      });
    }

    return NextResponse.json({
      results: [
        {
          toolCallId: body?.message?.toolCallList?.[0]?.id ?? "unknown",
          result: {
            success: true,
            message: `Randevunuz ${datePart} tarihinde saat ${newTime} için yeniden planlandı.`,
            appointment: rescheduled,
          },
        },
      ],
    });
  } catch (error) {
    console.error("Reschedule error:", error);
    return NextResponse.json({ error: "Yeniden planlama başarısız" }, { status: 500 });
  }
}
