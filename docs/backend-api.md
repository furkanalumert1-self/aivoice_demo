# Backend API Referansı — Klinik AI Call Center

> Tüm Next.js 15 API route'larının istek/yanıt formatları, DB işlemleri, hata yönetimi ve test komutları.

---

## Genel Bilgiler

### `export const dynamic = "force-dynamic"` — Neden Gerekli?

Next.js 15, GET route'larını varsayılan olarak statik cache'e alır. `force-dynamic` bu cache'i devre dışı bırakır ve her istek canlı DB'den veri çeker.

```typescript
export const dynamic = "force-dynamic";
// Bu satır olmadan:
// - GET /api/appointments → ilk çağrıda cache'e alınır
// - Yeni randevu eklense de eski veri döner (Vercel edge cache)
// Bu satır ile:
// - Her GET isteği DB'ye gerçek sorgu atar
// - Admin dashboard her zaman güncel veri gösterir
```

**Ne zaman gerekli:** DB'den dinamik veri döndüren tüm route'larda.  
**Ne zaman gerekmez:** Statik veri döndüren route'larda (değişmeyen config, enum'lar vs).

### Lazy DB Bağlantısı (Proxy Pattern)

`db/index.ts` Proxy pattern kullanır:

```typescript
let _db: ReturnType<typeof getDb> | null = null;

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    if (!_db) _db = getDb();
    return (_db as any)[prop];
  },
});
```

**Neden bu pattern?**
1. **Build zamanı güvenliği:** `DATABASE_URL` olmadan build başarıyla tamamlanır. Değişken yokken `getDb()` çağrılmaz.
2. **Serverless uyumu:** Vercel Lambda her istekte fresh başlar. Proxy, ilk gerçek DB çağrısında bağlantıyı kurar.
3. **Hata izolasyonu:** `getDb()` içindeki hata (`DATABASE_URL is not set`) yalnızca DB'ye erişildiğinde fırlatılır, import sırasında değil.

### VAPI toolCallList Formatı

VAPI, function call'ı OpenAI-uyumlu format yerine kendi `toolCallList` formatında gönderir:

```json
{
  "message": {
    "toolCallList": [{
      "id": "call_abc123",
      "function": {
        "name": "book_appointment",
        "parameters": { "patientName": "...", "phone": "..." }
      }
    }]
  }
}
```

Route'lar bu formatı şöyle parse eder:
```typescript
const params = body?.message?.toolCallList?.[0]?.function?.parameters ?? body;
```
`?? body` kısmı: VAPI formatı gelmezse direkt body'yi kullanır (curl ile test için kullanışlı).

---

## POST /api/vapi/availability

**Amaç:** Belirtilen doktor ve tarih için müsait randevu slotlarını hesaplar.  
**Çağıran:** VAPI AI Assistant (`check_availability` function call)  
**DB İşlemi:** SELECT — appointments tablosundan dolu slotları sorgular

### Request Body
```json
{
  "message": {
    "toolCallList": [{
      "id": "call_avail_001",
      "function": {
        "name": "check_availability",
        "parameters": {
          "doctorName": "Dr. Ayşe Kaya",
          "date": "2025-09-11"
        }
      }
    }]
  }
}
```

### Response Body (Başarı)
```json
{
  "results": [{
    "toolCallId": "call_avail_001",
    "result": {
      "available": true,
      "slots": ["09:00", "09:30", "10:00", "11:00", "14:00", "15:30"],
      "date": "2025-09-11",
      "doctorName": "Dr. Ayşe Kaya"
    }
  }]
}
```

### Response Body (Tüm Slotlar Dolu)
```json
{
  "results": [{
    "toolCallId": "call_avail_001",
    "result": {
      "available": false,
      "slots": [],
      "date": "2025-09-11",
      "doctorName": "Dr. Ayşe Kaya"
    }
  }]
}
```

### Hata Yanıtı (Tarih Eksik)
```json
// HTTP 400
{ "error": "Tarih gerekli" }
```

### Slot Hesaplama Mantığı
```typescript
// 09:00–17:30 arası 30 dakikalık slotlar (18 slot toplam)
for (let h = 9; h < 18; h++) {
  for (let m = 0; m < 60; m += 30) {
    // Eğer bu saat dolu değilse ekle
  }
}
// İlk 6 müsait slot döndürülür
```

### curl Test
```bash
curl -X POST http://localhost:3000/api/vapi/availability \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "toolCallList": [{
        "id": "test_001",
        "function": {
          "name": "check_availability",
          "parameters": {
            "doctorName": "Dr. Ayşe Kaya",
            "date": "2025-09-11"
          }
        }
      }]
    }
  }'
```

**Kısa format (params direkt body olarak):**
```bash
curl -X POST http://localhost:3000/api/vapi/availability \
  -H "Content-Type: application/json" \
  -d '{"doctorName": "Dr. Test", "date": "2025-09-11"}'
```

