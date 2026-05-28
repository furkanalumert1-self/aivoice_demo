export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, callLogs, aiActions } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toolCall = body?.message?.toolCallList?.[0];
    const toolCallId = toolCall?.id ?? "unknown";

    // Parse arguments — VAPI sends them as a JSON string
    let params: Record<string, string> = {};
    try {
      params = JSON.parse(toolCall?.function?.arguments ?? "{}");
    } catch {
      params = toolCall?.function?.parameters ?? body;
    }

    const { patientName, phone, doctorName, date, time, notes } = params;

    if (!patientName || !phone || !date || !time) {
      return NextResponse.json(
        { error: "Hasta adı, telefon, tarih ve saat gerekli" },
        { status: 400 }
      );
    }

    const [datePart] = date.split("T");
    const appointmentAt = new Date(`${datePart}T${time}:00`);

    // Insert into appointments table
    const [newAppointment] = await db
      .insert(appointments)
      .values({
        patientName,
        patientPhone: phone,
        doctorName: doctorName ?? "Belirtilmedi",
        appointmentDate: datePart,
        appointmentTime: time,
        appointmentAt,
        status: "onaylandi",
        source: "voice_agent",
        notes: notes ?? null,
      })
      .returning();

    // Log ai_action
    await db.insert(aiActions).values({
      actionType: "create_appointment",
      payload: { patientName, phone, doctorName, date: datePart, time },
      result: `Randevu başarıyla oluşturuldu. ID: ${newAppointment.id}`,
    });

    // Trigger n8n webhook if configured
    const n8nBase = process.env.N8N_WEBHOOK_BASE_URL;
    if (n8nBase) {
      try {
        await fetch(`${n8nBase}/webhook/create-appointment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAppointment),
        });
      } catch (webhookError) {
        console.error("n8n webhook failed:", webhookError);
      }
    }

    const responseMessage = `Randevunuz ${datePart} tarihinde saat ${time} için ${doctorName ?? "doktorunuzla"} başarıyla oluşturuldu.`;

    return NextResponse.json({
      results: [
        {
          toolCallId,
          result: responseMessage,
        },
      ],
    });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Randevu oluşturulamadı" }, { status: 500 });
  }
}
