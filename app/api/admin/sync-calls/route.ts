export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { callLogs, calls } from "@/db/schema";
import { inArray } from "drizzle-orm";

function generateTurkishSummary(transcript?: string): string {
  if (!transcript) return "Transkript mevcut değil.";
  const text = transcript.toLowerCase();
  const parts: string[] = [];
  if (text.includes("randevu") && (text.includes("almak") || text.includes("alabilir") || text.includes("oluşturuldu"))) {
    parts.push(
      text.includes("oluşturuldu") || text.includes("alındı")
        ? "Hasta randevu talebi iletildi ve randevu oluşturuldu."
        : "Hasta randevu almak istedi."
    );
  }
  if (text.includes("iptal") && text.includes("randevu")) {
    parts.push(text.includes("iptal edildi") ? "Randevu iptal edildi." : "Hasta randevu iptali talep etti.");
  }
  if (text.includes("ertele") || text.includes("taşı") || text.includes("yeniden planla")) {
    parts.push("Randevu yeniden planlandı.");
  }
  if (text.includes("geri ara") || text.includes("geri arama")) {
    parts.push("Geri arama talebi oluşturuldu.");
  }
  if (!parts.length && (text.includes("bilgi") || text.includes("saat") || text.includes("doktor"))) {
    parts.push("Hasta klinik bilgisi talep etti.");
  }
  if (parts.length === 0) {
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

function detectIntent(transcript?: string): string {
  const text = (transcript ?? "").toLowerCase();
  if (!text.trim()) return "diger";
  if (text.includes("randevu") && (text.includes("aldım") || text.includes("oluştur") || text.includes("almak") || text.includes("alındı"))) return "randevu_alma";
  if (text.includes("iptal")) return "randevu_iptal";
  if (text.includes("ertele") || text.includes("taşı") || text.includes("değiştir")) return "randevu_erteleme";
  if (text.includes("geri ara") || text.includes("geri arama")) return "geri_arama";
  if (text.includes("bilgi") || text.includes("saat") || text.includes("doktor")) return "bilgi";
  return "diger";
}

export async function POST() {
  const apiKey = process.env.VAPI_API_KEY;
  const assistantId = process.env.VAPI_ASSISTANT_ID;

  if (!apiKey) {
    return NextResponse.json({ error: "VAPI_API_KEY tanımlı değil" }, { status: 500 });
  }

  try {
    // Fetch up to 100 recent calls from VAPI
    const params = new URLSearchParams({ limit: "100", sortOrder: "DESC" });
    if (assistantId) params.set("assistantId", assistantId);

    const vapiRes = await fetch(`https://api.vapi.ai/call?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!vapiRes.ok) {
      const errText = await vapiRes.text();
      console.error("[sync-calls] VAPI error:", vapiRes.status, errText);
      return NextResponse.json({ error: `VAPI API hatası: ${vapiRes.status}` }, { status: 502 });
    }

    const vapiCalls = await vapiRes.json() as Record<string, unknown>[];

    if (!Array.isArray(vapiCalls) || vapiCalls.length === 0) {
      return NextResponse.json({ imported: 0, message: "VAPI'de çağrı bulunamadı" });
    }

    // Find which call IDs are already in our DB
    const vapiIds = vapiCalls.map((c) => c.id as string).filter(Boolean);
    const existing = await db
      .select({ vapiCallId: callLogs.vapiCallId })
      .from(callLogs)
      .where(inArray(callLogs.vapiCallId, vapiIds));

    const existingIds = new Set(existing.map((r) => r.vapiCallId));
    const missing = vapiCalls.filter((c) => !existingIds.has(c.id as string));

    if (missing.length === 0) {
      return NextResponse.json({ imported: 0, message: "Tüm çağrılar zaten senkronize" });
    }

    let imported = 0;
    for (const vapiCall of missing) {
      try {
        const callData = vapiCall as Record<string, unknown>;
        const customer = (callData.customer ?? {}) as Record<string, unknown>;
        const artifact = (callData.artifact ?? {}) as Record<string, unknown>;

        const callerNumber = (customer.number ?? "Bilinmiyor") as string;
        const vapiCallId = callData.id as string;
        const transcript = (artifact.transcript ?? null) as string | null;
        const recordingUrl = (artifact.recordingUrl ?? null) as string | null;
        const costRaw = callData.cost as number | undefined;
        const cost = costRaw != null ? String(costRaw.toFixed(6)) : null;

        // Duration from startedAt / endedAt
        let duration: number | null = null;
        if (callData.startedAt && callData.endedAt) {
          duration = Math.round(
            (new Date(callData.endedAt as string).getTime() - new Date(callData.startedAt as string).getTime()) / 1000
          );
        }

        const summary = generateTurkishSummary(transcript ?? undefined);
        const intent = detectIntent(transcript ?? undefined);

        await db
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
          });

        // Legacy table
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
        } catch { /* ignore */ }

        imported++;
      } catch (rowErr) {
        console.error("[sync-calls] Row error:", rowErr);
      }
    }

    return NextResponse.json({ imported, total: vapiCalls.length, message: `${imported} çağrı içe aktarıldı` });
  } catch (error) {
    console.error("[sync-calls] Error:", error);
    return NextResponse.json({ error: "Senkronizasyon başarısız" }, { status: 500 });
  }
}