---

## POST /api/vapi/book

**Amaç:** Yeni randevu oluşturur, n8n webhook'unu tetikler.  
**Çağıran:** VAPI AI Assistant (`book_appointment` function call)  
**DB İşlemi:** INSERT INTO appointments ... RETURNING *

### Request Body
```json
{
  "message": {
    "toolCallList": [{
      "id": "call_book_001",
      "function": {
        "name": "book_appointment",
        "parameters": {
          "patientName": "Ahmet Yılmaz",
          "phone": "05301234567",
          "doctorName": "Dr. Ayşe Kaya",
          "date": "2025-09-11",
          "time": "10:00"
        }
      }
    }]
  }
}
```

### Response Body (Başarı)
```json
{
  "results": [{
    "toolCallId": "call_book_001",
    "result": {
      "success": true,
      "appointmentId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "message": "Randevunuz 2025-09-11 tarihinde saat 10:00 için Dr. Ayşe Kaya ile oluşturuldu.",
      "appointment": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "patientName": "Ahmet Yılmaz",
        "phone": "05301234567",
        "doctorName": "Dr. Ayşe Kaya",
        "appointmentAt": "2025-09-11T10:00:00.000Z",
        "status": "onaylandi",
        "source": "voice_agent",
        "createdAt": "2025-09-11T07:15:32.000Z"
      }
    }
  }]
}
```

### Hata Yanıtı (Eksik Alan)
```json
// HTTP 400
{ "error": "Hasta adı, telefon, tarih ve saat gerekli" }
```

### DB INSERT Detayı
```sql
INSERT INTO appointments (
  patient_name, phone, doctor_name, appointment_at, status, source
) VALUES (
  'Ahmet Yılmaz', '05301234567', 'Dr. Ayşe Kaya',
  '2025-09-11T10:00:00', 'onaylandi', 'voice_agent'
) RETURNING *;
```

### n8n Trigger
```typescript
// Async — hata olsa da ana akış devam eder
await fetch(`${n8nWebhookUrl}/appointment-created`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(newAppointment),
});
```

### curl Test
```bash
curl -X POST http://localhost:3000/api/vapi/book \
  -H "Content-Type: application/json" \
  -d '{
    "patientName": "Test Hasta",
    "phone": "05001234567",
    "doctorName": "Dr. Test Doktor",
    "date": "2025-09-15",
    "time": "14:00"
  }'
```

---

## POST /api/vapi/cancel

**Amaç:** Randevuyu `iptal` statüsüne günceller.  
**Çağıran:** VAPI AI Assistant (`cancel_appointment` function call)  
**DB İşlemi:** UPDATE appointments SET status = 'iptal' WHERE id = ... OR phone = ...

### Request Body (ID ile)
```json
{
  "message": {
    "toolCallList": [{
      "id": "call_cancel_001",
      "function": {
        "name": "cancel_appointment",
        "parameters": {
          "appointmentId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "reason": "Hasta seyahate çıkıyor"
        }
      }
    }]
  }
}
```

### Request Body (Telefon ile)
```json
{
  "message": {
    "toolCallList": [{
      "id": "call_cancel_002",
      "function": {
        "name": "cancel_appointment",
        "parameters": {
          "phone": "05301234567",
          "reason": "İptal sebebi belirtilmedi"
        }
      }
    }]
  }
}
```

### Response Body (Başarı)
```json
{
  "results": [{
    "toolCallId": "call_cancel_001",
    "result": {
      "success": true,
      "message": "Randevunuz başarıyla iptal edildi.",
      "appointment": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "patientName": "Ahmet Yılmaz",
        "status": "iptal"
      }
    }
  }]
}
```

### Response Body (Randevu Bulunamadı)
```json
{
  "results": [{
    "toolCallId": "call_cancel_001",
    "result": {
      "success": false,
      "message": "Randevu bulunamadı."
    }
  }]
}
```

### Önemli Davranış
- `appointmentId` verilirse ID ile arar
- `phone` verilirse telefon numarasıyla arar (en son randevuyu günceller)
- Her ikisi de yoksa HTTP 400
- Randevu yoksa success: false ama HTTP 200 (VAPI bunu kullanıcıya söyler)

### n8n Trigger
```typescript
await fetch(`${n8nWebhookUrl}/appointment-cancelled`, {
  method: "POST",
  body: JSON.stringify({ ...cancelled, reason }),
});
```

### curl Test
```bash
curl -X POST http://localhost:3000/api/vapi/cancel \
  -H "Content-Type: application/json" \
  -d '{"phone": "05001234567", "reason": "Test iptal"}'
```

---

## POST /api/vapi/reschedule

