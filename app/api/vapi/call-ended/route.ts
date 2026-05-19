export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { calls, notifications } from "@/db/schema";

interface VapiMessage {
  type: string;
  call?: {
    id: string;
    customer?: {
      number?: string;
    };
    startedAt?: string;
    endedAt?: string;
    cost?: number;
    artifact?: {
      transcript?: string;
      recordingUrl?: string;
    };
    analysis?: {
      summary?: string;
    };
  };
}

function calculateDuration(startedAt?: string, endedAt?: string): number | null {
  if (!startedAt || !endedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  return Math.round((end - start) / 1000);
}

function generateSummary(transcript: string | undefined): string {
  if (!transcript) return "Transkript mevcut değil.";
  const words = transcript.split(" ").slice(0, 50).join(" ");
  return words + (transcript.split(" ").length > 50 ? "..." : "");
}

export async function POST(req: NextRequest) {
  try {
    const body: VapiMessage = await req.json();

    if (body.type !== "end-of-call-report") {
      return NextResponse.json({ received: true });
    }

    const callData = body.call;
    if (!callData) {
      return NextResponse.json({ error: "Call data missing" }, { status: 400 });
    }

    const duration = calculateDuration(callData.startedAt, callData.endedAt);
    const transcript = callData.artifact?.transcript;
    const summary = callData.analysis?.summary ?? generateSummary(transcript);
    const cost = callData.cost?.toFixed(6);

    // Determine outcome from transcript
    let outcome = "bilgi_verildi";
    if (transcript) {
      const lower = transcript.toLowerCase();
      if (lower.includes("randevu") && (lower.includes("aldım") || lower.includes("oluşturuldu"))) {
        outcome = "randevu_alindi";
      } else if (lower.includes("iptal")) {
        outcome = "iptal_edildi";
      } else if (lower.includes("geri ara") || lower.includes("tekrar ara")) {
        outcome = "geri_arama";
      } else if (lower.includes("cevap yok") || lower.includes("meşgul")) {
        outcome = "cevap_yok";
      }
    }

    // Save call record
    const [savedCall] = await db
      .insert(calls)
      .values({
        callerPhone: callData.customer?.number ?? "Bilinmiyor",
        durationSeconds: duration,
        transcript: transcript ?? null,
        summary,
        cost: cost ?? null,
        outcome,
        recordingUrl: callData.artifact?.recordingUrl ?? null,
      })
      .returning();

    // Create notification
    await db.insert(notifications).values({
      title: "Yeni Çağrı Tamamlandı",
      description: `${callData.customer?.number ?? "Bilinmeyen numara"} araması tamamlandı. Süre: ${duration ? Math.round(duration / 60) + " dk" : "bilinmiyor"}`,
      isRead: false,
    });

    // Trigger n8n webhook if configured
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      try {
        await fetch(`${n8nWebhookUrl}/call-summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(savedCall),
        });
      } catch (webhookError) {
        console.error("n8n webhook failed:", webhookError);
      }
    }

    return NextResponse.json({ success: true, callId: savedCall.id });
  } catch (error) {
    console.error("Call ended webhook error:", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
