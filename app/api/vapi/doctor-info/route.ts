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

const SELECT_COLS = {
  fullName: doctors.fullName,
  specialization: doctors.specialization,
  workingHours: doctors.workingHours,
};

type DoctorRow = { fullName: string; specialization: string; workingHours: unknown };

async function queryDoctors(doctorName: string | null, specialization: string | null): Promise<DoctorRow[]> {
  if (doctorName) {
    return db.select(SELECT_COLS).from(doctors).where(ilike(doctors.fullName, `%${doctorName}%`));
  }
  if (specialization) {
    return db.select(SELECT_COLS).from(doctors).where(ilike(doctors.specialization, `%${specialization}%`));
  }
  return db.select(SELECT_COLS).from(doctors);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timeout_${ms}ms`)), ms)),
  ]);
}

async function queryWithRetry(doctorName: string | null, specialization: string | null): Promise<DoctorRow[]> {
  // First attempt: 4s timeout (cold-start typically resolves in 2-4s)
  try {
    return await withTimeout(queryDoctors(doctorName, specialization), 4000);
  } catch (err) {
    console.warn("[DOCTOR-INFO] First attempt failed, retrying immediately:", (err as Error).message);
  }
  // Retry immediately — Neon should be warm after the first attempt initiated cold start
  return withTimeout(queryDoctors(doctorName, specialization), 4000);
}

export async function POST(req: NextRequest) {
  let toolCallId = "unknown";
  try {
    const body = await req.json();
    console.log("[DOCTOR-INFO] Full body:", JSON.stringify(body).slice(0, 500));

    const extracted = extractToolCall(body);
    toolCallId = extracted.toolCallId;
    const params = extracted.params;
    console.log("[DOCTOR-INFO] Extracted params:", JSON.stringify(params));

    const doctorName = params.doctorName ?? params.doctor_name ?? params.doctor ?? null;
    const specialization =
      params.specialization ?? params.uzmanlik ?? params.uzmanlikAlani ??
      params.speciality ?? params.branch ?? params.department ?? null;

    console.log("[DOCTOR-INFO] Query:", { doctorName, specialization });

    let doctorList: DoctorRow[] = [];
    try {
      doctorList = await queryWithRetry(doctorName, specialization);
    } catch (dbErr) {
      console.error("[DOCTOR-INFO] DB query failed after retry:", dbErr);
      return NextResponse.json({
        results: [{
          toolCallId,
          result: "Doktor bilgilerine şu an ulaşılamıyor. Lütfen tekrar deneyin.",
        }],
      });
    }

    console.log("[DOCTOR-INFO] Found:", doctorList.length, "doctors");

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
      results: [{ toolCallId, result: infoLines.join(" | ") }],
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
