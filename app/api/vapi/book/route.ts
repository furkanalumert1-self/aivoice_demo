export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = body?.message?.toolCallList?.[0]?.function?.parameters ?? body;
    const { patientName, phone, doctorName, date, time } = params;

    if (!patientName || !phone || !date || !time) {
      return NextResponse.json(
        { error: "Hasta adı, telefon, tarih ve saat gerekli" },
        { status: 400 }
      );
    }

    const [datePart] = date.split("T");
    const appointmentAt = new Date(`${datePart}T${time}:00`);

    const [newAppointment] = await db
      .insert(appointments)
      .values({
        patientName,
        phone,
        doctorName: doctorName ?? "Belirtilmedi",
        appointmentAt,
        status: "onaylandi",
        source: "voice_agent",
      })
      .returning();

    // Trigger n8n webhook if configured
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      try {
        await fetch(`${n8nWebhookUrl}/appointment-created`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAppointment),
        });
      } catch (webhookError) {
        console.error("n8n webhook failed:", webhookError);
      }
    }

    return NextResponse.json({
      results: [
        {
          toolCallId: body?.message?.toolCallList?.[0]?.id ?? "unknown",
          result: {
            success: true,
            appointmentId: newAppointment.id,
            message: `Randevunuz ${datePart} tarihinde saat ${time} için ${doctorName ?? "doktorunuzla"} oluşturuldu.`,
            appointment: newAppointment,
          },
        },
      ],
    });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Randevu oluşturulamadı" }, { status: 500 });
  }
}
