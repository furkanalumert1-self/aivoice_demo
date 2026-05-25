export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { calls, callLogs } from "@/db/schema";

interface VapiMessage {
  type: string;
  call?: {
    id: string;
    customer?: { number?: string };
    startedAt?: string;
    endedAt?: string;
    cost?: number;
    artifact?: { transcript?: string; recordingUrl?: string };
    analysis?: { summary?: string };
  };
}

function calculateDuration(startedAt?: string, endedAt?: string): number | null {
  if (!startedAt || !endedAt) return null;
  return Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
}

function generateSummary(transcript?: string): string {
  if (!transcript) return "Transkript mevcut değil.";
  const words = transcript.split(" ");
  return words.slice(0, 50).join(" ") + (words.length > 50 ? "..." : "");
}

function detectIntent(transcript?: string): string {
  if (!transcript) return "diger";
  const lower = transcript.toLowerCase();
  if (lower.includes("randevu") && (lower.includes("almak") || lower.includes("oluştur") || lower.includes("aldım"))) return "randevu_alma";
  if (lower.includes("iptal")) return "randevu_iptal";
  if (lower.includes("geri ara") || lower.includes("geri arama")) return "geri_arama";
  if (lower.includes("bilgi") || lower.includes("sigorta") || lower.includes("çalışma")) return "bilgi";
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

    await db.insert(calls).values({
      callerPhone: callData.customer?.number ?? "Bilinmiyor",
      durationSeconds: duration,
      transcript: transcript ?? null,
      summary,
      cost: cost ?? null,
      outcome: intent,
      recordingUrl: callData.artifact?.recordingUrl ?? null,
    });

    return NextResponse.json({ success: true, callLogId: savedCallLog.id });
  } catch (error) {
    console.error("Call ended webhook error:", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
