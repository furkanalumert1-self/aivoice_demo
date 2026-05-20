# Production Deployment Kontrol Listesi

> Bu kontrol listesini yukarıdan aşağıya sırayla uygula. Her adımı tamamlayınca kutucuğu işaretle.

---

## Phase 1: Neon PostgreSQL

- [ ] `https://console.neon.tech` → hesap oluştur (GitHub ile hızlı)
- [ ] **New Project** → Name: `klinik-ai-demo` → Region: EU Central (Frankfurt)
- [ ] Project oluşturuldu → Connection Details sayfası açıldı
- [ ] **Connection String** kopyala ve kaydet (güvenli yerde)
  ```
  postgresql://klinik_owner:PASSWORD@ep-xxxx.eu-central-1.aws.neon.tech/klinikdb?sslmode=require
  ```
- [ ] **SQL Editor** (sol menü) → Migration SQL çalıştır:

```sql
CREATE TABLE "appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_name" text,
  "phone" text,
  "doctor_name" text,
  "appointment_at" timestamp,
  "status" text DEFAULT 'onaylandi',
  "source" text DEFAULT 'voice_agent',
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE "calls" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "caller_phone" text,
  "duration_seconds" integer,
  "transcript" text,
  "summary" text,
  "cost" numeric,
  "outcome" text,
  "appointment_id" uuid,
  "recording_url" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text,
  "description" text,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);
```