**Amaç:** Mevcut randevuyu yeni tarih/saate taşır.  
**Çağıran:** VAPI AI Assistant (`reschedule_appointment` function call)  
**DB İşlemi:** UPDATE appointments SET appointment_at, status = 'onaylandi' WHERE ...

### Request Body
```json
{
  "message": {
    "toolCallList": [{
      "id": "call_reschedule_001",
      "function": {
        "name": "reschedule_appointment",
        "parameters": {
          "phone": "05301234567",
          "newDate": "2025-09-15",
          "newTime": "14:30",
          "doctorName": "Dr. Mehmet Yıldız"
        }
      }
    }]
  }
}
```

### Response Body (Başarı)
```json
{
  "results": [{
    "toolCallId": "call_reschedule_001",
    "result": {
      "success": true,
      "message": "Randevunuz 2025-09-15 tarihinde saat 14:30 için yeniden planlandı.",
      "appointment": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "patientName": "Ahmet Yılmaz",
        "appointmentAt": "2025-09-15T14:30:00.000Z",
        "status": "onaylandi",
        "doctorName": "Dr. Mehmet Yıldız"
      }
    }
  }]
}
```

### Tarih/Saat Parse Mantığı
```typescript
const [datePart] = newDate.split("T"); // "2025-09-15T..." → "2025-09-15"
const newAppointmentAt = new Date(`${datePart}T${newTime}:00`);
// → new Date("2025-09-15T14:30:00")
```

### curl Test
```bash
curl -X POST http://localhost:3000/api/vapi/reschedule \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "05001234567",
    "newDate": "2025-09-15",
    "newTime": "14:30"
  }'
```

---

## POST /api/vapi/call-ended

**Amaç:** VAPI çağrı sonu webhook'u. Çağrı kaydı ve bildirim oluşturur.  
**Çağıran:** VAPI AI (Server URL webhook — otomatik)  
**DB İşlemi:** INSERT calls, INSERT notifications

### Request Body (VAPI end-of-call-report)
```json
{
  "type": "end-of-call-report",
  "call": {
    "id": "call_xYz123abc",
    "customer": {
      "number": "+905301234567"
    },
    "startedAt": "2025-09-11T10:00:00.000Z",
    "endedAt": "2025-09-11T10:03:45.000Z",
    "cost": 0.0234,
    "artifact": {
      "transcript": "AI: Merhaba!\nKullanıcı: Randevu almak istiyorum...",
      "recordingUrl": "https://storage.vapi.ai/recordings/call_xYz123abc.mp3"
    },
    "analysis": {
      "summary": "Hasta randevu aldı."
    }
  }
}
```

### Response Body (Başarı)
```json
{
  "success": true,
  "callId": "new-call-uuid-here"
}
```

### Response Body (Non-report Event)
```json
// HTTP 200 — işlem yapılmaz
{ "received": true }
```

### Outcome Tespiti (Transcript Analizi)
```typescript
let outcome = "bilgi_verildi"; // default
if (transcript) {
  const lower = transcript.toLowerCase();
  if (lower.includes("randevu") && (lower.includes("aldım") || lower.includes("oluşturuldu"))) {
    outcome = "randevu_alindi";
  } else if (lower.includes("iptal")) {
    outcome = "iptal_edildi";
  } else if (lower.includes("geri ara") || lower.includes("tekrar ara")) {
    outcome = "geri_arama";
  } else if (lower.includes("cevap yok") || lower.includes("meşgul")) {
    outcome = "cevap_yok";
  }
}
```

### Süre Hesaplama
```typescript
function calculateDuration(startedAt?: string, endedAt?: string): number | null {
  if (!startedAt || !endedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  return Math.round((end - start) / 1000); // saniye cinsinden
}
```

### curl Test
```bash
curl -X POST http://localhost:3000/api/vapi/call-ended \
  -H "Content-Type: application/json" \
  -d '{
    "type": "end-of-call-report",
    "call": {
      "id": "test_call_001",
      "customer": {"number": "+905301234567"},
      "startedAt": "2025-09-11T10:00:00Z",
      "endedAt": "2025-09-11T10:03:00Z",
      "cost": 0.015,
      "artifact": {
        "transcript": "AI: Merhaba!\nKullanıcı: Randevu aldım teşekkürler.",
        "recordingUrl": null
      },
      "analysis": {"summary": "Test çağrısı özeti"}
    }
  }'
```

---

## GET /api/appointments

**Amaç:** Tüm randevuları listeler (admin dashboard).  
**Çağıran:** Admin Dashboard Server Component ve client fetch'leri  
**DB İşlemi:** SELECT * FROM appointments ORDER BY created_at DESC

### Request
```http
GET /api/appointments HTTP/1.1
```

