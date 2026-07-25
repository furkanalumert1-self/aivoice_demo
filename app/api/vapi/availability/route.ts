export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, doctors } from "@/db/schema";
import { and, gte, lte, ne, ilike } from "drizzle-orm";
import { extractToolCall, parseDate, parseTime } from "@/lib/vapi";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`timeout_${ms}ms`)), ms)),
  ]);
}

async function runWithRetry<T>(fn: () => Promise<T>, ms = 4000): Promise<T> {
  try { return await withTimeout(fn(), ms); } catch { /* retry */ }
  return withTimeout(fn(), ms);
}

export async function POST(req: NextRequest) {
  let toolCallId = "unknown";
  try {
    const body = await req.json();
    const extracted = extractToolCall(body);
    toolCallId = extracted.toolCallId;
    const params = extracted.params;

    console.log("[AVAILABILITY] Incoming params:", JSON.stringify(params));

    // Accept multiple date/time param names
    const doctorName = params.doctorName ?? params.doctor_name ?? params.doctor ?? null;
    const specialization = params.specialization ?? params.uzmanlik ?? null;
    const rawDate =
      params.date ?? params.preferredDate ?? params.appointmentDate ??
      params.appointment_date ?? params.preferred_date ?? params.tarih ?? null;
    const rawTime =
      params.time ?? params.preferredTime ?? params.appointmentTime ??
      params.appointment_time ?? params.preferred_time ?? params.saat ?? null;

    const targetDate = parseDate(rawDate);
    const preferredTime = parseTime(rawTime);

    console.log("[AVAILABILITY] Parsed → date:", targetDate, "| time:", preferredTime, "| raw:", { rawDate, rawTime });

    if (!targetDate) {
      return NextResponse.json({
        results: [{
          toolCallId,
          result: "Müsaitlik kontrolü için tarih bilgisi gereklidir. Lütfen hastadan randevu tarihini alın.",
        }],
      });
    }

    // Find doctor by name or specialization (with Neon cold-start retry)
    let resolvedDoctorName: string | null = doctorName;
    if (!resolvedDoctorName && specialization) {
      const found = await runWithRetry(() =>
        db.select({ fullName: doctors.fullName })
          .from(doctors)
          .where(ilike(doctors.specialization, `%${specialization}%`))
          .limit(1)
      );
      resolvedDoctorName = found[0]?.fullName ?? null;
    } else if (resolvedDoctorName) {
      const found = await runWithRetry(() =>
        db.select({ fullName: doctors.fullName })
          .from(doctors)
          .where(ilike(doctors.fullName, `%${resolvedDoctorName!}%`))
          .limit(1)
      );
      resolvedDoctorName = found[0]?.fullName ?? resolvedDoctorName;
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const booked = await runWithRetry(() =>
      db.select({ appointmentTime: appointments.appointmentTime, doctorName: appointments.doctorName })
        .from(appointments)
        .where(
          and(
            gte(appointments.appointmentAt, startOfDay),
            lte(appointments.appointmentAt, endOfDay),
            ne(appointments.status, "iptal")
          )
        )
    );

    const bookedTimes = booked
      .filter((a) => !resolvedDoctorName || a.doctorName === resolvedDoctorName)
      .map((a) => a.appointmentTime)
      .filter(Boolean) as string[];

    // Generate available slots (09:00 - 17:30, 30 min increments)
    const allSlots: string[] = [];
    for (let h = 9; h < 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        const slot = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        if (!bookedTimes.includes(slot)) allSlots.push(slot);
      }
    }

    const displayName = resolvedDoctorName ?? "Uygun doktor";

    let resultMessage: string;
    if (allSlots.length === 0) {
      resultMessage = `${displayName} için ${targetDate} tarihinde müsait saat bulunmuyor.`;
    } else if (preferredTime && allSlots.includes(preferredTime)) {
      // Preferred time is available — confirm directly so AI can proceed to booking
      resultMessage = `${displayName} ${targetDate} tarihinde saat ${preferredTime} müsait. Randevuyu oluşturabilirsiniz. Doktor adı: ${displayName}.`;
    } else if (preferredTime) {
      // Preferred time is booked — offer nearest alternatives
      const alternatives = allSlots.slice(0, 4).join(", ");
      resultMessage = `${displayName} için ${targetDate} tarihinde saat ${preferredTime} dolu. En yakın müsait saatler: ${alternatives}. Doktor adı: ${displayName}.`;
    } else {
      // No preference — offer 3 options only (voice-friendly)
      const slotList = allSlots.slice(0, 3).join(", ");
      resultMessage = `${displayName} ${targetDate} tarihinde müsait saatler: ${slotList}. Doktor adı: ${displayName}.`;
    }

    console.log("[AVAILABILITY] Result:", resultMessage);

    return NextResponse.json({
      results: [{ toolCallId, result: resultMessage }],
    });
  } catch (error) {
    console.error("[AVAILABILITY] Error:", error);
    return NextResponse.json({
      results: [{
        toolCallId,
        result: "Müsaitlik kontrolü sırasında bir hata oluştu. Lütfen tekrar deneyin.",
      }],
    });
  }
}
