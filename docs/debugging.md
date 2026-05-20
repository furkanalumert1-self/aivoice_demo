# Debug Rehberi — Klinik AI Call Center

> Sık karşılaşılan problemler, nedenleri, tanımlama yöntemleri ve çözümleri.

---

## Problem 1: `column "recording_url" does not exist`

**Neden Olur:**
Neon veritabanındaki `calls` tablosu eksik kolonlarla oluşturulmuş. Drizzle schema (`db/schema.ts`) güncellense de veritabanı migration çalıştırılmadan otomatik güncellenmiyor.

**Nasıl Anlaşılır:**
- Vercel function log'larında:
  ```
  Error: column "recording_url" does not exist
  ```
- `/admin/calls` sayfası boş array döner (hata yakalanıp `[]` döndürülüyor)
- `/api/calls` → `[]` (boş), HTTP 200

**Çözüm:**
1. Neon Console → `https://console.neon.tech` → Projen → **SQL Editor**
2. `drizzle/0001_add_missing_columns.sql` dosyasının içeriğini yapıştır
3. **Run** → "Success" mesajı beklenir
4. Tarayıcıda sayfayı yenile

**Önleme:**
Schema değişikliklerinde:
```bash
npm run db:generate    # Yeni migration dosyası oluşturur
npm run db:migrate     # Migration'ı uygular (veya Neon SQL Editor'de manuel çalıştır)
```

---

## Problem 2: `DATABASE_URL is not set`

**Neden Olur:**
`.env.local` dosyası yok, yanlış adlandırılmış (`.env` yerine `.env.local`) veya Vercel'de environment variable eksik.

**Nasıl Anlaşılır:**
- Local: Terminal'de `npm run dev` çalışırken ilk DB isteğinde:
  ```
  Error: DATABASE_URL is not set
  ```
- Vercel: Function log'larında aynı hata, tüm API route'lar 500 dönüyor

**Çözüm — Local:**
```bash
# Dosya var mı kontrol et
ls -la | grep env

# .env.example'dan kopyala
cp .env.example .env.local

# Değeri doldur
# DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require
```

**.env.local dosyası okunmuyor mu?**
Next.js yalnızca proje kökündeki `.env.local`'i okur. `src/` altında değil.

**Çözüm — Vercel:**
1. Vercel → Project → Settings → Environment Variables
2. `DATABASE_URL` yoksa **Add Variable**
3. Değeri gir → **Save**
4. Deployments → **Redeploy**

**Debug:**
```bash
# Local'de değerin okunup okunmadığını test et
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.DATABASE_URL ? 'VAR' : 'YOK')"
```

---

## Problem 3: VAPI Function Call Hata Döndürüyor

**Neden Olur:**
- Backend URL yanlış → VAPI isteği başka bir yere gidiyor veya 404 alıyor
- Response formatı yanlış → `results` array'i eksik
- Backend 500 döndürüyor → DB bağlantı hatası

**Nasıl Anlaşılır:**
VAPI Dashboard → **Call Logs** → İlgili çağrı → **Tool Calls** bölümü:
```
Tool: book_appointment
Status: Error
Response: {"error": "Not Found"} (404 ise URL yanlış)
Response: Internal Server Error (500 ise backend hata)
```

**Çözüm — URL Yanlışsa:**
1. VAPI Dashboard → Assistant → Tools → İlgili tool
2. Server URL'i kontrol et:
   ```
   https://aivoice-demo.vercel.app/api/vapi/book  ← DOĞRU
   https://aivoice-demo.vercel.app/api/book        ← YANLIŞ (vapi/ path eksik)
   ```
3. URL'i düzelt → Save

**Çözüm — Response Formatı Yanlışsa:**
VAPI `results` array'i bekler:
```json
// DOĞRU format:
{
  "results": [{
    "toolCallId": "call_abc",
    "result": { "success": true, "message": "..." }
  }]
}

// YANLIŞ — VAPI okuyamaz:
{
  "success": true,
  "message": "..."
}
```

