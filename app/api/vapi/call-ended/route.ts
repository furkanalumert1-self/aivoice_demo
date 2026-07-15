export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { calls, callLogs } from "@/db/schema";

interface VapiCallData {
  id?: string;
  customer?: { number?: string };
  phoneNumber?: { number?: string };
  startedAt?: string;
  endedAt?: string;
  cost?: number;
}

interface VapiArtifact {
  transcript?: string;
  recordingUrl?: string;
}

interface VapiAnalysis {
  summary?: string;
  structuredData?: { intent?: string };
}

interface VapiPayload {
  message?: {
    type?: string;
    call?: VapiCallData;
    artifact?: VapiArtifact;
    analysis?: VapiAnalysis;
    endedReason?: string;
  };
  // Some VAPI versions send flat (not nested under message)
  type?: string;
  call?: VapiCallData;
  artifact?: VapiArtifact;
  analysis?: VapiAnalysis;
}

function calculateDuration(startedAt?: string, endedAt?: string): number | null {
  if (!startedAt || !endedAt) return null;
  return Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
}

function generateTurkishSummary(transcript?: string): string {
  if (!transcript) return "Transkript mevcut değil.";

  const text = transcript.toLowerCase();
  const parts: string[] = [];

  // Randevu alma
  if (text.includes("randevu") && (text.includes("almak") || text.includes("alabilir") || text.includes("almak istiyorum"))) {
    if (text.includes("oluşturuldu") || text.includes("başarıyla") || text.includes("alındı")) {
      parts.push("Hasta randevu talebi iletildi ve randevu oluşturuldu.");
    } else {
      parts.push("Hasta randevu almak istedi.");
    }
  }

  // Randevu iptal
  if (text.includes("iptal") && text.includes("randevu")) {
    if (text.includes("iptal edildi") || text.includes("iptal ettim")) {
      parts.push("Randevu iptal edildi.");
    } else {
      parts.push("Hasta randevu iptali talep etti.");
    }
  }

  // Yeniden planlama
  if (text.includes("ertele") || text.includes("taşı") || text.includes("yeniden planla") || text.includes("reschedule")) {
    parts.push("Randevu yeniden planlandı.");
  }

  // Geri arama
  if (text.includes("geri ara") || text.includes("geri arama")) {
    parts.push("Geri arama talebi oluşturuldu.");
  }

  // Bilgi talebi (doktor/sigorta/çalışma saati)
  if (!parts.length && (text.includes("bilgi") || text.includes("saat") || text.includes("sigorta") || text.includes("çalışma"))) {
    parts.push("Hasta klinik bilgisi talep etti.");
  }

  if (parts.length === 0) {
    // Generic: extract meaningful sentence from User turns
    const userLines = transcript.split("\n")
      .filter((l) => l.startsWith("User:"))
      .map((l) => l.replace(/^User:\s*/, "").trim())
      .filter(Boolean);
    if (userLines.length > 0) {
      return `Hasta: "${userLines[0]}"${userLines.length > 1 ? ` ve ${userLines.length - 1} mesaj daha.` : ""}`;
    }
    return transcript.slice(0, 120) + (transcript.length > 120 ? "..." : "");
  }

  return parts.join(" ");
}

function detectIntent(transcript?: string, summary?: string): string {
  const text = ((transcript ?? "") + " " + (summary ?? "")).toLowerCase();
  if (!text.trim()) return "diger";
  if (text.includes("randevu") && (text.includes("aldım") || text.includes("oluştur") || text.includes("almak") || text.includes("alındı"))) return "randevu_alma";
  if (text.includes("iptal") || text.includes("iptal ettim")) return "randevu_iptal";
  if (text.includes("ertele") || text.includes("taşı") || text.includes("değiştir") || text.includes("reschedule")) return "randevu_alma";
  if (text.includes("geri ara") || text.includes("geri arama") || text.includes("tekrar ara")) return "geri_arama";
  if (text.includes("bilgi") || text.includes("saat") || text.includes("sigorta") || text.includes("çalışma") || text.includes("doktor")) return "bilgi";
  return "diger";
}

export async function POST(req: NextRequest) {
  try {
    const body: VapiPayload = await req.json();

    // VAPI wraps payload under message; some versions send flat
    const msg = body.message ?? body;
    if (msg.type && msg.type !== "end-of-call-report") {
      return NextResponse.json({ received: true });
    }

    const callData: VapiCallData = msg.call ?? {};
    const artifact: VapiArtifact = msg.artifact ?? {};
    const analysis: VapiAnalysis = msg.analysis ?? {};

    const callerNumber =
      callData.customer?.number ??
      callData.phoneNumber?.number ??
      "Bilinmiyor";

    const duration = calculateDuration(callData.startedAt, callData.endedAt);
    const transcript = artifact.transcript ?? null;
    // Always generate Turkish summary from transcript; ignore VAPI's English analysis.summary
    const summary = generateTurkishSummary(transcript ?? undefined);
    const intent =
      analysis.structuredData?.intent ??
      detectIntent(transcript ?? undefined, summary);
    const recordingUrl = artifact.recordingUrl ?? null;
    const cost = callData.cost != null ? String(callData.cost.toFixed(6)) : null;
    const vapiCallId = callData.id ?? null;

    let savedCallLogId: string | null = null;

    if (vapiCallId) {
      // Known call ID: upsert to avoid duplicates
      const [saved] = await db
        .insert(callLogs)
        .values({
          callerNumber,
          vapiCallId,
          transcript,
          summary,
          duration,
          intent,
          callStatus: "completed",
          cost,
          recordingUrl,
        })
        .onConflictDoUpdate({
          target: callLogs.vapiCallId,
          set: { summary, intent, duration, callStatus: "completed", recordingUrl },
        })
        .returning();
      savedCallLogId = saved.id;
    } else {
      // No call ID: plain insert (two nulls never conflict in unique constraint)
      const [saved] = await db
        .insert(callLogs)
        .values({
          callerNumber,
          vapiCallId: null,
          transcript,
          summary,
          duration,
          intent,
          callStatus: "completed",
          cost,
          recordingUrl,
        })
        .returning();
      savedCallLogId = saved.id;
    }

    // Keep legacy calls table in sync (best-effort)
    try {
      await db.insert(calls).values({
        callerPhone: callerNumber,
        durationSeconds: duration,
        transcript,
        summary,
        cost,
        outcome: intent,
        recordingUrl,
      });
    } catch { /* ignore legacy table errors */ }

    return NextResponse.json({ success: true, callLogId: savedCallLogId });
  } catch (error) {
    console.error("Call ended webhook error:", error);
    return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
  }
}
