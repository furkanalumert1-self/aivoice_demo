# Sistem Mimarisi — Klinik AI Call Center

> Kıdemli mühendis seviyesinde teknik referans dökümanı.  
> Tüm bileşenlerin rolü, veri formatı, senkronizasyon modeli ve üretim topolojisi açıklanmıştır.

---

## 1. Genel Sistem Mimarisi

### 1.1 End-to-End Akış Diyagramı

```
┌─────────────────────────────────────────────────────────────────┐
│                     HASTA (Telefon / SIP)                       │
│              Türkçe konuşma — PSTN veya VoIP                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Ses akışı (WebRTC / SIP)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              VAPI AI ASSISTANT (Cloud — vapi.ai)                │
│  • STT: Deepgram (Türkçe tanıma)                               │
│  • LLM: GPT-4o (OpenAI) — diyalog yönetimi                    │
│  • TTS: ElevenLabs (Türkçe sesli yanıt)                        │
│  • Function Calling: GPT-4o'nun araç çağrıları                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP POST — JSON (Function Call)
                            │ Senkron / < 5 saniye bekleniyor
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           NEXT.JS 15 API ROUTES (Vercel Edge/Serverless)        │
│  • /api/vapi/availability  — müsaitlik sorgulama               │
│  • /api/vapi/book          — randevu oluşturma                 │
│  • /api/vapi/cancel        — randevu iptal                     │
│  • /api/vapi/reschedule    — randevu öteleme                   │
│  • /api/vapi/call-ended    — çağrı sonu raporu (webhook)       │
│  • /api/appointments       — CRUD (admin/web)                  │
│  • /api/calls              — çağrı listesi (admin/web)         │
└──────────┬──────────────────────────────┬───────────────────────┘
           │ SQL INSERT/SELECT            │ HTTP POST (async fire-and-forget)
           │ Drizzle ORM + neon()         │ JSON payload
           ▼                             ▼
┌───────────────────────┐   ┌────────────────────────────────────┐
│  NEON POSTGRESQL      │   │  n8n WORKFLOW ENGINE (Cloud)       │
│  (Serverless — AWS)   │   │  • appointment-created workflow    │
│  • appointments       │   │  • call-summary workflow           │
│  • calls              │   │  • appointment-cancelled workflow  │
│  • notifications      │   │  • appointment-reminder workflow   │
│                       │   │                                    │
│  SOURCE OF TRUTH      │   │  İç Olay Sistemi (DB)              │
└───────────────────────┘   │  GPT-4o özet oluşturma             │
           ▲                └────────────────────────────────────┘
           │ SQL READ                          │ (async, eventual consistency)
           │                                   │
┌──────────┴───────────────────────────────────▼──────────────────┐
│              ADMIN DASHBOARD (Next.js 15 SSR)                   │
│  • /admin          — dashboard (istatistikler)                  │
│  • /admin/appointments — randevu listesi                        │
│  • /admin/calls    — çağrı kayıtları                           │
│  • /admin/call-list — arama listesi                            │
│  • /admin/monitoring — workflow execution takibi               │
│  • /admin/analytics — çağrı analitiği                         │
│  • /admin/health   — sistem sağlığı                           │
│  • /admin/audit    — sistem olayları & audit                  │
│  Server Component: doğrudan DB'den okur, cache yok             │
└─────────────────────────────────────────────────────────────────┘
```

---

### 1.2 Her Bileşenin Rolü

#### VAPI AI Assistant (vapi.ai Cloud)
- **Rolü:** Telefon kanalında hastayla doğal dil diyaloğu kurar.
- **Veri Alır:** Hasta sesini (WebRTC/SIP üzerinden). API route'lardan Function Call yanıtı (JSON).
- **Veri Gönderir:** Function Call HTTP POST istekleri (`/api/vapi/*`). Çağrı sonunda `/api/vapi/call-ended` webhook.
- **Senkronizasyon:** Function call'lar **senkron** — VAPI cevabı bekler (timeout ~5–10 sn). Webhook **asenkron** fire-and-forget.
- **Veri Formatı:** JSON (OpenAI function call schema uyumlu `toolCallList` formatı).

#### Next.js 15 API Routes (Vercel)
- **Rolü:** VAPI ile veritabanı arasındaki iş mantığı katmanı. İstek doğrulama, SQL koordinasyonu, n8n tetikleme.
- **Veri Alır:** VAPI'den JSON POST istekleri. Admin UI'dan REST istekleri.
- **Veri Gönderir:** Drizzle ORM üzerinden Neon'a SQL. n8n'e HTTP POST (async, try/catch ile izole).
- **Senkronizasyon:** Fonksiyon içi işlemler **senkron** (await zinciri). n8n tetiklemesi **asenkron** (hata olsa da ana akış devam eder).
- **Veri Formatı:** HTTP JSON — request body ve response body.

