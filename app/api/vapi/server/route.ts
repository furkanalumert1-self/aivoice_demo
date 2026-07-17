export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { doctors, clinicSettings, services, calls, callLogs } from "@/db/schema";
import { createAppointment } from "@/lib/booking";
import { queryDoctorInfo } from "@/lib/doctor-info";
import { extractToolCall } from "@/lib/vapi";

// ── Context injection ────────────────────────────────────────────────────────

const DAY_NAMES: Record<string, string> = {
  mon: "Pazartesi", tue: "Salı", wed: "Çarşamba",
  thu: "Perşembe", fri: "Cuma", sat: "Cumartesi", sun: "Pazar",
};

async function buildClinicContext(): Promise<string> {
  const [doctorList, settings, serviceList] = await Promise.allSettled([
    db
      .select({
        fullName: doctors.fullName,
        specialization: doctors.specialization,
        workingHours: doctors.workingHours,
        active: doctors.active,
      })
      .from(doctors),
    db.select().from(clinicSettings).limit(1),
    db
      .select({ name: services.name, durationMinutes: services.durationMinutes, price: services.price, active: services.active })
      .from(services),
  ]);

  const clinicName =
    settings.status === "fulfilled" && settings.value[0]?.clinicName
      ? settings.value[0].clinicName
      : "Ali Mert Klinik";

  const openingHour =
    settings.status === "fulfilled" && settings.value[0]?.openingHour
      ? settings.value[0].openingHour
      : "09:00";

  const closingHour =
    settings.status === "fulfilled" && settings.value[0]?.closingHour
      ? settings.value[0].closingHour
      : "18:00";

  let doctorLines = "";
  if (doctorList.status === "fulfilled" && doctorList.value.length > 0) {
    const activeDoctors = doctorList.value.filter((d) => d.active !== false);
    doctorLines = activeDoctors
      .map((doc) => {
        const wh = doc.workingHours as Record<string, string | null> | null;
        let schedule = "";
        if (wh) {
          const days = Object.entries(wh)
            .filter(([, v]) => v)
            .map(([k, v]) => `${DAY_NAMES[k] ?? k} ${v}`)
            .join(", ");
          if (days) schedule = ` (${days})`;
        }
        return `- ${doc.specialization}: ${doc.fullName}${schedule}`;
      })
      .join("\n");
  }

  let serviceLines = "";
  if (serviceList.status === "fulfilled" && serviceList.value.length > 0) {
    const activeServices = serviceList.value.filter((s) => s.active !== false);
    serviceLines = activeServices
      .map((s) => {
        const parts = [s.name];
        if (s.durationMinutes) parts.push(`${s.durationMinutes} dk`);
        if (s.price) parts.push(`₺${s.price}`);
        return `- ${parts.join(", ")}`;
      })
      .join("\n");
  }

  return [
    `Klinik: ${clinicName}`,
    `Çalışma saatleri: Pazartesi–Cuma ${openingHour}–${closingHour}, Cumartesi ${openingHour}–14:00, Pazar kapalı`,
    doctorLines ? `Aktif doktorlar:\n${doctorLines}` : "Doktor bilgisi şu an yüklenemedi.",
    serviceLines ? `Sunulan hizmetler:\n${serviceLines}` : "",
  ].filter(Boolean).join("\n");
}

// ── Call logging (end-of-call-report) ────────────────────────────────────────

function calculateDuration(startedAt?: string, endedAt?: string): number | null {
  if (!startedAt || !endedAt) return null;
  return Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
}

