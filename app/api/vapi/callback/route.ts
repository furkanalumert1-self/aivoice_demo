export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { callbackRequests, aiActions } from "@/db/schema";

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

    const patientName = params.patientName ?? params.patient_name ?? params.name ?? null;
    const phone = params.phone ?? params.patientPhone ?? params.patient_phone ?? params.phoneNumber;
    const reason = params.reason ?? null;

    if (!phone) {
      return NextResponse.json({
        results: [{
          toolCallId,
          result: "Geri arama talebi için telefon numarası gereklidir.",
        }],
      });
    }

    // Insert callback request
    const [newCallback] = await db
      .insert(callbackRequests)
      .values({
        patientName: patientName ?? null,
        phone,
        reason: reason ?? null,
        status: "bekliyor",
      })
      .returning();

    // Log ai_action
    await db.insert(aiActions).values({
      actionType: "callback",
      payload: { patientName: patientName ?? null, phone, reason: reason ?? null },
      result: `Geri arama talebi alındı. ID: ${newCallback.id}`,
    });

    return NextResponse.json({
      results: [
        {
          toolCallId,
          result: `Geri arama talebiniz alındı. En kısa sürede ${phone} numaranızdan sizi arayacağız.`,
        },
      ],
    });
  } catch (error) {
    console.error("Callback request error:", error);
    return NextResponse.json({
      results: [{ toolCallId: "unknown", result: "Geri arama talebi oluşturulurken hata oluştu. Lütfen tekrar deneyin." }],
    });
  }
}
