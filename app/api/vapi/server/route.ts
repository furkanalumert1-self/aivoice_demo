export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { doctors, clinicSettings, services } from "@/db/schema";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messageType: string = body?.message?.type ?? body?.type ?? "";

    console.log("[VAPI-SERVER] Event type:", messageType, "| Body keys:", Object.keys(body));

    // Skip events that don't need context injection
    const skipTypes = ["end-of-call-report", "function-call", "transcript", "speech-update", "hang", "tool-calls"];
    if (skipTypes.includes(messageType)) {
      return NextResponse.json({ received: true });
    }

    // For call-started, assistant-request, or any unknown event — inject context
    let context = "";
    try {
      // 4-second timeout to avoid VAPI timing out waiting for our response
      const timeoutPromise = new Promise<string>((resolve) =>
        setTimeout(() => resolve("Klinik: Ali Mert Klinik\nDoktor bilgisi yüklenemedi (zaman aşımı)."), 4000)
      );
      context = await Promise.race([buildClinicContext(), timeoutPromise]);
    } catch (err) {
      console.error("[VAPI-SERVER] Context build error:", err);
      context = "Klinik: Ali Mert Klinik\nDoktor bilgisi şu an yüklenemedi.";
    }

    console.log("[VAPI-SERVER] Injecting context (first 200 chars):", context.slice(0, 200));

    const contextBlock = `--- GÜNCEL KLİNİK BİLGİLERİ (otomatik yüklendi) ---\n${context}\n--- BU BİLGİLERİ KULLANARAK CEVAP VER, DOKTOR ADINI UYDURMA ---`;

    // variableValues: replaces {{clinic_context}} in the VAPI system prompt
    // model.messages: injects as an extra system message (belt-and-suspenders)
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
