export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, aiActions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractToolCall } from "@/lib/vapi";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toolCallId, params } = extractToolCall(body);

    const phone = params.phone ?? params.patientPhone ?? params.patient_phone ?? params.phoneNumber;
    const appointmentId = params.appointmentId ?? params.appointment_id ?? params.id;
    const reason = params.reason ?? null;

    if (!appointmentId && !phone) {
      return NextResponse.json({
        results: [{
          toolCallId,
          result: "İptal işlemi için randevu ID veya telefon numarası gereklidir.",
        }],
      });
    }

    let cancelled = null;

    if (appointmentId) {
      const [result] = await db
        .update(appointments)
        .set({ status: "iptal" })
        .where(eq(appointments.id, appointmentId))
        .returning();
      cancelled = result;
    } else if (phone) {
      const [result] = await db
        .update(appointments)
        .set({ status: "iptal" })
        .where(eq(appointments.patientPhone, phone))
        .returning();
      cancelled = result;
    }

    if (!cancelled) {
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
        actionType: "cancel",
        payload: { appointmentId: cancelled.id, phone, reason: reason ?? null },
        result: "Randevu başarıyla iptal edildi.",
      });
    } catch { /* ignore */ }

    return NextResponse.json({
      results: [
        {
          toolCallId,
          result: `Randevunuz başarıyla iptal edildi. ${reason ? `Neden: ${reason}.` : ""}`,
        },
      ],
    });
  } catch (error) {
    console.error("Cancel error:", error);
    return NextResponse.json({
      results: [{ toolCallId: "unknown", result: "İptal işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin." }],
    });
  }
}