- [ ] SQL Editor → Run → "Success" mesajı görüldü
- [ ] Tabloları doğrula: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`

---

## Phase 2: Clerk Authentication

- [ ] `https://clerk.com` → **Get started for free**
- [ ] **Create application** → Name: `Klinik AI` → Sign-in: Email + Google
- [ ] Application oluşturuldu
- [ ] **API Keys** sayfasından kopyala:
  - [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxx`
  - [ ] `CLERK_SECRET_KEY=sk_live_xxxx`
- [ ] **Allowed Origins** → Production URL ekle (Vercel deploy sonrası güncelle)

---

## Phase 3: VAPI Setup

- [ ] `https://vapi.ai` → **Sign up**
- [ ] **Assistants** → **Create Assistant**
- [ ] Assistant yapılandır:
  - [ ] Name: `Klinik AI Assistant`
  - [ ] Model Provider: OpenAI / Model: `gpt-4o`
  - [ ] System Prompt: Türkçe klinik prompt (vapi-integration.md Bölüm 2.1'e bak)
  - [ ] First Message: `Merhaba! Klinik AI asistanıyım. Size nasıl yardımcı olabilirim?`
  - [ ] Voice Provider: ElevenLabs / Türkçe voice ID seç
  - [ ] Language: Turkish / tr-TR
- [ ] **API Keys** → Create new key → `VAPI_API_KEY` kaydet

- [ ] **Phone Numbers** → **Buy a number** → Asistana bağla

- [ ] **Tools** (5 adet ekle) — Her biri için Server URL Vercel URL'i:

  - [ ] `check_availability` → `https://[vercel-domain]/api/vapi/availability`
  - [ ] `book_appointment` → `https://[vercel-domain]/api/vapi/book`
  - [ ] `cancel_appointment` → `https://[vercel-domain]/api/vapi/cancel`
  - [ ] `reschedule_appointment` → `https://[vercel-domain]/api/vapi/reschedule`
  - [ ] `find_appointment` → `https://[vercel-domain]/api/vapi/find` (opsiyonel)

- [ ] **Server URL**: `https://[vercel-domain]/api/vapi/call-ended`

---

## Phase 4: Vercel Deployment

- [ ] `https://vercel.com` → hesap oluştur (GitHub ile)
- [ ] **New Project** → GitHub repo'yu import et (`aivoice-demo`)
- [ ] Framework: **Next.js** (otomatik algılanır)
- [ ] **Environment Variables** ekle (Settings → Environment Variables):

  | Variable | Value |
  |----------|-------|
  | `DATABASE_URL` | (Neon connection string) |
  | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | (Clerk key) |
  | `CLERK_SECRET_KEY` | (Clerk secret) |
  | `VAPI_API_KEY` | (VAPI key) |
  | `OPENAI_API_KEY` | (OpenAI key) |
  | `N8N_WEBHOOK_URL` | (n8n cloud webhook URL — Phase 5'ten sonra) |
  | `NEXT_PUBLIC_APP_URL` | `https://[proje-adi].vercel.app` |

- [ ] Her variable için **Add** → tüm environmentlar seçili (Production, Preview, Development)
- [ ] **Deploy** → Build log'u izle
- [ ] Build başarılı → `https://[proje-adi].vercel.app/admin` açılıyor

- [ ] Vercel domain'ini VAPI ve Clerk'e gir:
  - [ ] VAPI → Assistant → Tool URL'leri güncelle
  - [ ] VAPI → Server URL güncelle
  - [ ] Clerk → Allowed Origins → Vercel URL ekle

---

## Phase 5: n8n Cloud Setup

- [ ] `https://n8n.cloud` → **Sign up** → Free trial
- [ ] Instance oluştur → URL kaydet: `https://[isim].app.n8n.cloud`

- [ ] **Credentials** oluştur:
  - [ ] PostgreSQL → Name: `Neon PostgreSQL`
    - Host: `ep-xxxx.neon.tech`
    - Port: `5432`
    - Database: `klinikdb`
    - User: `klinik_owner`
    - Password: [Neon şifresi]
    - SSL: `require`
    - → Test Connection → Save
  - [ ] OpenAI → Name: `OpenAI API Key`
    - API Key: `sk-proj-xxxx`
    - → Save

- [ ] **Workflow Import** (4 workflow):
  - [ ] `appointment-created.json` → Import → Credentials bağla → Save → **Activate**
  - [ ] `call-summary.json` → Import → Credentials bağla → Save → **Activate**
  - [ ] `appointment-cancelled.json` → Import → Credentials bağla → Save → **Activate**
  - [ ] `appointment-reminder.json` → Import → Credentials bağla → Save → **Activate**

- [ ] Production webhook URL'lerini kopyala:
  ```
  https://[isim].app.n8n.cloud/webhook/appointment-created
  https://[isim].app.n8n.cloud/webhook/call-summary
  https://[isim].app.n8n.cloud/webhook/appointment-cancelled
  ```
  Base URL: `https://[isim].app.n8n.cloud/webhook`

- [ ] **Vercel → Environment Variables** güncelle:
  - [ ] `N8N_WEBHOOK_URL=https://[isim].app.n8n.cloud/webhook`
  - [ ] Vercel → Deployments → **Redeploy**

---

## Phase 6: Test ve Doğrulama

### 6.1 Admin Dashboard
- [ ] `https://[vercel-domain]/admin` açılıyor
- [ ] Dashboard istatistikler görünüyor (hepsi 0 olabilir — normal)
- [ ] Sidebar navigasyon çalışıyor
- [ ] `/admin/appointments` sayfası açılıyor

### 6.2 API Route Testi
```bash
# Randevu oluştur
curl -X POST https://[vercel-domain]/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"patientName":"Test Hasta","phone":"05001234567","appointmentAt":"2025-09-15T10:00:00Z"}'
```
- [ ] HTTP 201 ve UUID döndü
- [ ] `/admin/appointments` sayfasında kayıt görünüyor

### 6.3 VAPI Entegrasyonu
```bash
# Availability test
curl -X POST https://[vercel-domain]/api/vapi/availability \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-09-15","doctorName":"Dr. Test"}'
```
- [ ] `results` array ile slotlar döndü

```bash
# Book test
curl -X POST https://[vercel-domain]/api/vapi/book \
  -H "Content-Type: application/json" \
  -d '{"patientName":"Test","phone":"05001234567","date":"2025-09-15","time":"10:00"}'
```
- [ ] Randevu oluşturuldu (UUID döndü)
- [ ] Neon SQL Editor: `SELECT * FROM appointments` → kayıt var

### 6.4 Call-Ended Webhook
```bash
curl -X POST https://[vercel-domain]/api/vapi/call-ended \
  -H "Content-Type: application/json" \
  -d '{
    "type": "end-of-call-report",
    "call": {
      "id": "prod_test_001",
      "customer": {"number": "+905301234567"},
      "startedAt": "2025-09-11T10:00:00Z",
      "endedAt": "2025-09-11T10:03:00Z",
      "cost": 0.012,
      "artifact": {"transcript": "Test transkript", "recordingUrl": null},
      "analysis": {"summary": "Test özeti"}
    }
  }'
```
- [ ] `{"success":true,"callId":"uuid..."}` döndü
- [ ] `/admin/calls` sayfasında çağrı kaydı görünüyor

### 6.5 n8n Webhook Testi
```bash
curl -X POST https://[isim].app.n8n.cloud/webhook/appointment-created \
  -H "Content-Type: application/json" \
  -d '{"id":"test","patientName":"Test","phone":"0500","status":"onaylandi"}'
```
- [ ] n8n → Executions → Başarılı execution görünüyor
- [ ] Neon `notifications` tablosunda bildirim var: `SELECT * FROM notifications;`

### 6.6 VAPI Gerçek Çağrı Testi
- [ ] VAPI Dashboard → Assistant → **Test** (web tabanlı test)
- [ ] "Randevu almak istiyorum" de
- [ ] AI Türkçe yanıt verdi
- [ ] Randevu DB'ye düştü: Neon → `SELECT * FROM appointments`
- [ ] `/admin/appointments` sayfasında görünüyor

---

## Deployment Sonrası Bakım

### Otomatik Deploy
- GitHub main branch'e push → Vercel otomatik deploy eder
- PR → Preview URL oluşturulur

### Schema Değişikliği
1. `db/schema.ts` güncelle
2. `npm run db:generate` → migration dosyası oluşur
3. Neon SQL Editor → yeni migration'ı çalıştır
4. Veya `npm run db:migrate` (local → Neon bağlantıyla)

### Log İzleme
- Vercel: Dashboard → Functions → Log'ları gerçek zamanlı izle
- n8n: Executions → Hatalı execution'ları incele
- Neon: Monitoring → Query history

### Maliyet İzleme
- VAPI: Dashboard → Usage → Aylık maliyet
- OpenAI: platform.openai.com → Usage → Günlük harcama
- Neon: Ücretsiz tier → 0.5 GB depolama, 190 compute saat
- Vercel: Ücretsiz tier → 100 GB bandwidth, 100K serverless invocations/ay
