export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, aiActions } from "@/db/schema";
import { extractToolCall, parseDate, parseTime } from "@/lib/vapi";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toolCallId, params } = extractToolCall(body);

    console.log("[BOOK] toolCallId:", toolCallId, "| raw params:", JSON.stringify(params));

    // Accept flexible parameter names from VAPI tool schemas
    const patientName = params.patientName ?? params.patient_name ?? params.name ?? null;
    const phone = params.phone ?? params.patientPhone ?? params.patient_phone ?? params.phoneNumber ?? null;
    const doctorName = params.doctorName ?? params.doctor_name ?? params.doctor ?? null;
    const notes = params.notes ?? null;

    const rawDate = params.date ?? params.appointmentDate ?? params.appointment_date ?? params.tarih ?? null;
    const rawTime = params.time ?? params.appointmentTime ?? params.appointment_time ?? params.saat ?? null;
    const datePart = parseDate(rawDate);
    const timePart = parseTime(rawTime);

    console.log("[BOOK] Parsed → date:", datePart, "| time:", timePart, "| patient:", patientName, "| phone:", phone);

    if (!patientName || !phone || !datePart || !timePart) {
      console.error("[BOOK] Missing required fields:", { patientName: !!patientName, phone: !!phone, rawDate, datePart, rawTime, timePart });
      return NextResponse.json({
        results: [{
          toolCallId,
          result: `Randevu oluşturulamadı: ${[
            !patientName && "hasta adı",
            !phone && "telefon numarası",
            !datePart && `tarih (alınan: "${rawDate ?? "yok"}")`,
            !timePart && `saat (alınan: "${rawTime ?? "yok"}")`,
          ].filter(Boolean).join(", ")} eksik veya hatalı. Lütfen tekrar belirtin.`,
        }],
      });
    }

    const appointmentAt = new Date(`${datePart}T${timePart}:00`);
    if (isNaN(appointmentAt.getTime())) {
      return NextResponse.json({
        results: [{ toolCallId, result: "Geçersiz tarih veya saat formatı. YYYY-AA-GG ve SS:DD formatında giriniz." }],
      });
    }

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
