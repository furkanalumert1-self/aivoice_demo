export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, aiActions } from "@/db/schema";

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

    // Accept flexible parameter names from VAPI tool schemas
    const patientName = params.patientName ?? params.patient_name ?? params.name;
    const phone = params.phone ?? params.patientPhone ?? params.patient_phone ?? params.phoneNumber;
    const doctorName = params.doctorName ?? params.doctor_name ?? params.doctor;
    const date = params.date ?? params.appointmentDate ?? params.appointment_date;
    const time = params.time ?? params.appointmentTime ?? params.appointment_time;
    const notes = params.notes ?? null;

    console.log("[BOOK] Incoming params:", JSON.stringify(params));
    console.log("[BOOK] Parsed:", { patientName, phone, doctorName, date, time });

    if (!patientName || !phone || !date || !time) {
      console.error("[BOOK] Missing required fields:", { patientName: !!patientName, phone: !!phone, date: !!date, time: !!time });
      return NextResponse.json(
        {
          results: [{
            toolCallId,
            result: "Randevu oluşturulamadı: hasta adı, telefon numarası, tarih ve saat bilgileri gereklidir.",
          }],
        }
      );
    }

    // Parse date — accept "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS..."
    const datePart = date.split("T")[0];
    // Normalize time — accept "15:00" or "15:00:00"
    const timePart = time.length === 5 ? time : time.substring(0, 5);

    const appointmentAt = new Date(`${datePart}T${timePart}:00`);
    if (isNaN(appointmentAt.getTime())) {
      console.error("[BOOK] Invalid date/time:", { datePart, timePart });
      return NextResponse.json({
        results: [{
          toolCallId,
          result: `Geçersiz tarih veya saat formatı. Lütfen YYYY-AA-GG formatında tarih ve SS:DD formatında saat giriniz.`,
        }],
      });
    }

    // Insert into appointments table
    const [newAppointment] = await db
      .insert(appointments)
      .values({
        patientName,
        patientPhone: phone,
        doctorName: doctorName ?? "Belirtilmedi",
        appointmentDate: datePart,
        appointmentTime: timePart,
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

    const responseMessage = `Randevunuz ${datePart} tarihinde saat ${timePart} için ${doctorName ?? "doktorunuzla"} başarıyla oluşturuldu.`;

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