**curl ile Test:**
```bash
curl -X POST https://aivoice-demo.vercel.app/api/vapi/book \
  -H "Content-Type: application/json" \
  -d '{"patientName":"Test","phone":"05001234567","date":"2025-09-15","time":"10:00"}' \
  -v 2>&1 | grep -E "(< HTTP|{|success|error)"
```

---

## Problem 4: n8n Webhook Veri Almıyor

**Neden Olur:**
1. Workflow aktif değil → Production URL yanıt vermiyor
2. Test URL kullanılmış → `webhook-test/` URL'si sadece editor açıkken çalışır
3. `N8N_WEBHOOK_URL` Vercel'de yanlış veya eksik
4. URL'de path dahil edilmiş → çift path oluşuyor

**Nasıl Anlaşılır:**
n8n → **Executions** bölümüne bak:
- Hiç execution yok → Webhook hiç çağrılmıyor
- Execution var ama hatalı → Workflow içinde sorun

**Çözüm — Workflow Aktif Değilse:**
n8n → Workflow → sağ üst **Toggle** → Aktif et

**Çözüm — Test vs Production URL:**
```bash
# Test URL (sadece n8n editor açıkken):
https://[instance].n8n.cloud/webhook-test/appointment-created

# Production URL (her zaman):
https://[instance].n8n.cloud/webhook/appointment-created
```

Vercel'deki `N8N_WEBHOOK_URL` production URL'i göstermeli:
```
N8N_WEBHOOK_URL=https://[instance].n8n.cloud/webhook
# NOT /webhook-test/ değil!
```

**Çözüm — Yanlış URL:**
```typescript
// book/route.ts'de URL şöyle oluşturuluyor:
fetch(`${n8nWebhookUrl}/appointment-created`, ...)

// N8N_WEBHOOK_URL zaten /webhook ile bitiyorsa:
// https://x.n8n.cloud/webhook/appointment-created  ✓

// N8N_WEBHOOK_URL /webhook/appointment-created girilmişse:
// https://x.n8n.cloud/webhook/appointment-created/appointment-created  ✗ — çift path!
```

**Debug:**
```bash
# Vercel'deki değeri kontrol et
# Vercel Dashboard → Settings → Environment Variables → N8N_WEBHOOK_URL

# Manuel test:
curl -X POST ${N8N_WEBHOOK_URL}/appointment-created \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## Problem 5: n8n Expression `undefined` Döndürüyor

**Neden Olur:**
- Field adı yanlış (`patientName` vs `patient_name`)
- Yanlış node referansı (`$json` vs `$('Webhook').item.json`)
- Webhook payload'ı beklenenden farklı format

**Nasıl Anlaşılır:**
n8n Execution → hatalı node → **Output** bölümünde `undefined` veya boş değer

**Çözüm — Field Adı Uyumsuzluğu:**
VAPI'den gelen camelCase (`patientName`) vs Neon'dan gelen snake_case (`patient_name`):
```
# Next.js API route'u camelCase döndürür (Drizzle mapping yapar):
{ "patientName": "Ahmet", "appointmentAt": "2025-09-11T10:00:00Z" }

# n8n expression:
{{ $json.patientName }}  ← DOĞRU
{{ $json.patient_name }} ← YANLIŞ (Next.js camelCase döndürüyor)
```

**Çözüm — Node Referansı:**
```
Sonraki node'larda önceki node verisi değişti mi?

# GPT node çalıştıktan sonra $json = GPT çıktısı
{{ $json.transcript }}  ← GPT node'dan SONRA bu artık GPT çıktısı değişkeni

