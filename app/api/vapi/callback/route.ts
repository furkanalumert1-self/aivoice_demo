export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { callbackRequests, aiActions, notifications } from "@/db/schema";

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

    const { patientName, phone, reason } = params;

    if (!phone) {
      return NextResponse.json(
        { error: "Telefon numarası gerekli" },
        { status: 400 }
      );
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

    // Create notification
    await db.insert(notifications).values({
      title: "Geri Arama Talebi",
      description: `${patientName ?? "Bilinmeyen hasta"} (${phone}) geri arama talep etti.${reason ? ` Neden: ${reason}` : ""}`,
      isRead: false,
    });

    // Trigger n8n webhook if configured
    const n8nBase = process.env.N8N_WEBHOOK_BASE_URL;
    if (n8nBase) {
      try {
        await fetch(`${n8nBase}/webhook/callback-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCallback),
        });
      } catch (webhookError) {
        console.error("n8n webhook failed:", webhookError);
      }
    }

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
    return NextResponse.json({ error: "Geri arama talebi oluşturulamadı" }, { status: 500 });
  }
}
