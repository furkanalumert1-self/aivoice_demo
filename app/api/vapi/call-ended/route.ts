export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { calls, callLogs, notifications } from "@/db/schema";

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

function detectIntent(transcript: string | undefined): string {
  if (!transcript) return "diger";
  const lower = transcript.toLowerCase();
  if (lower.includes("randevu") && (lower.includes("almak") || lower.includes("oluştur") || lower.includes("aldım"))) {
    return "randevu_alma";
  }
  if (lower.includes("iptal") || lower.includes("iptal etmek")) {
    return "randevu_iptal";
  }
  if (lower.includes("geri ara") || lower.includes("tekrar ara") || lower.includes("geri arama")) {
    return "geri_arama";
  }
  if (lower.includes("ertelemek") || lower.includes("değiştirmek") || lower.includes("yeniden")) {
    return "randevu_alma";
  }
  if (lower.includes("saat") || lower.includes("bilgi") || lower.includes("sigorta") || lower.includes("çalışma")) {
    return "bilgi";
  }
  return "diger";
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
    const intent = detectIntent(transcript);

    // Save to call_logs table (new)
    const [savedCallLog] = await db
      .insert(callLogs)
      .values({
        callerNumber: callData.customer?.number ?? "Bilinmiyor",
        vapiCallId: callData.id,
        transcript: transcript ?? null,
        summary,
        duration,
        intent,
        callStatus: "completed",
        cost: cost ?? null,
        recordingUrl: callData.artifact?.recordingUrl ?? null,
      })
      .returning();

    // Also save to legacy calls table for backward compat
    await db
      .insert(calls)
      .values({
        callerPhone: callData.customer?.number ?? "Bilinmiyor",
        durationSeconds: duration,
        transcript: transcript ?? null,
        summary,
        cost: cost ?? null,
        outcome: intent,
        recordingUrl: callData.artifact?.recordingUrl ?? null,
      });

    // Create notification
    await db.insert(notifications).values({
      title: "Yeni Çağrı Tamamlandı",
      description: `${callData.customer?.number ?? "Bilinmeyen numara"} araması tamamlandı. Süre: ${duration ? Math.round(duration / 60) + " dk" : "bilinmiyor"}. Niyet: ${intent}`,
      isRead: false,
    });

    // Trigger n8n webhook if configured
    const n8nBase = process.env.N8N_WEBHOOK_BASE_URL;
    if (n8nBase) {
      try {
        await fetch(`${n8nBase}/webhook/call-logging`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(savedCallLog),
        });
      } catch (webhookError) {
        console.error("n8n webhook failed:", webhookError);
      }
    }

    return NextResponse.json({ success: true, callLogId: savedCallLog.id });
  } catch (error) {
    console.error("Call ended webhook error:", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
