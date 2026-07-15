export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { doctors, clinicSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const DAY_NAMES: Record<string, string> = {
  mon: "Pazartesi", tue: "Salı", wed: "Çarşamba",
  thu: "Perşembe", fri: "Cuma", sat: "Cumartesi", sun: "Pazar",
};

async function buildClinicContext(): Promise<string> {
  const [doctorList, settings] = await Promise.allSettled([
    db
      .select({
        fullName: doctors.fullName,
        specialization: doctors.specialization,
        workingHours: doctors.workingHours,
        active: doctors.active,
      })
      .from(doctors),
    db.select().from(clinicSettings).limit(1),
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

  return [
    `Klinik: ${clinicName}`,
    `Çalışma saatleri: Pazartesi–Cuma ${openingHour}–${closingHour}, Cumartesi ${openingHour}–14:00, Pazar kapalı`,
    doctorLines ? `Aktif doktorlar:\n${doctorLines}` : "Doktor bilgisi şu an yüklenemedi.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messageType: string = body?.message?.type ?? body?.type ?? "";

    console.log("[VAPI-SERVER] Event type:", messageType);

    // Dynamic context injection at call start
    if (messageType === "call-started" || messageType === "assistant-request") {
      let context = "";
      try {
        context = await buildClinicContext();
      } catch (err) {
        console.error("[VAPI-SERVER] Context build error:", err);
        context = "Klinik: Ali Mert Klinik\nDoktor bilgisi şu an yüklenemedi.";
      }

      console.log("[VAPI-SERVER] Injecting context:\n", context);

      // assistantOverrides: inject a system message with live clinic data.
      // VAPI appends these to the assistant's existing system prompt.
      return NextResponse.json({
        assistantOverrides: {
          model: {
            messages: [
              {
                role: "system",
                content: `--- GÜNCEL KLİNİK BİLGİLERİ (otomatik yüklendi) ---\n${context}\n--- BU BİLGİLERİ KULLANARAK CEVAP VER, DOKTOR ADINI UYDURMA ---`,
              },
            ],
          },
        },
      });
    }

    // All other VAPI events — acknowledge silently
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[VAPI-SERVER] Error:", error);
    return NextResponse.json({ received: true });
  }
}