function generateTurkishSummary(transcript?: string): string {
  if (!transcript) return "Transkript mevcut değil.";
  const text = transcript.toLowerCase();
  const parts: string[] = [];
  if (text.includes("randevu") && (text.includes("almak") || text.includes("alabilir") || text.includes("almak istiyorum"))) {
    if (text.includes("oluşturuldu") || text.includes("başarıyla") || text.includes("alındı")) {
      parts.push("Hasta randevu talebi iletildi ve randevu oluşturuldu.");
    } else {
      parts.push("Hasta randevu almak istedi.");
    }
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
  if (!parts.length && (text.includes("bilgi") || text.includes("saat") || text.includes("sigorta") || text.includes("doktor"))) {
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
  if (text.includes("iptal") || text.includes("iptal ettim")) return "randevu_iptal";
  if (text.includes("ertele") || text.includes("taşı") || text.includes("değiştir")) return "randevu_erteleme";
  if (text.includes("geri ara") || text.includes("geri arama")) return "geri_arama";
  if (text.includes("bilgi") || text.includes("saat") || text.includes("doktor")) return "bilgi";
  return "diger";
}

async function handleEndOfCall(body: Record<string, unknown>) {
  const msg = (body.message ?? body) as Record<string, unknown>;
  const callData = (msg.call ?? {}) as Record<string, unknown>;
  const artifact = (msg.artifact ?? {}) as Record<string, unknown>;
  const customer = (callData.customer ?? {}) as Record<string, unknown>;
  const phoneNumber = (callData.phoneNumber ?? {}) as Record<string, unknown>;

  const callerNumber = (customer.number ?? phoneNumber.number ?? "Bilinmiyor") as string;

  // VAPI sends timestamps at different paths across versions; try all known locations
  const duration =
    calculateDuration(callData.startedAt as string, callData.endedAt as string) ??
    calculateDuration(msg.startedAt as string, msg.endedAt as string) ??
    (callData.durationMs   ? Math.round(Number(callData.durationMs)      / 1000) : null) ??
    (callData.durationSeconds ? Math.round(Number(callData.durationSeconds))     : null) ??
    (msg.durationMs        ? Math.round(Number(msg.durationMs)           / 1000) : null) ??
    (msg.durationSeconds   ? Math.round(Number(msg.durationSeconds))             : null);
  const transcript = (artifact.transcript ?? null) as string | null;
  const summary = generateTurkishSummary(transcript ?? undefined);
  const intent = detectIntent(transcript ?? undefined);
  const recordingUrl = (artifact.recordingUrl ?? null) as string | null;
  const costRaw = callData.cost as number | undefined;
  const cost = costRaw != null ? String(costRaw.toFixed(6)) : null;
  const vapiCallId = (callData.id ?? null) as string | null;

  console.log("[VAPI-SERVER] end-of-call-report | callId:", vapiCallId, "| caller:", callerNumber, "| duration:", duration);
  // Dump duration-related fields to diagnose which path VAPI uses
  console.log("[VAPI-SERVER] duration fields | call.startedAt:", callData.startedAt, "| call.endedAt:", callData.endedAt, "| call.durationMs:", callData.durationMs, "| call.durationSeconds:", callData.durationSeconds, "| msg.startedAt:", msg.startedAt, "| msg.endedAt:", msg.endedAt);

  if (vapiCallId) {
    await db
      .insert(callLogs)
      .values({ callerNumber, vapiCallId, transcript, summary, duration, intent, callStatus: "completed", cost, recordingUrl })
      .onConflictDoUpdate({
        target: callLogs.vapiCallId,
        set: { summary, intent, duration, callStatus: "completed", recordingUrl },
      });
  } else {
    await db
      .insert(callLogs)
      .values({ callerNumber, vapiCallId: null, transcript, summary, duration, intent, callStatus: "completed", cost, recordingUrl });
  }

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
  } catch { /* legacy table — best effort */ }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const msg = (body.message ?? body) as Record<string, unknown>;
    const messageType: string = (msg.type ?? "") as string;

    console.log("[VAPI-SERVER] Event type:", messageType);

    // Call-ended: log to DB
    if (messageType === "end-of-call-report") {
      try {
        await handleEndOfCall(body);
      } catch (err) {
        console.error("[VAPI-SERVER] Call log error:", err);
      }
      return NextResponse.json({ received: true });
    }

    // Tool calls: handle inline or proxy to the appropriate route handler
    if (messageType === "tool-calls" || messageType === "function-call") {
      const TOOL_ROUTES: Record<string, string> = {
        checkavailability:      "/api/vapi/availability",
        cancel_appointment:     "/api/vapi/cancel",
        reschedule_appointment: "/api/vapi/reschedule",
        createCallbackRequest:  "/api/vapi/callback",
      };

      // Extract function name and params from all known VAPI payload shapes
      const tc = (
        (msg?.toolCalls    as Record<string, unknown>[])?.[0] ??
        (msg?.toolCallList as Record<string, unknown>[])?.[0]
      ) as Record<string, unknown> | undefined;
      const legacyFn = msg?.functionCall as Record<string, unknown> | undefined;
      const functionName: string =
        ((tc?.function as Record<string, unknown>)?.name as string) ??
        (legacyFn?.name as string) ?? "";

      console.log("[VAPI-SERVER] Tool call:", functionName);

      // Handle create_appointment and doktor_sorgula (+ doctor_info alias) inline — avoids HTTP proxy round-trip
      if (functionName === "create_appointment" || functionName === "doktor_sorgula" || functionName === "doctor_info") {
        const { toolCallId, params } = extractToolCall(body);
        console.log(`[VAPI-SERVER] ${functionName} inline | toolCallId:`, toolCallId, "| params:", JSON.stringify(params));
        try {
          const result = functionName === "create_appointment"
            ? await createAppointment(toolCallId, params)
            : await queryDoctorInfo(toolCallId, params); // covers doktor_sorgula + doctor_info
          return NextResponse.json(result);
        } catch (err) {
          console.error(`[VAPI-SERVER] ${functionName} error:`, err);
          const errMsg = functionName === "create_appointment"
            ? "Randevu kaydedilemedi, lütfen tekrar deneyin."
            : "Doktor bilgilerine şu an ulaşılamıyor. Lütfen tekrar deneyin.";
          return NextResponse.json({ results: [{ toolCallId, result: errMsg }] });
        }
      }

      const targetPath = TOOL_ROUTES[functionName];
      console.log("[VAPI-SERVER] Proxying", functionName, "→", targetPath ?? "unknown");

      if (targetPath) {
        try {
          const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://aivoice-demo.vercel.app").replace(/\/$/, "");
          const controller = new AbortController();
          const proxyTimer = setTimeout(() => controller.abort(), 8000);
          const proxyRes = await fetch(`${appUrl}${targetPath}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          clearTimeout(proxyTimer);
          const proxyData = await proxyRes.json();
          return NextResponse.json(proxyData);
        } catch (proxyErr) {
          console.error("[VAPI-SERVER] Proxy error:", proxyErr);
          return NextResponse.json({
            results: [{ toolCallId: "unknown", result: "Sistem geçici olarak yanıt vermiyor. Tekrar deneyin." }],
          });
        }
      }

      return NextResponse.json({ received: true });
    }

    // Other non-context events: acknowledge silently
    const skipTypes = ["transcript", "speech-update", "hang"];
    if (skipTypes.includes(messageType)) {
      return NextResponse.json({ received: true });
    }

    // call-started / assistant-request / unknown — inject clinic context
    let context = "";
    try {
      const timeoutPromise = new Promise<string>((resolve) =>
        setTimeout(() => resolve("Klinik: Ali Mert Klinik\nDoktor bilgisi yüklenemedi (zaman aşımı)."), 8000)
      );
      context = await Promise.race([buildClinicContext(), timeoutPromise]);
    } catch (err) {
      console.error("[VAPI-SERVER] Context build error:", err);
      context = "Klinik: Ali Mert Klinik\nDoktor bilgisi şu an yüklenemedi.";
    }

    console.log("[VAPI-SERVER] Injecting context:", context.slice(0, 200));

    const contextBlock = `--- GÜNCEL KLİNİK BİLGİLERİ (otomatik yüklendi) ---\n${context}\n--- BU BİLGİLERİ KULLANARAK CEVAP VER, DOKTOR ADINI UYDURMA ---`;

    return NextResponse.json({
      assistantOverrides: {
        variableValues: {
          clinic_context: contextBlock,
        },
        model: {
          messages: [
            {
              role: "system",
              content: contextBlock,
            },
          ],
        },
      },
    });
  } catch (error) {
    console.error("[VAPI-SERVER] Error:", error);
    return NextResponse.json({ received: true });
  }
}
