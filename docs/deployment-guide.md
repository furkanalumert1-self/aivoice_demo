# Deployment Rehberi — Klinik AI Call Center

> Vercel, Neon, VAPI, n8n ve Clerk production kurulum adımları.

---

## Phase 1: Neon PostgreSQL

### 1.1 Hesap ve Proje Oluşturma

1. `https://console.neon.tech` → **Sign Up** (GitHub ile hızlı)
2. **Create a Project**:
   - Project Name: `klinik-ai-demo`
   - Cloud Provider: `AWS`
   - Region: `EU Central (Frankfurt)` — Türkiye'ye en yakın
3. **Create Project** → Connection Details sayfası açılır

### 1.2 Connection String Alma

1. Connection Details → **Connection String** tab'ı
2. **Connection string** kopyala:
   ```
   postgresql://klinik_owner:password@ep-bold-pond-123456.eu-central-1.aws.neon.tech/klinikdb?sslmode=require
   ```
3. Bu string'i `.env.local`'a ve Vercel'e ekleyeceksin.

### 1.3 Database Migration Çalıştırma

Neon Console → SQL Editor (sol menü):

```sql
-- 0000_spooky_mesmero.sql içeriğini buraya yapıştır

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

**Run** tuşuna bas → "Success" mesajı görmelisin.

### 1.4 Connection Pooling

Neon serverless otomatik pooling yapar. `@neondatabase/serverless` paketi HTTP tabanlı bağlantı kullandığı için Vercel Lambda'larla uyumludur — geleneksel `pg` paketi gibi connection limit sorunu yaşanmaz.

---

## Phase 2: Clerk Authentication

### 2.1 Hesap ve Uygulama Oluşturma

1. `https://clerk.com` → **Get started for free**
2. **Create application**:
   - Application name: `Klinik AI`
   - Sign-in options: Email, Google (istediğin)
3. Oluştur → API Keys sayfası açılır

### 2.2 API Key'leri Kopyalama

```bash
# Clerk Dashboard → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
```

### 2.3 Allowed URLs (Clerk Dashboard)

Development için:
```
Allowed Origins: http://localhost:3000
Redirect URLs: http://localhost:3000/admin
```

Production için (Vercel deploy sonrası):
```
Allowed Origins: https://aivoice-demo.vercel.app
Redirect URLs: https://aivoice-demo.vercel.app/admin
```

---

## Phase 3: VAPI Setup

> Detaylı yapılandırma için `docs/vapi-integration.md` dökümanına bak.

### 3.1 Hesap ve Asistan