### Response Body (Başarı)
```json
[
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "patientName": "Ahmet Yılmaz",
    "phone": "05301234567",
    "doctorName": "Dr. Ayşe Kaya",
    "appointmentAt": "2025-09-11T10:00:00.000Z",
    "status": "onaylandi",
    "source": "voice_agent",
    "createdAt": "2025-09-11T07:15:32.000Z"
  }
]
```

### Response Body (DB Hatası)
```json
// HTTP 200 — boş array (UI gracefully render eder)
[]
```

**Not:** Hata durumunda 500 yerine boş array ve 200 döner. Bu sayede admin dashboard `[]` alır ve "Henüz randevu yok" mesajı gösterir; crash olmaz.

### curl Test
```bash
curl http://localhost:3000/api/appointments
```

---

## POST /api/appointments

**Amaç:** Web formu veya admin üzerinden randevu oluşturur.  
**Çağıran:** Admin UI, dış entegrasyonlar  
**DB İşlemi:** INSERT INTO appointments

### Request Body
```json
{
  "patientName": "Fatma Demir",
  "phone": "05421234567",
  "doctorName": "Dr. Mehmet Yıldız",
  "appointmentAt": "2025-09-12T14:00:00.000Z",
  "status": "onaylandi",
  "source": "web"
}
```

### Response Body (Başarı — HTTP 201)
```json
{
  "id": "new-uuid-here",
  "patientName": "Fatma Demir",
  "phone": "05421234567",
  "doctorName": "Dr. Mehmet Yıldız",
  "appointmentAt": "2025-09-12T14:00:00.000Z",
  "status": "onaylandi",
  "source": "web",
  "createdAt": "2025-09-11T08:00:00.000Z"
}
```

### Hata Yanıtı (Eksik Alan)
```json
// HTTP 400
{ "error": "Hasta adı, telefon ve randevu tarihi gerekli" }
```

### Varsayılan Değerler
- `status` belirtilmezse → `"onaylandi"`
- `source` belirtilmezse → `"web"`
- `doctorName` belirtilmezse → `"Belirtilmedi"`

### curl Test
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientName": "Test Hasta",
    "phone": "05551234567",
    "doctorName": "Dr. Test",
    "appointmentAt": "2025-09-20T10:00:00.000Z"
  }'
```

---

## GET /api/calls

**Amaç:** Tüm çağrı kayıtlarını listeler.  
**Çağıran:** Admin Dashboard `/admin/calls` sayfası  
**DB İşlemi:** SELECT * FROM calls ORDER BY created_at DESC

### Response Body
```json
[
  {
    "id": "call-uuid-001",
    "callerPhone": "+905301234567",
    "durationSeconds": 225,
    "transcript": "AI: Merhaba!...",
    "summary": "Hasta randevu aldı.",
    "cost": "0.023400",
    "outcome": "randevu_alindi",
    "appointmentId": null,
    "recordingUrl": "https://storage.vapi.ai/recordings/...",
    "createdAt": "2025-09-11T07:20:00.000Z"
  }
]
```

**Not:** DB hatası durumunda boş array döner (crash önleme).

### curl Test
```bash
curl http://localhost:3000/api/calls
```

---

## Hata Yönetimi Genel Stratejisi

### VAPI Route'ları
```typescript
try {
  // İşlem yap
  return NextResponse.json({ results: [...] });
} catch (error) {
  console.error("Route error:", error);
  return NextResponse.json({ error: "İşlem başarısız" }, { status: 500 });
}
```

### Admin Route'ları (GET)
```typescript
try {
  const records = await db.select()...
  return NextResponse.json(records);
} catch (error) {
  // Graceful degradation — boş array döner, UI crash olmaz
  return NextResponse.json([], { status: 200 });
}
```

### n8n Webhook Hata İzolasyonu
```typescript
// Ana akış n8n başarısına bağlı değil
if (n8nWebhookUrl) {
  try {
    await fetch(`${n8nWebhookUrl}/...`, { ... });
  } catch (webhookError) {
    console.error("n8n webhook failed:", webhookError);
    // Hata fırlatılmaz — sadece log
  }
}
```

---

## Tüm Route'lar Özet Tablosu

| Route | Method | Çağıran | DB | n8n |
|-------|--------|---------|-----|-----|
| `/api/vapi/availability` | POST | VAPI | SELECT | Yok |
| `/api/vapi/book` | POST | VAPI | INSERT | `/appointment-created` |
| `/api/vapi/cancel` | POST | VAPI | UPDATE | `/appointment-cancelled` |
| `/api/vapi/reschedule` | POST | VAPI | UPDATE | Yok |
| `/api/vapi/call-ended` | POST | VAPI (webhook) | INSERT ×2 | `/call-summary` |
| `/api/appointments` | GET | Admin UI | SELECT | Yok |
| `/api/appointments` | POST | Admin/Web | INSERT | Yok |
| `/api/calls` | GET | Admin UI | SELECT | Yok |
