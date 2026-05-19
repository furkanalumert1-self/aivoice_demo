import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = body?.message?.toolCallList?.[0]?.function?.parameters ?? body;
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
        .where(eq(appointments.phone, phone))
        .returning();
      cancelled = result;
    }

    if (!cancelled) {
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

    // Trigger n8n webhook if configured
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      try {
        await fetch(`${n8nWebhookUrl}/appointment-cancelled`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...cancelled, reason }),
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
            message: "Randevunuz başarıyla iptal edildi.",
            appointment: cancelled,
          },
        },
      ],
    });
  } catch (error) {
    console.error("Cancel error:", error);
    return NextResponse.json({ error: "İptal işlemi başarısız" }, { status: 500 });
  }
}
