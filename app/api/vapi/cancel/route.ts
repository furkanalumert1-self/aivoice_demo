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

    const { appointmentId, phone, reason } = params;

    if (!appointmentId && !phone) {
      return NextResponse.json(
        { error: "Randevu ID veya telefon numarası gerekli" },
        { status: 400 }
      );
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

    // Log ai_action
    await db.insert(aiActions).values({
      actionType: "cancel",
      payload: { appointmentId: cancelled.id, phone, reason: reason ?? null },
      result: "Randevu başarıyla iptal edildi.",
    });

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
    return NextResponse.json({ error: "İptal işlemi başarısız" }, { status: 500 });
  }
}
