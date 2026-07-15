export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { doctors, aiActions } from "@/db/schema";
import { ilike } from "drizzle-orm";
import { extractToolCall } from "@/lib/vapi";

const DAYS: Record<string, string> = {
  mon: "Pazartesi", tue: "Salı", wed: "Çarşamba",
  thu: "Perşembe", fri: "Cuma", sat: "Cumartesi", sun: "Pazar",
};

export async function POST(req: NextRequest) {
  let toolCallId = "unknown";
  try {
    const body = await req.json();
    const extracted = extractToolCall(body);
    toolCallId = extracted.toolCallId;
    const params = extracted.params;

    const doctorName = params.doctorName ?? params.doctor_name ?? params.doctor ?? null;
    const specialization =
      params.specialization ?? params.uzmanlik ?? params.uzmanlikAlani ??
      params.speciality ?? params.branch ?? null;

    console.log("[DOCTOR-INFO] Params:", { doctorName, specialization });

    const selectCols = {
      fullName: doctors.fullName,
      specialization: doctors.specialization,
      workingHours: doctors.workingHours,
    };

    let doctorList: { fullName: string; specialization: string; workingHours: unknown }[] = [];

    try {
      if (doctorName) {
        doctorList = await db
          .select(selectCols)
          .from(doctors)
          .where(ilike(doctors.fullName, `%${doctorName}%`));
      } else if (specialization) {
        doctorList = await db
          .select(selectCols)
          .from(doctors)
          .where(ilike(doctors.specialization, `%${specialization}%`));
      } else {
        doctorList = await db.select(selectCols).from(doctors);
      }
    } catch (dbErr) {
      console.error("[DOCTOR-INFO] DB query error:", dbErr);
      return NextResponse.json({
        results: [{
          toolCallId,
          result: "Doktor bilgilerine şu an ulaşılamıyor. Lütfen tekrar deneyin.",
        }],
      });
    }

    console.log("[DOCTOR-INFO] Found:", doctorList.length, "doctors");

    // Non-critical logging — never let this break the response
    try {
      await db.insert(aiActions).values({
        actionType: "doctor_info",
        payload: { doctorName, specialization },
        result: `${doctorList.length} doktor bilgisi döndürüldü.`,
      });
    } catch { /* ignore */ }

    if (doctorList.length === 0) {
      const criteria = doctorName ? `"${doctorName}"` : specialization ? `"${specialization}" uzmanlığında` : "";
      return NextResponse.json({
        results: [{
          toolCallId,
          result: `${criteria} doktor bulunamadı. Kliniğimizdeki doktorları listeleyeyim mi?`,
        }],
      });
    }

    const infoLines = doctorList.map((doc) => {
      const wh = doc.workingHours as Record<string, string | null> | null;
      let schedule = "";
      if (wh) {
        const activeDays = Object.entries(wh)
          .filter(([, v]) => v)
          .map(([k, v]) => `${DAYS[k] ?? k}: ${v}`)
          .join(", ");
        if (activeDays) schedule = ` Çalışma günleri: ${activeDays}.`;
      }
      return `${doc.fullName} (${doc.specialization}).${schedule}`;
    });

    return NextResponse.json({
      results: [{
        toolCallId,
        result: infoLines.join(" | "),
      }],
    });
  } catch (error) {
    console.error("[DOCTOR-INFO] Unexpected error:", error);
    return NextResponse.json({
      results: [{
        toolCallId,
        result: "Doktor bilgisi alınırken bir hata oluştu. Lütfen tekrar deneyin.",
      }],
    });
  }
}
