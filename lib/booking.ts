import { db } from "@/db";
import { appointments, aiActions } from "@/db/schema";
import { parseDate, parseTime } from "@/lib/vapi";

type Params = Record<string, string | null | undefined>;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`timeout_${ms}ms`)), ms)),
  ]);
}

/** Extract and normalise all appointment fields from a VAPI params object. */
export function extractBookingParams(params: Params) {
  const patientName = params.patientName ?? params.patient_name ?? params.name ?? null;
  const phone =
    params.phone ?? params.patientPhone ?? params.patient_phone ?? params.phoneNumber ?? null;
  const doctorName = params.doctorName ?? params.doctor_name ?? params.doctor ?? null;
  const notes = params.notes ?? null;

  let rawDate: string | null =
    params.date ?? params.appointmentDate ?? params.appointment_date ??
    params.tarih ?? params.dateStr ?? params.dateString ?? null;
  let rawTime: string | null =
    params.time ?? params.appointmentTime ?? params.appointment_time ??
    params.saat ?? params.timeStr ?? params.timeString ?? null;

  // Scan all values for ISO date / HH:MM patterns not found by name
  if (!rawDate || !rawTime) {
    for (const val of Object.values(params)) {
      const s = String(val ?? "").trim();
      if (!rawDate && /^\d{4}-\d{2}-\d{2}/.test(s)) rawDate = s.slice(0, 10);
      if (!rawTime && /^\d{2}:\d{2}/.test(s)) rawTime = s.slice(0, 5);
    }
  }

  // Split combined datetime (e.g. "2026-07-23T16:00")
  if (rawDate && rawDate.includes("T") && !rawTime) {
    const [d, t] = rawDate.split("T");
    rawDate = d;
    rawTime = t?.slice(0, 5) ?? null;
  }

  const datePart = parseDate(rawDate);
  const timePart = parseTime(rawTime);

  return { patientName, phone, doctorName, notes, rawDate, rawTime, datePart, timePart };
}

export async function insertAppointment(values: {
  patientName: string;
  patientPhone: string | null;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentAt: Date;
  status: string;
  source: string;
  notes: string | null;
}) {
  const doInsert = () => db.insert(appointments).values(values).returning();
  try {
    return (await withTimeout(doInsert(), 5000))[0];
  } catch (err) {
    console.warn("[BOOKING] First insert failed, retrying:", (err as Error).message);
  }
  return (await withTimeout(doInsert(), 5000))[0];
}

export async function createAppointment(
  toolCallId: string,
  params: Params
): Promise<{ results: { toolCallId: string; result: string }[] }> {
  const { patientName, phone, doctorName, notes, rawDate, rawTime, datePart, timePart } =
    extractBookingParams(params);

  console.log("[BOOKING] params:", JSON.stringify(params));
  console.log("[BOOKING] resolved →", { patientName, phone, doctorName, datePart, timePart });

  if (!patientName || !phone || !datePart || !timePart) {
    const missing = [
      !patientName && "hasta adı",
      !phone && "telefon numarası",
      !datePart && "randevu tarihi",
      !timePart && "randevu saati",
    ].filter(Boolean).join(", ");
    console.error("[BOOKING] missing:", { patientName: !!patientName, phone: !!phone, rawDate, datePart, rawTime, timePart, keys: Object.keys(params) });
    return {
      results: [{ toolCallId, result: `${missing} alınamadı. Lütfen hastadan ${missing} tekrar alın.` }],
    };
  }

  const appointmentAt = new Date(`${datePart}T${timePart}:00`);
  if (isNaN(appointmentAt.getTime())) {
    return {
      results: [{ toolCallId, result: "Tarih veya saat geçersiz. Lütfen hastadan tarihi ve saati tekrar alın." }],
    };
  }

  let newAppointment;
  try {
    newAppointment = await insertAppointment({
      patientName,
      patientPhone: phone,
      doctorName: doctorName ?? "Belirtilmedi",
      appointmentDate: datePart,
      appointmentTime: timePart,
      appointmentAt,
      status: "onaylandi",
      source: "voice_agent",
      notes: notes ?? null,
    });
  } catch (dbErr) {
    console.error("[BOOKING] DB insert failed:", dbErr);
    return {
      results: [{ toolCallId, result: "Randevu kaydedilemedi, sistem geçici olarak yanıt vermiyor. Lütfen tekrar deneyin." }],
    };
  }

  console.log("[BOOKING] Appointment created:", newAppointment.id);

  try {
    await db.insert(aiActions).values({
      actionType: "create_appointment",
      payload: { patientName, phone, doctorName, date: datePart, time: timePart },
      result: `Randevu başarıyla oluşturuldu. ID: ${newAppointment.id}`,
    });
  } catch { /* ignore */ }

  return {
    results: [{
      toolCallId,
      result: `Randevunuz ${datePart} tarihinde saat ${timePart} için ${doctorName ?? "doktorunuzla"} başarıyla oluşturuldu.`,
    }],
  };
}