#### Neon PostgreSQL (Source of Truth)
- **Rolü:** Tüm sistemin kalıcı veri deposu. Randevular, çağrılar ve bildirimler buradadır.
- **Veri Alır:** Next.js API Routes'dan INSERT/UPDATE SQL.
- **Veri Gönderir:** SELECT sorgusu sonuçlarını API Routes'a ve n8n'e döndürür.
- **Senkronizasyon:** ACID işlemleri — her yazma senkron commit.
- **Neden Source of Truth:** Her şeyin referans noktası burasıdır. VAPI'nin söyledikleri, n8n'nin gönderdiği bildirimler — hepsi DB'deki kayda dayanır.
- **Veri Formatı:** SQL (Drizzle ORM parametreli sorgular, injection riski yok).

#### n8n Workflow Engine (n8n.cloud)
- **Rolü:** Asenkron iş süreçleri — iç olay kaydı, bildirim oluşturma, AI özet üretme, hatırlatıcı.
- **Veri Alır:** Next.js API Routes'dan webhook POST (randevu oluşturuldu, çağrı bitti, iptal).
- **Veri Gönderir:** Neon'a doğrudan PostgreSQL yazması (notifications, system_events tabloları). Admin dashboard'a HTTP POST.
- **Senkronizasyon:** **Asenkron** — Next.js isteği ateşler ve beklemez. n8n kendi iç akışında çalışır.
- **Veri Formatı:** JSON (webhook payload), SQL (Neon node'u).
- **NOT:** Tüm dış bildirimler (WhatsApp, SMS, e-posta) devre dışıdır. Tüm olaylar DB'ye yazılır.

#### Admin Dashboard (Next.js SSR)
- **Rolü:** Klinik personelinin randevuları ve çağrıları görmesi için React UI.
- **Veri Alır:** Doğrudan Neon'dan (Server Component içinde `db.select()`). Cache yok (`force-dynamic`).
- **Senkronizasyon:** Her sayfa yenilemesinde gerçek zamanlı DB okuma.
- **Veri Formatı:** Server Component → HTML render. İç veri Drizzle ORM TypeScript nesneleri.

---

## 2. Veri Akışı — End-to-End Senaryo

### Senaryo: "Hasta Dr. Ayşe ile randevu almak istiyor"

```
Hasta: "Dr. Ayşe Kaya ile yarın sabah randevu almak istiyorum."
```

**Adım 1 — Ses Tespiti (VAPI STT)**
```
VAPI → Deepgram STT engine
Türkçe ses → metin: "Dr. Ayşe Kaya ile yarın sabah randevu almak istiyorum"
Gecikme: ~300-500ms
```

**Adım 2 — GPT-4o Diyalog Yönetimi**
```
GPT-4o sistem promptu okur:
"Sen Klinik AI asistanısın. Randevu alma, iptal, sorgulama yapabilirsin."

GPT-4o kararı: önce müsaitlik kontrol et → check_availability çağır
```

**Adım 3 — Function Call Hazırlama**
```json
{
  "tool_calls": [{
    "id": "call_xYz123",
    "type": "function",
    "function": {
      "name": "check_availability",
      "arguments": "{\"doctorName\":\"Dr. Ayşe Kaya\",\"date\":\"2025-09-11\"}"
    }
  }]
}
```

**Adım 4 — VAPI → Next.js HTTP POST**
```
POST https://aivoice-demo.vercel.app/api/vapi/availability
Content-Type: application/json

{
  "message": {
    "toolCallList": [{
      "id": "call_xYz123",
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

**Adım 5 — Next.js Neon'a SQL SELECT**
```sql
SELECT appointment_at FROM appointments
WHERE appointment_at >= '2025-09-11 00:00:00'
  AND appointment_at <= '2025-09-11 23:59:59'
  AND doctor_name = 'Dr. Ayşe Kaya'
  AND status = 'onaylandi'
```
Gecikme: Neon serverless cold start ~200ms, warm ~20ms.

**Adım 6 — Müsait Slotların Hesaplanması**
```
09:00–17:30 arası 30'ar dakikalık slotlar hesaplanır.
Dolu olanlar çıkarılır. İlk 6 müsait slot döndürülür.
Örnek: ["09:00", "09:30", "10:00", "11:00", "14:00", "15:30"]
```

**Adım 7 — Next.js → VAPI Yanıtı**
```json
{
  "results": [{
    "toolCallId": "call_xYz123",
    "result": {
      "available": true,
      "slots": ["09:00", "09:30", "10:00", "11:00", "14:00", "15:30"],
      "date": "2025-09-11",
      "doctorName": "Dr. Ayşe Kaya"
    }
  }]
}
```

**Adım 8 — VAPI TTS ile Hastaya Bilgi**
```
ElevenLabs TTS → Türkçe ses sentezi:
"Dr. Ayşe Kaya için 11 Eylül'de sabah 09:00, 09:30 veya 10:00 
saatlerinde müsaitlik var. Hangi saati tercih edersiniz?"
Gecikme: ~400ms TTS sentezi
```

**Adım 9 — Hasta Saati Seçer**
```
Hasta: "10:00 olsun."
GPT-4o: book_appointment çağırma kararı verir.
```

**Adım 10 — book_appointment Function Call**
```
POST https://aivoice-demo.vercel.app/api/vapi/book

Parametreler: patientName, phone, doctorName, date, time
```

**Adım 11 — Neon'a INSERT**
```sql
INSERT INTO appointments 
  (id, patient_name, phone, doctor_name, appointment_at, status, source, created_at)
VALUES 
  (gen_random_uuid(), 'Ahmet Yılmaz', '05301234567', 
   'Dr. Ayşe Kaya', '2025-09-11 10:00:00', 'onaylandi', 'voice_agent', now())
RETURNING *;
```

**Adım 12 — n8n Webhook Tetikleme (Asenkron)**
```
POST ${N8N_WEBHOOK_URL}/appointment-created
Body: yeni oluşturulan randevu nesnesi (JSON)

Bu çağrı try/catch ile izole — hata olsa da ana akış durmuyor.
```

**Adım 13 — Next.js → VAPI Başarı Yanıtı**
```json
{
  "results": [{
    "toolCallId": "call_abc456",
    "result": {
      "success": true,
      "appointmentId": "uuid-here",
      "message": "Randevunuz 2025-09-11 tarihinde saat 10:00 için Dr. Ayşe Kaya ile oluşturuldu."
    }
  }]
}
```

**Adım 14 — VAPI Hastaya Onay Mesajı**
```
ElevenLabs TTS:
"Randevunuz 11 Eylül 2025 saat 10:00 için Dr. Ayşe Kaya ile 
oluşturuldu. İyi günler dilerim!"
```

**Adım 15 — Çağrı Sona Erer**
```
VAPI çağrıyı kapatır.
POST /api/vapi/call-ended çağrısı gönderilir:
- transcript (tam konuşma metni)
- duration, cost, recordingUrl
- analysis.summary (VAPI'nin kendi özeti)
```

**Adım 16 — Çağrı Kaydı ve Bildirim**
```sql
INSERT INTO calls (caller_phone, duration_seconds, transcript, summary, cost, outcome, recording_url)
VALUES (...)

INSERT INTO notifications (title, description, is_read)
VALUES ('Yeni Çağrı Tamamlandı', '05301234567 araması tamamlandı. Süre: 3 dk', false)
```

**Adım 17 — n8n call-summary Workflow**
```
POST ${N8N_WEBHOOK_URL}/call-summary
→ GPT-4o-mini transkripti özetler
→ Neon'a calls tablosuna summary güncellenir
→ Bildirim oluşturulur
```

**Adım 18 — Admin Dashboard'da Görüntüleme**
```
Admin /admin/calls sayfasını açtığında:
Server Component → db.select().from(calls) → en güncel veri
Cache yok (force-dynamic) → her seferinde fresh data
```

---

## 3. Sistem Rolleri Tablosu

| Sistem | Rol | Sync/Async | Veri Formatı | Tetikler | Dinlediği |
|--------|-----|-----------|--------------|----------|-----------|
| **VAPI** | Sesli AI arayüzü | Her ikisi | JSON (tool calls), WebRTC | API route'lar, TTS | Hasta sesi, API yanıtları |
| **Next.js API** | İş mantığı katmanı | Senkron (iç), Async (n8n) | HTTP JSON | n8n webhook, Neon INSERT | VAPI POST, Admin REST |
| **Neon PostgreSQL** | Kalıcı veri deposu (Source of Truth) | Senkron (ACID) | SQL | - | API route SQL |
| **n8n** | Asenkron iş akışları | Asenkron | JSON, SQL, HTTP | İç Olay Sistemi (DB), Bildirim | Next.js webhook POST |
| **Admin Dashboard** | Yönetim UI | Senkron (SSR) | HTML (SSR), DB query | - | Neon SELECT |
| **ElevenLabs** | Türkçe TTS | Senkron | Audio stream | - | VAPI TTS komutu |
| **GPT-4o** | LLM (VAPI içinde) | Senkron | JSON (messages/tools) | Function calls | Konuşma geçmişi |

---

## 4. Production Topolojisi

### 4.1 Neden Her Bileşen Cloud'da?

**Vercel (Next.js)**
- Serverless function'lar: her API isteği izole bir Lambda çalıştırır.
- Cold start: ~200–500ms (Edge Runtime seçilirse ~50ms).
- Auto-scaling: eş zamanlı 1000+ istek için ölçeklenir.
- GitHub entegrasyonu: her push'ta otomatik deploy.
- `force-dynamic` direktifi: Vercel edge cache'ini devre dışı bırakır, her istek canlı DB'den veri alır.

**Neon PostgreSQL**
- Serverless PostgreSQL: connection pool yönetimi otomatik.
- `@neondatabase/serverless` paketi: HTTP üzerinden SQL çalıştırır (WebSocket alternatif de var).
- Neden serverless PG: Vercel Lambda'ları kısa ömürlüdür — geleneksel TCP connection pool dolar. HTTP-based Neon bu sorunu çözer.
- db/index.ts'deki Proxy pattern: modül import sırasında değil, ilk DB çağrısında bağlantı oluşturur. Bu, build sırasında `DATABASE_URL` olmasa da crash olmasını önler.

**VAPI Cloud**
- Telefon altyapısı (PSTN, SIP), STT, LLM, TTS entegrasyonları hazır.
- Vendor lock-in bilinçli karar: bu ölçekte kendi telefon altyapısı kurmak maliyet açısından dezavantajlı.
- VAPI → Next.js latency: ~50–100ms (her ikisi de CDN edge'de).

**n8n Cloud**
- Self-host alternatifi: Docker ile kendi sunucuda çalıştırılabilir (bkz. LOCAL_DEVELOPMENT.md).
- Cloud tercih sebebi: yönetim yükü yok, SSL, HA, güncellemeler otomatik.
- Webhook URL'leri: production'da kalıcı, test URL'lerinden farklı.

### 4.2 Latency Analizi

```
Hasta konuşur → VAPI STT tanır          : ~300–600ms
GPT-4o diyalog işler                    : ~500–1500ms
VAPI → Next.js function call            : ~50–100ms (TLS+HTTP)
Next.js → Neon SQL (warm)               : ~20–50ms
Next.js → Neon SQL (cold start)         : ~200–500ms
Next.js → VAPI yanıt                    : ~5–20ms (JSON serialize)
VAPI TTS (ElevenLabs)                   : ~300–600ms
─────────────────────────────────────────────────────
Toplam (kullanıcının beklediği süre)    : ~1.5–3.5 saniye
```

Kritik nokta: VAPI function call timeout'u varsayılan 10 saniyedir. Neon cold start dahil tüm işlem bu sürede bitmelidir. Performans sorunu yaşanırsa `/api/vapi/*` route'larına `runtime = "edge"` eklemek düşünülebilir.

### 4.3 Güvenlik Sınırları

```
[Public Internet]
    │
    ├─ VAPI Cloud ──────────→ Vercel (HTTPS only)
    │                         Header: Authorization: Bearer {VAPI_API_KEY}
    │
    ├─ n8n Cloud ───────────→ Vercel (HTTPS only)  
    │                         Opsiyonel: Webhook secret token
    │
    └─ Admin Tarayıcı ──────→ Vercel (Clerk JWT doğrulama)

[Vercel Functions] ─────────→ Neon (HTTPS + SSL required)
                               CONNECTION_STRING: ?sslmode=require
```

---

## 5. Veritabanı Şeması Özeti

```
appointments
├── id: uuid (PK, auto-generated)
├── patient_name: text
├── phone: text
├── doctor_name: text
├── appointment_at: timestamp
├── status: text ('onaylandi' | 'bekleniyor' | 'iptal' | 'tamamlandi')
├── source: text ('voice_agent' | 'web' | 'phone')
└── created_at: timestamp (auto-now)

calls
├── id: uuid (PK, auto-generated)
├── caller_phone: text
├── duration_seconds: integer
├── transcript: text (tam konuşma metni)
├── summary: text (AI özet)
├── cost: numeric (VAPI maliyeti, USD)
├── outcome: text ('randevu_alindi' | 'bilgi_verildi' | 'iptal_edildi' | 'geri_arama' | 'cevap_yok')
├── appointment_id: uuid (foreign key — henüz constraint yok)
├── recording_url: text
└── created_at: timestamp

notifications
├── id: uuid (PK, auto-generated)
├── title: text
├── description: text
├── is_read: boolean (default: false)
└── created_at: timestamp
```

**Source of Truth neden Neon?**
VAPI transcript geçici bellektedir. n8n execution history sınırlıdır. Next.js stateless'tir. Neon ise ACID garantili kalıcı depodur. Tüm raporlama, dashboard, n8n logic Neon'dan okur.
