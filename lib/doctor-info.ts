import { db } from "@/db";
import { doctors } from "@/db/schema";
import { ilike } from "drizzle-orm";

const DAYS: Record<string, string> = {
  mon: "Pazartesi", tue: "Salı", wed: "Çarşamba",
  thu: "Perşembe", fri: "Cuma", sat: "Cumartesi", sun: "Pazar",
};

type DoctorRow = { fullName: string; specialization: string; workingHours: unknown };

const SELECT_COLS = {
  fullName: doctors.fullName,
  specialization: doctors.specialization,
  workingHours: doctors.workingHours,
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`timeout_${ms}ms`)), ms)),
  ]);
}

async function queryDoctors(doctorName: string | null, specialization: string | null): Promise<DoctorRow[]> {
  if (doctorName) return db.select(SELECT_COLS).from(doctors).where(ilike(doctors.fullName, `%${doctorName}%`));
  if (specialization) return db.select(SELECT_COLS).from(doctors).where(ilike(doctors.specialization, `%${specialization}%`));
  return db.select(SELECT_COLS).from(doctors);
}

type Params = Record<string, string | null | undefined>;

export async function queryDoctorInfo(
  toolCallId: string,
  params: Params
): Promise<{ results: { toolCallId: string; result: string }[] }> {
  const doctorName = params.doctorName ?? params.doctor_name ?? params.doctor ?? null;
  const specialization =
    params.specialization ?? params.uzmanlik ?? params.uzmanlikAlani ??
    params.speciality ?? params.branch ?? params.department ?? null;

  console.log("[DOCTOR-INFO] Query:", { doctorName, specialization });

  let doctorList: DoctorRow[] = [];
  try {
    try {
      doctorList = await withTimeout(queryDoctors(doctorName, specialization), 4500);
    } catch (firstErr) {
      console.warn("[DOCTOR-INFO] First attempt failed, retrying:", (firstErr as Error).message);
      doctorList = await withTimeout(queryDoctors(doctorName, specialization), 4500);
    }
  } catch (err) {
    console.error("[DOCTOR-INFO] Both attempts failed:", err);
    return {
      results: [{ toolCallId, result: "Doktor bilgilerine şu an ulaşılamıyor. Lütfen tekrar deneyin." }],
    };
  }

  console.log("[DOCTOR-INFO] Found:", doctorList.length, "doctors");

  if (doctorList.length === 0) {
    const criteria = specialization ?? doctorName ?? "belirtilen";
    return {
      results: [{
        toolCallId,
        result: `DOKTOR_YOK: "${criteria}" uzmanlık alanında sistemde kayıtlı doktor bulunmamaktadır. Başka bir uzmanlık alanı sorabilirsiniz.`,
      }],
    };
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

  return { results: [{ toolCallId, result: infoLines.join(" | ") }] };
}