# Webhook orijinal datasına erişmek için:
{{ $('Webhook').item.json.transcript }}  ← her zaman ilk webhook datasını verir
```

**Debug:**
n8n → Test Workflow → Her node çıktısını kontrol et:
- Node'a tıkla → sağ panel → **Output** tab → JSON'u incele
- Hangi field'ın hangi değer taşıdığını gör

---

## Problem 6: CORS Hatası API Route'larında

**Neden Olur:**
Tarayıcıdan farklı origin'den `/api/*` rotalarına fetch yapılıyor.

**Nasıl Anlaşılır:**
Browser console:
```
Access to fetch at 'https://aivoice-demo.vercel.app/api/appointments' 
from origin 'https://baska-site.com' has been blocked by CORS policy
```

**Çözüm:**
Next.js API route'larına CORS header'ları ekle:

```typescript
// app/api/appointments/route.ts
export async function GET(req: NextRequest) {
  const response = await ...; // İşlem
  
  return NextResponse.json(data, {
    headers: {
      "Access-Control-Allow-Origin": "*", // veya belirli domain
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// OPTIONS preflight için:
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
```

**Not:** VAPI function call'ları server-to-server'dır — CORS etkilemez. Sadece tarayıcıdan yapılan fetch'lerde sorun çıkar.

---

## Problem 7: Build Hatası — `@radix-ui/react-badge not found`

**Neden Olur:**
`@radix-ui/react-badge` paketi mevcut değil — bu paket Radix UI'da bulunmuyor. Badge bileşeni ya shadcn/ui ile `class-variance-authority` kullanılarak yapılır ya da Tailwind ile inline yazılır.

**Nasıl Anlaşılır:**
```bash
npm run build

# Hata:
Module not found: Can't resolve '@radix-ui/react-badge'
```

**Çözüm:**
```bash
# Bu paketi yükleme — var değil
# Yerine kullan:
```

`Badge` bileşeni için:
```tsx
// components/ui/badge.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({ className, variant, ...props }: 
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

---

## Problem 8: Vercel Build — `public` Output Directory Hatası

**Neden Olur:**
`vercel.json` veya Vercel project settings'te `outputDirectory: "public"` gibi yanlış ayar var.

**Nasıl Anlaşılır:**
Vercel build log'unda:
```
Error: No output directory named "public" found after the build completed.
```

**Çözüm:**
- Next.js'de output directory ayarlaMA — Vercel otomatik algılar (`.next` klasörü)
- Vercel Project Settings → Build & Output Settings → Output Directory → **Boş bırak**
- `vercel.json`'dan `outputDirectory` kaldır

Doğru `vercel.json`:
```json
{
  "serverExternalPackages": ["drizzle-orm", "postgres"]
}
```

---

## Problem 9: n8n PostgreSQL Credential Bağlantı Hatası

**Neden Olur:**
- SSL mode seçilmemiş (Neon zorunlu kılar)
- Host yanlış kopyalanmış
- Şifre değiştirilmiş
- Neon ücretsiz tier hesabı uyku modunda

**Nasıl Anlaşılır:**
n8n → Credential → **Test Connection** → "Connection failed":
```
SSL connection is required
veya
password authentication failed for user "klinik_owner"
```

**Çözüm — SSL:**
n8n Credential → PostgreSQL → **SSL** alanı → `require` seç

**Çözüm — Host Yanlış:**
Neon Console → Connection Details → Host'u kopyala:
```
ep-bold-pond-123456.eu-central-1.aws.neon.tech
# NOT:
postgresql://user:pass@ep-bold-pond... ← bütün URL değil, sadece host
```

**Çözüm — Neon Uyku Modu:**
Neon ücretsiz tier 5 dakika hareketsizlikte database'i pause eder.
İlk bağlantıda ~3 saniye cold start gecikmesi olabilir.
Credential test tekrar dene.

---

## Problem 10: Duplicate Randevu Kayıtları

**Neden Olur:**
VAPI bazen aynı function call'ı 2 kez gönderebilir (network retry). Idempotency key yok — her istek yeni DB kaydı oluşturuyor.

**Nasıl Anlaşılır:**
Admin dashboard'da aynı hasta/doktor/saat için 2+ randevu var.

**Geçici Çözüm:**
Admin dashboard'dan duplicate'ı manuel sil (Neon SQL Editor):
```sql
DELETE FROM appointments 
WHERE id IN (
  SELECT id FROM appointments
  WHERE patient_name = 'Ahmet Yılmaz' AND appointment_at = '2025-09-11 10:00:00'
  ORDER BY created_at DESC
  LIMIT 1
);
```

**Kalıcı Çözüm (Uygula):**
`/api/vapi/book/route.ts`'e idempotency kontrolü ekle:
```typescript
// INSERT'ten önce aynı slot var mı kontrol et
const existing = await db
  .select()
  .from(appointments)
  .where(
    and(
      eq(appointments.doctorName, doctorName),
      eq(appointments.appointmentAt, appointmentAt),
      eq(appointments.status, "onaylandi")
    )
  )
  .limit(1);

if (existing.length > 0) {
  return NextResponse.json({
    results: [{
      toolCallId: ...,
      result: {
        success: false,
        message: "Bu tarih ve saatte zaten randevu mevcut.",
        existingAppointmentId: existing[0].id
      }
    }]
  });
}
```

---

## Problem 11: VAPI Timeout — Function Call Çok Uzun Sürüyor

**Neden Olur:**
- Neon cold start (~500ms) + DB sorgusu (~100ms) + n8n webhook (~200ms) = toplam ~800ms+
- VAPI default function call timeout: 5–10 saniye (VAPI konfigürasyonuna göre)
- Ağır DB sorguları

**Nasıl Anlaşılır:**
VAPI Call Logs → Tool Calls → "Timeout" veya function sonuç gelmiyor.

**Çözüm:**
1. n8n webhook'u background'da bırak — zaten async, try/catch içinde.
2. Neon DB warm-up: ping endpoint ekle (cron job veya vercel warm-up).
3. DB sorgularına index ekle:
   ```sql
   CREATE INDEX idx_appointments_at ON appointments(appointment_at);
   CREATE INDEX idx_appointments_status ON appointments(status);
   CREATE INDEX idx_appointments_doctor ON appointments(doctor_name);
   ```
4. Availability route'unu optimize et — 6 slot yerine önce sadece dolu slotları say.

---

## Problem 12: Clerk Authentication API Route'larını Bloklıyor

**Neden Olur:**
`middleware.ts` yanlış yapılandırılmış — VAPI webhook route'ları da auth gerektiriyor.

**Nasıl Anlaşılır:**
VAPI Call Logs → Tool Calls → 401 Unauthorized yanıtı.

**Çözüm:**
`middleware.ts`'te VAPI route'larını açık bırak:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// VAPI ve public API route'ları — auth gerekmez
const isPublicRoute = createRouteMatcher([
  "/api/vapi(.*)",     // VAPI function calls
  "/",                 // Landing page
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Public route'lara izin ver
  if (isPublicRoute(req)) return;
  
  // Diğer her şey auth gerektirir (/admin/*)
  await auth.protect();
});
```

**Test:**
```bash
# VAPI route auth olmadan çalışmalı (401 vermemeli)
curl -X POST http://localhost:3000/api/vapi/availability \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-09-11"}'
# Beklenen: 200 OK, slots listesi
```

---

## Genel Debug Araçları

### Vercel Function Log'larını Görüntüleme
```
Vercel Dashboard → Project → Deployments → En son → Functions → İlgili route → Logs
```

### Neon DB Sorgularını İzleme
```
Neon Console → Project → Monitoring → Query History
```

### VAPI Call Log'larını Görüntüleme
```
VAPI Dashboard → Call Logs → İlgili çağrı → Tool Calls / Transcript
```

### n8n Execution Geçmişi
```
n8n → Executions (sol menü) → İlgili execution → Her node output'u görebilirsin
```

### Local Development Hızlı Debug
```bash
# API route'unu curl ile test et
curl -X POST http://localhost:3000/api/vapi/book \
  -H "Content-Type: application/json" \
  -d '{"patientName":"Test","phone":"0500","date":"2025-09-15","time":"10:00"}' \
  | python3 -m json.tool

# DB bağlantısını test et
node -e "
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT count(*) FROM appointments\`.then(r => console.log(r)).catch(console.error);
"
```
