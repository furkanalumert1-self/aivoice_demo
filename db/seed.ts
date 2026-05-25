import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysOffset: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 4) * 15, 0, 0);
  return date;
}

function randomPhone(): string {
  return `+90 5${Math.floor(Math.random() * 100).toString().padStart(2, "0")} ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 9000 + 1000)}`;
}

async function seed() {
  console.log("Seeding database...");

  // --- DOCTORS ---
  const doctorData: schema.NewDoctor[] = [
    {
      fullName: "Dr. Ayşe Kaya",
      specialization: "Dahiliye",
      workingHours: {
        mon: "09:00-17:00",
        tue: "09:00-17:00",
        wed: "09:00-17:00",
        thu: "09:00-17:00",
        fri: "09:00-14:00",
        sat: null,
        sun: null,
      },
      active: true,
    },
    {
      fullName: "Dr. Mehmet Yılmaz",
      specialization: "Kardiyoloji",
      workingHours: {
        mon: "10:00-18:00",
        tue: "10:00-18:00",
        wed: null,
        thu: "10:00-18:00",
        fri: "10:00-18:00",
        sat: "10:00-14:00",
        sun: null,
      },
      active: true,
    },
    {
      fullName: "Dr. Fatma Demir",
      specialization: "Pediatri",
      workingHours: {
        mon: "09:00-17:00",
        tue: "09:00-17:00",
        wed: "09:00-17:00",
        thu: "09:00-17:00",
        fri: "09:00-17:00",
        sat: "09:00-13:00",
        sun: null,
      },
      active: true,
    },
  ];

  const insertedDoctors: schema.Doctor[] = [];
  for (const doc of doctorData) {
    const [result] = await db.insert(schema.doctors).values(doc).returning();
    insertedDoctors.push(result);
  }
  console.log(`Inserted ${insertedDoctors.length} doctors`);

  // --- CLINIC SETTINGS ---
  await db.insert(schema.clinicSettings).values({
    clinicName: "Klinik AI",
    openingHour: "09:00",
    closingHour: "18:00",
    timezone: "Europe/Istanbul",
    emergencyMessage: "Acil durumda lütfen 112'yi arayın.",
  });
  console.log("Inserted clinic settings");

  // --- APPOINTMENTS ---
  const patientNames = [
    "Ahmet Yıldız",
    "Zeynep Arslan",
    "Mustafa Çelik",
    "Elif Şahin",
    "Hasan Koç",
    "Merve Aydın",
    "Ali Öztürk",
    "Selin Güneş",
    "Burak Kara",
    "Aylin Polat",
    "Cem Doğan",
    "Neslihan Yurt",
    "Serkan Boz",
    "Gülşen Akın",
    "Tolga Çınar",
  ];

  const statuses = ["onaylandi", "bekliyor", "iptal", "tamamlandi"];
  const sources = ["voice_agent", "web", "manual"];

  const appointmentTimes = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30"];

  const insertedAppointments: schema.Appointment[] = [];
  for (let i = 0; i < 15; i++) {
    const doctor = randomItem(insertedDoctors);
    const apptDate = randomDate(Math.floor(Math.random() * 14) - 3);
    const dateStr = apptDate.toISOString().split("T")[0];
    const timeStr = randomItem(appointmentTimes);
    const appointmentAt = new Date(`${dateStr}T${timeStr}:00`);

    const [record] = await db.insert(schema.appointments).values({
      patientName: patientNames[i],
      patientPhone: randomPhone(),
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      appointmentDate: dateStr,
      appointmentTime: timeStr,
      appointmentAt,
      status: randomItem(statuses),
      source: randomItem(sources),
      notes: i % 3 === 0 ? "İlk başvuru. Rutin kontrol." : null,
    }).returning();
    insertedAppointments.push(record);
  }
  console.log(`Inserted ${insertedAppointments.length} appointments`);

  // --- CALL LOGS ---
  const intents = ["randevu_alma", "randevu_iptal", "bilgi", "geri_arama", "diger"];
  const callStatuses = ["completed", "missed", "failed"];

  const transcriptSamples = [
    "Merhaba, Dr. Ayşe Kaya ile randevu almak istiyorum. Pazartesi günü saat 10:00 uygun mu? Evet, adım Ahmet Yıldız, telefon numaram 0532 123 4567.",
    "İyi günler, geçen hafta aldığım randevuyu iptal etmek istiyorum. Acil bir durum çıktı. Zeynep Arslan, 0541 987 6543.",
    "Merhaba, kliniğinizin çalışma saatleri nelerdir? Cumartesi günü açık mısınız? Kardiyoloji bölümü var mı?",
    "Dr. Mehmet Yılmaz ile randevumu Perşembe günü 14:00'e alabilir miyim? Randevu numaramı vermem gerekiyor mu?",
    "Merhaba, küçük oğlum için pediatri randevusu almak istiyorum. Dr. Fatma Demir müsait mi?",
    "Randevumu ertelemek istiyorum. Yeni tarih için Cuma günü öğleden sonra uygun olur. Selin Güneş, 0505 321 0987.",
    "Sigorta kapsamında muayene yaptırabilir miyim? Hangi sigortaları kabul ediyorsunuz?",
    "Merhaba, sabah 9'da randevum vardı ama gelemeyeceğim. İptal etmek istiyorum. Ali Öztürk arıyor.",
    "Dr. Ayşe Kaya'nın müsait olduğu en yakın tarih ne zaman? Tercihen bu hafta içinde.",
    "Geri arama talep etmek istiyorum. Biraz sonra müsait olabilirim. Numaram 0533 456 7890.",
  ];

  const summaries = [
    "Hasta Dr. Ayşe Kaya ile Pazartesi 10:00 randevusu talep etti. Randevu oluşturuldu.",
    "Hasta acil durum nedeniyle randevusunu iptal etti. Uygun. İptal işlemi tamamlandı.",
    "Hasta klinik çalışma saatleri ve kardiyoloji bölümü hakkında bilgi aldı.",
    "Hasta Dr. Mehmet Yılmaz ile Perşembe 14:00 randevusu oluşturuldu.",
    "Pediatri randevusu talebi. Dr. Fatma Demir için Salı 11:00 uygun bulundu.",
    "Mevcut randevu Cuma öğleden sonraya ertelendi. Güncelleme başarılı.",
    "Sigorta kapsamı hakkında bilgi verildi. Kurumsal anlaşmalar açıklandı.",
    "Sabah randevusu iptal edildi. Hasta uygun zamanda yeniden arayacak.",
    "Dr. Ayşe Kaya'nın en yakın müsait zamanı Çarşamba 09:30 olarak bildirildi.",
    "Geri arama talebi alındı. 30 dakika içinde aranacak.",
  ];

  const insertedCallLogs: schema.CallLog[] = [];
  for (let i = 0; i < 10; i++) {
    const duration = 60 + Math.floor(Math.random() * 240);
    const vapiCallId = `vapi_call_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 9)}`;
    const linkedAppointment = i < 5 ? insertedAppointments[i] : null;

    const [record] = await db.insert(schema.callLogs).values({
      callerNumber: randomPhone(),
      vapiCallId,
      transcript: transcriptSamples[i],
      summary: summaries[i],
      duration,
      intent: intents[i % intents.length],
      callStatus: i < 8 ? "completed" : randomItem(callStatuses),
      cost: (0.02 + Math.random() * 0.18).toFixed(6),
      appointmentId: linkedAppointment?.id ?? null,
      createdAt: randomDate(Math.floor(Math.random() * 7) - 3),
    }).returning();
    insertedCallLogs.push(record);
  }
  console.log(`Inserted ${insertedCallLogs.length} call logs`);

  // --- AI ACTIONS ---
  const actionTypes = ["check_availability", "create_appointment", "cancel", "reschedule", "doctor_info"];
  const actionPayloads = [
    { doctorName: "Dr. Ayşe Kaya", date: "2025-09-10", time: "10:00" },
    { patientName: "Ahmet Yıldız", phone: "+90 532 123 4567", doctorName: "Dr. Ayşe Kaya", date: "2025-09-10", time: "10:00" },
    { phone: "+90 541 987 6543", reason: "Acil durum" },
    { phone: "+90 505 321 0987", newDate: "2025-09-12", newTime: "14:00" },
    { specialization: "Kardiyoloji" },
  ];
  const actionResults = [
    "Pazartesi 10:00 müsait. 3 boş slot bulundu.",
    "Randevu başarıyla oluşturuldu. ID: appt_001",
    "Randevu başarıyla iptal edildi.",
    "Randevu Cuma 14:00'e taşındı.",
    "Dr. Mehmet Yılmaz, Kardiyoloji uzmanı. Pazartesi-Cuma 10:00-18:00 çalışıyor.",
  ];

  for (let i = 0; i < 5; i++) {
    await db.insert(schema.aiActions).values({
      actionType: actionTypes[i],
      payload: actionPayloads[i],
      result: actionResults[i],
      callLogId: insertedCallLogs[i]?.id ?? null,
    });
  }
  console.log("Inserted 5 AI actions");

  // --- CALLBACK REQUESTS ---
  const callbackData = [
    { patientName: "Burak Kara", phone: "+90 533 456 7890", reason: "Randevu hakkında bilgi almak istiyor", status: "bekliyor" },
    { patientName: "Aylin Polat", phone: "+90 542 111 2233", reason: "Sigorta kapsamı sorgusu", status: "tamamlandi" },
    { patientName: "Cem Doğan", phone: "+90 505 999 8877", reason: "Tahlil sonuçları hakkında görüşme", status: "bekliyor" },
    { patientName: null, phone: "+90 532 777 6655", reason: "Randevu iptali", status: "iptal" },
    { patientName: "Gülşen Akın", phone: "+90 541 333 4455", reason: "Doktor değişikliği talebi", status: "bekliyor" },
  ];

  for (const cb of callbackData) {
    await db.insert(schema.callbackRequests).values({
      patientName: cb.patientName,
      phone: cb.phone,
      reason: cb.reason,
      status: cb.status,
      completedAt: cb.status === "tamamlandi" ? new Date() : null,
    });
  }
  console.log("Inserted 5 callback requests");

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
