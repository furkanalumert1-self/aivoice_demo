import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const doctors = [
  "Dr. Ayşe Kaya",
  "Dr. Mehmet Yılmaz",
  "Dr. Fatma Demir",
];

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

const statuses = ["onaylandi", "bekleniyor", "iptal", "tamamlandi"];
const sources = ["voice_agent", "web", "phone"];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysOffset: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 4) * 15, 0, 0);
  return date;
}

async function seed() {
  console.log("Seeding database...");

  // Insert appointments
  const appointmentRecords = [];
  for (let i = 0; i < 15; i++) {
    const record = await db.insert(schema.appointments).values({
      patientName: patientNames[i],
      phone: `+90 5${Math.floor(Math.random() * 100).toString().padStart(2, "0")} ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 9000 + 1000)}`,
      doctorName: randomItem(doctors),
      appointmentAt: randomDate(Math.floor(Math.random() * 14) - 3),
      status: randomItem(statuses),
      source: randomItem(sources),
    }).returning();
    appointmentRecords.push(record[0]);
  }
  console.log(`Inserted ${appointmentRecords.length} appointments`);

  // Insert calls
  const outcomes = ["randevu_alindi", "bilgi_verildi", "iptal_edildi", "geri_arama", "cevap_yok"];
  const transcripts = [
    "Merhaba, randevu almak istiyorum. Hangi günler müsait? Pazartesi günü Dr. Ayşe Kaya ile görüşmek istiyorum.",
    "İyi günler, dün yaptığım randevuyu iptal etmek istiyorum. Acil bir durum çıktı.",
    "Merhaba, kliniğinizin çalışma saatleri nelerdir? Hafta sonu da açık mısınız?",
    "Randevumu yarına ertelemek istiyorum. Dr. Mehmet Yılmaz ile görüşecektim.",
    "Merhaba, oğlum için pediatri randevusu almak istiyorum.",
  ];

  for (let i = 0; i < 10; i++) {
    const duration = 60 + Math.floor(Math.random() * 240);
    await db.insert(schema.calls).values({
      callerPhone: `+90 5${Math.floor(Math.random() * 100).toString().padStart(2, "0")} ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 9000 + 1000)}`,
      durationSeconds: duration,
      transcript: transcripts[i % transcripts.length],
      summary: `Arama özeti: Hasta ${outcomes[i % outcomes.length].replace("_", " ")} konusunda bilgi aldı. Görüşme ${Math.round(duration / 60)} dakika sürdü.`,
      cost: (0.02 + Math.random() * 0.18).toFixed(4),
      outcome: outcomes[i % outcomes.length],
      appointmentId: i < 5 ? appointmentRecords[i]?.id : null,
      createdAt: randomDate(Math.floor(Math.random() * 7) - 3),
    });
  }
  console.log("Inserted 10 calls");

  // Insert notifications
  const notificationData = [
    { title: "Yeni Randevu Alındı", description: "Ahmet Yıldız, Dr. Ayşe Kaya ile Pazartesi 10:00 için randevu aldı." },
    { title: "Randevu İptal Edildi", description: "Zeynep Arslan'ın Salı 14:00 randevusu iptal edildi." },
    { title: "Yüksek Çağrı Hacmi", description: "Bu saat bugün normalden %40 daha fazla çağrı var." },
    { title: "Sistem Güncellemesi", description: "AI asistan modeli güncellendi. Yeni özellikler aktif." },
    { title: "Randevu Hatırlatıcısı", description: "Yarın 8 randevu bulunmakta. Otomatik hatırlatıcılar gönderildi." },
  ];

  for (const notif of notificationData) {
    await db.insert(schema.notifications).values({
      title: notif.title,
      description: notif.description,
      isRead: Math.random() > 0.5,
    });
  }
  console.log("Inserted 5 notifications");

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