1. `https://vapi.ai` → **Sign up**
2. **Assistants** → **Create Assistant**
3. Yapılandır (vapi-integration.md Bölüm 2'ye göre):
   - Model: GPT-4o
   - Voice: ElevenLabs Türkçe
   - System Prompt: Türkçe klinik prompt
   - First Message: "Merhaba! Klinik AI asistanıyım..."

### 3.2 Phone Number Alma

1. VAPI Dashboard → **Phone Numbers** → **Buy a number**
2. Ülke: Turkey (TR) veya US (Türkiye numarası yoksa US al, SIP ile bağla)
3. **Buy** → Numarayı asistana bağla: **Assign to Assistant**

### 3.3 Function Tools Ekleme

VAPI → Assistant → **Tools** → **+ Add Tool** → **Server** (Custom):
Her tool için `docs/vapi-integration.md` Bölüm 2.3'teki JSON şemalarını kullan.

Sırasıyla ekle:
1. `check_availability` → URL: `.../api/vapi/availability`
2. `book_appointment` → URL: `.../api/vapi/book`
3. `cancel_appointment` → URL: `.../api/vapi/cancel`
4. `reschedule_appointment` → URL: `.../api/vapi/reschedule`
5. `find_appointment` → URL: `.../api/vapi/find` (gelecek)

### 3.4 Server URL (Call-Ended Webhook)

VAPI → Assistant → **Server URL**:
```
https://aivoice-demo.vercel.app/api/vapi/call-ended
```

---

## Phase 4: Vercel Deployment

### 4.1 GitHub Repository Bağlama

1. `https://vercel.com` → **New Project**
2. **Import Git Repository** → GitHub'ı authorize et
3. `aivoice-demo` repository'yi seç
4. Framework: **Next.js** (otomatik algılanır)
5. **Deploy** — ilk deploy `DATABASE_URL` olmadığı için start ederken hata verebilir, bu normal.

### 4.2 Environment Variables Ekleme

Vercel → Project → **Settings** → **Environment Variables**:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host.neon.tech/db?sslmode=require` | All |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_xxx` | All |
| `CLERK_SECRET_KEY` | `sk_test_xxx` | All |
| `VAPI_API_KEY` | `vapi_xxx` | All |
| `OPENAI_API_KEY` | `sk-proj-xxx` | All |
| `N8N_WEBHOOK_URL` | `https://[instance].n8n.cloud/webhook` | All |
| `NEXT_PUBLIC_APP_URL` | `https://aivoice-demo.vercel.app` | All |

Her variable için **Add** butonuna bas.

### 4.3 Redeploy

Environment variables eklendikten sonra:
- **Deployments** → En son deployment → **⋮** → **Redeploy**
- Veya GitHub'a push yap (otomatik deploy tetiklenir)

### 4.4 Domain Yapılandırması

Vercel → Settings → **Domains**:
- Default: `aivoice-demo.vercel.app` (ücretsiz)
- Custom domain: `klinik-ai.example.com` → DNS kayıtlarını ekle

### 4.5 Build Yapılandırması

`package.json`'daki script'ler Vercel tarafından otomatik kullanılır:
```json
"scripts": {
  "build": "next build",    ← Vercel bunu çalıştırır
  "start": "next start"     ← Production server
}
```

`vercel.json` dosyası:
```json
{
  "serverExternalPackages": ["drizzle-orm", "postgres"]
}
```
Bu `next.config.ts`'de de tanımlı — drizzle-orm ve postgres paketlerinin serverless bundle'a dahil edilmesini sağlar.

### 4.6 Otomatik Deploy

GitHub main branch'e her push → otomatik Vercel deploy.  
PR açıldığında → preview URL oluşturulur (PR deploy).

---

## Phase 5: n8n Cloud Setup

### 5.1 Hesap Oluşturma

1. `https://n8n.cloud` → **Sign up** → Free tier
2. Instance adı seç: örn. `klinik-ai`
3. URL: `https://klinik-ai.app.n8n.cloud`

### 5.2 Workflow'ları Import Etme

Sırayla 4 workflow'u import et:

1. n8n → **Workflows** → **+ New Workflow**
2. Sağ üst **⋮** → **Import from File**
3. `/workflows/appointment-created.json` → Import
4. Credential uyarıları varsa kapat (sonra ekleyeceksin)
5. **Save**
6. Diğer 3 workflow için tekrarla

### 5.3 Credentials Ekleme

**Neon PostgreSQL:**
```
n8n → Settings → Credentials → + Add Credential → PostgreSQL
Name: Neon PostgreSQL
Host: ep-bold-pond-123456.eu-central-1.aws.neon.tech
Port: 5432
Database: klinikdb
User: klinik_owner
Password: [şifren]
SSL: require
```
→ Test Connection → Save

**OpenAI:**
```
n8n → Settings → Credentials → + Add Credential → OpenAI Api
Name: OpenAI API Key
API Key: sk-proj-xxxx
```
→ Save

### 5.4 Workflow'lara Credential Bağlama

Her workflow'u aç:
1. PostgreSQL node'larına tıkla → Credential: `Neon PostgreSQL` seç
2. OpenAI node'larına tıkla → Credential: `OpenAI API Key` seç
3. **Save**

### 5.5 Workflow'ları Aktif Etme

Her workflow için sağ üst toggle'ı **Aktif** yap.

### 5.6 Production Webhook URL'lerini Alma

Her webhook workflow'u aktif edince:
- `appointment-created` → `https://klinik-ai.app.n8n.cloud/webhook/appointment-created`
- `call-summary` → `https://klinik-ai.app.n8n.cloud/webhook/call-summary`
- `appointment-cancelled` → `https://klinik-ai.app.n8n.cloud/webhook/appointment-cancelled`

`N8N_WEBHOOK_URL` değeri (path hariç):
```
N8N_WEBHOOK_URL=https://klinik-ai.app.n8n.cloud/webhook
```

### 5.7 Vercel'e N8N_WEBHOOK_URL Ekleme

Vercel → Settings → Environment Variables → `N8N_WEBHOOK_URL` güncelle → **Redeploy**

---

## Phase 6: Son Testler

### 6.1 Admin Dashboard Testi
```bash
# Vercel URL aç
open https://aivoice-demo.vercel.app/admin

# Beklenen:
# - Dashboard açılıyor
# - İstatistikler 0 gösteriyor (henüz veri yok)
# - "Henüz çağrı kaydı yok" mesajı
```

### 6.2 API Route Testi
```bash
# Randevu oluştur
curl -X POST https://aivoice-demo.vercel.app/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"patientName":"Test Hasta","phone":"05001234567","appointmentAt":"2025-09-15T10:00:00Z"}'

# Beklenen: {"id":"uuid...","patientName":"Test Hasta",...}

# Listeyi kontrol et
curl https://aivoice-demo.vercel.app/api/appointments
# Beklenen: [{"id":"uuid..."}]
```

### 6.3 VAPI Entegrasyon Testi
1. VAPI Dashboard → Assistant → **Test** (web'den test çağrısı)
2. "Randevu almak istiyorum" de
3. Neon Console → SQL Editor: `SELECT * FROM appointments` → Kayıt düştü mü?

### 6.4 n8n Webhook Testi
```bash
curl -X POST https://klinik-ai.app.n8n.cloud/webhook/appointment-created \
  -H "Content-Type: application/json" \
  -d '{"id":"test-001","patientName":"Test","phone":"0500","status":"onaylandi"}'

# n8n Dashboard → Executions → Başarılı mı?
```

### 6.5 Call-Ended Webhook Testi
```bash
curl -X POST https://aivoice-demo.vercel.app/api/vapi/call-ended \
  -H "Content-Type: application/json" \
  -d '{
    "type": "end-of-call-report",
    "call": {
      "id": "test_call",
      "customer": {"number": "+905301234567"},
      "startedAt": "2025-09-11T10:00:00Z",
      "endedAt": "2025-09-11T10:03:00Z",
      "cost": 0.015,
      "artifact": {"transcript": "Test transcript", "recordingUrl": null},
      "analysis": {"summary": "Test"}
    }
  }'

# Beklenen: {"success":true,"callId":"uuid..."}
# Admin /admin/calls sayfasında kayıt görünmeli
```

---

## Deployment Checklist Özeti

- [ ] Neon: Proje oluşturuldu, migration çalıştırıldı
- [ ] Clerk: Uygulama oluşturuldu, API key'ler alındı
- [ ] VAPI: Asistan yapılandırıldı, tools eklendi, phone number alındı
- [ ] Vercel: Repo bağlandı, tüm env variables eklendi, deploy başarılı
- [ ] n8n: 4 workflow import edildi, credentials bağlandı, aktif edildi
- [ ] n8n webhook URL'leri Vercel'e eklendi, redeploy yapıldı
- [ ] /admin dashboard açılıyor
- [ ] Test randevu API'den oluşturulabildi
- [ ] VAPI test call çalışıyor, DB'ye kayıt düşüyor
- [ ] n8n execution geçmişinde başarılı kayıtlar var
