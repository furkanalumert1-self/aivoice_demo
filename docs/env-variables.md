# Environment Variables Rehberi — Klinik AI Call Center

> Her environment variable için kaynak, hedef, güvenlik kuralları ve örnek değerler.

---

## Genel Kurallar

1. `.env.local` dosyası asla git'e commit edilmez (`.gitignore`'da bulunmalı)
2. `NEXT_PUBLIC_` prefix'li değişkenler tarayıcıda görünür — hassas bilgi konulmamalı
3. Her production secret için farklı, güçlü değerler kullan (dev vs prod)
4. Vercel'de "All Environments" seçilirse dev/preview/prod hepsi aynı değeri kullanır — kritik sistemlerde ayrı değer kullan

---

## DATABASE_URL

```
Değer:   postgresql://user:password@host.neon.tech/dbname?sslmode=require
Tip:     Secret (server-side only)
```

**Nereden Alınır:**
1. `https://console.neon.tech` → Projen → **Connection Details**
2. **Connection String** seçeneği → kopyala
3. Format: `postgresql://[user]:[password]@[host]/[database]?sslmode=require`

**Nereye Girilir:**
- Local: `.env.local` dosyası (proje kökünde, git'e ekleme)
- Production: Vercel Dashboard → Settings → Environment Variables → `DATABASE_URL`

**Hangi Sistem Kullanır:**
Next.js API route'ları — `db/index.ts` üzerinden Drizzle ORM + `@neondatabase/serverless`

**Neden Gerekli:**
Neon serverless PostgreSQL bağlantısı için. Bu olmadan tüm DB işlemleri `"DATABASE_URL is not set"` hatasıyla çöker.

**Güvenlik:**
- Asla `NEXT_PUBLIC_` prefix'i ile kullanma — bundle'a girer, tarayıcıdan görünür
- Asla log'a yazma (`console.log(process.env.DATABASE_URL)` — production'da tehlikeli)
- Asla GitHub'a commit etme

**Örnek:**
```
DATABASE_URL=postgresql://klinik_owner:p4ssw0rd_g1zl1@ep-bold-pond-123456.eu-central-1.aws.neon.tech/klinikdb?sslmode=require
```

---

## NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

```
Değer:   pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx (test) veya pk_live_xxx (prod)
Tip:     Public (tarayıcıda görünür — tasarımı böyle)
```

**Nereden Alınır:**
1. `https://dashboard.clerk.com` → Projen → **API Keys**
2. **Publishable key** bölümü → kopyala

**Nereye Girilir:**
- Local: `.env.local`
- Production: Vercel → Environment Variables

**Hangi Sistem Kullanır:**
Clerk frontend SDK (`@clerk/nextjs`) — tarayıcıda oturum yönetimi, sign-in widget.

**Neden Gerekli:**
Clerk'in client-side kütüphanesi bu key olmadan başlatılamaz. `ClerkProvider` sarmalayıcısı bu değeri kullanır.

**Güvenlik:**
`NEXT_PUBLIC_` prefix'i bilinçlidir — bu key public olarak tasarlanmış. Sadece Clerk'in hangi uygulamaya ait olduğunu gösterir, secret bilgi içermez.

**Test vs Production:**
```
# Test (Clerk dashboard'da "Development" seçili)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsueW91cmRvbWFpbi5jb20k

# Production (Clerk dashboard'da "Production" seçili)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsueW91cmRvbWFpbi5jb20k
```

**Örnek:**
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsueW91cmRvbWFpbi5jb20k
```

---

## CLERK_SECRET_KEY

```
Değer:   sk_test_xxxxxxxxxxxxxxxxxxxx (test) veya sk_live_xxx (prod)
Tip:     Secret (server-side only — kritik)
```

**Nereden Alınır:**
1. `https://dashboard.clerk.com` → Projen → **API Keys**
2. **Secret keys** bölümü → **Show secret key** → kopyala
3. Bir kez gösterilir — kaybet, yenisi oluştur

**Nereye Girilir:**
- Local: `.env.local`
- Production: Vercel → Environment Variables

**Hangi Sistem Kullanır:**
Next.js middleware ve server-side Clerk işlemleri. JWT doğrulama, server-side auth.

**Neden Gerekli:**
Server-side Clerk middleware (`middleware.ts`) bu key olmadan JWT token'larını doğrulayamaz. Admin sayfaları koruma altına alınamaz.

**Güvenlik:**
Bu key ile Clerk API'ye tam erişim sağlanır — asla client-side kod'a, asla log'a, asla git'e gitmesin.

**Örnek:**
```
CLERK_SECRET_KEY=sk_test_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789
```

---

## VAPI_API_KEY

```
Değer:   vapi_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
Tip:     Secret (server-side only)
```

**Nereden Alınır:**
1. `https://dashboard.vapi.ai` → sağ üst profil → **Account Settings**
2. **API Keys** bölümü → **Create new key**
3. Key'i kopyala (bir kez gösterilir)

**Nereye Girilir:**
- Local: `.env.local`
- Production: Vercel → Environment Variables

**Hangi Sistem Kullanır:**
Next.js API route'ları — VAPI API'ye istek gönderme senaryolarında (outbound call, asistan yönetimi). Şu an doğrudan kullanılmıyor ama webhook doğrulaması için gerekli.

**Neden Gerekli:**
VAPI'nin REST API'sine kimlik doğrulama. İleride outbound call (klinikten hastayı arama) özelliği eklenirse zorunlu.

**Güvenlik:**
- `NEXT_PUBLIC_` kullanma — VAPI hesabına tam erişim sağlar
- Header'da kullanım: `Authorization: Bearer ${process.env.VAPI_API_KEY}`

**Örnek:**
```
VAPI_API_KEY=vapi_AbCdEfGhIjKlMnOpQrStUvWxYz
```

---

## OPENAI_API_KEY

```
Değer:   sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
Tip:     Secret (server-side only)
```

**Nereden Alınır:**
1. `https://platform.openai.com/api-keys` → **Create new secret key**
2. Key'i kopyala (bir kez gösterilir)
3. Proje için billing limit belirle (platform.openai.com → Billing → Limits)

**Nereye Girilir:**
- Local: `.env.local`
- Production: Vercel → Environment Variables
- n8n Cloud: Credential olarak (ayrıca — bkz. n8n-workflow.md)

**Hangi Sistem Kullanır:**
- n8n `call-summary` workflow'u → GPT-4o-mini transkript özeti
- İleride eklenecek server-side AI işlemleri

**Neden Gerekli:**
n8n OpenAI node'u bu credential'ı n8n'in kendi secret store'unda tutar. Ancak Vercel'de de tutmak gerekirse server-side AI özellikler için.

**Maliyet Uyarısı:**
GPT-4o maliyeti yüksek. n8n workflow'unda `gpt-4o-mini` kullanmak (~20x daha ucuz) önerilir.

**Güvenlik:**
Bu key ile OpenAI hesabına tam erişim. Limit belirle: platform.openai.com → Billing → Usage limits.

**Örnek:**
```
OPENAI_API_KEY=sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

---

## N8N_WEBHOOK_URL

```
Değer:   https://[instance].n8n.cloud/webhook
Tip:     Non-secret (URL olduğu için secret değil ama public yaymak doğru değil)
```

**Nereden Alınır:**
1. n8n Cloud instance'ına git
2. Herhangi bir aktif webhook workflow'u aç
3. Webhook node'a tıkla → Production URL'yi kopyala
4. Yalnızca base URL kısmı alınır (path hariç):
   ```
   https://klinik-ai.app.n8n.cloud/webhook/appointment-created
   ↓ sadece bu kısım alınır:
   https://klinik-ai.app.n8n.cloud/webhook
   ```

**Nereye Girilir:**
- Local: `.env.local` (local n8n için bkz. LOCAL_DEVELOPMENT.md)
- Production: Vercel → Environment Variables

**Hangi Sistem Kullanır:**
Next.js API route'ları — `/api/vapi/book`, `/api/vapi/cancel`, `/api/vapi/call-ended`

**Nasıl Kullanılır:**
```typescript
// book/route.ts
const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
if (n8nWebhookUrl) {
  await fetch(`${n8nWebhookUrl}/appointment-created`, { method: "POST", ... });
}
```

Path'ler route.ts dosyaları tarafından eklenir:
- `/appointment-created` — book.ts
- `/appointment-cancelled` — cancel.ts
- `/call-summary` — call-ended.ts

**Boş Kalırsa:**
`if (n8nWebhookUrl)` kontrolü sayesinde hata vermez, sadece n8n çağrısı atlanır. DB kaydı yine de yapılır.

**Test vs Production:**
```
# Local n8n (Docker):
N8N_WEBHOOK_URL=http://localhost:5678/webhook

# n8n Cloud (production):
N8N_WEBHOOK_URL=https://klinik-ai.app.n8n.cloud/webhook

# n8n Cloud (test — geçici, sadece n8n editor açıkken çalışır):
N8N_WEBHOOK_URL=https://klinik-ai.app.n8n.cloud/webhook-test
```

**Örnek:**
```
N8N_WEBHOOK_URL=https://klinik-ai.app.n8n.cloud/webhook
```

---

## NEXT_PUBLIC_APP_URL

```
Değer:   https://aivoice-demo.vercel.app (production) veya http://localhost:3000 (local)
Tip:     Public (NEXT_PUBLIC_ — client'ta da kullanılabilir)
```

**Nereden Alınır:**
- Vercel → Project → Dashboard → Domain bölümünden kopyala
- Custom domain varsa onu kullan

**Nereye Girilir:**
- Local: `.env.local` → `http://localhost:3000`
- Production: Vercel → Environment Variables → `https://aivoice-demo.vercel.app`

**Hangi Sistem Kullanır:**
- n8n `appointment-created` workflow'unda `Dashboard Güncelle` node'u:
  ```
  URL: ={{ $env.NEXT_PUBLIC_APP_URL }}/api/appointments
  ```
- İleride client-side'da absolute URL gerekirse

**Neden Gerekli:**
n8n workflow'u Vercel URL'ini `$env.NEXT_PUBLIC_APP_URL` environment variable'ından okur. Bu değer n8n'in kendi env store'unda ayrıca tanımlanmalıdır.

**n8n'de Tanımlama:**
n8n Cloud → Settings → **Environment Variables** (veya `.env` dosyası):
```
NEXT_PUBLIC_APP_URL=https://aivoice-demo.vercel.app
```

**Örnek:**
```
# .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Vercel (production)
NEXT_PUBLIC_APP_URL=https://aivoice-demo.vercel.app
```

---

## Özet Tablosu

| Değişken | Tip | Zorunlu | Kullanan Sistem | Nereden |
|----------|-----|---------|----------------|---------|
| `DATABASE_URL` | Secret | EVET | Next.js (Drizzle) | console.neon.tech |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | İsteğe bağlı* | Clerk frontend | dashboard.clerk.com |
| `CLERK_SECRET_KEY` | Secret | İsteğe bağlı* | Clerk middleware | dashboard.clerk.com |
| `VAPI_API_KEY` | Secret | İsteğe bağlı** | Next.js (VAPI API) | dashboard.vapi.ai |
| `OPENAI_API_KEY` | Secret | İsteğe bağlı** | n8n OpenAI node | platform.openai.com |
| `N8N_WEBHOOK_URL` | Non-secret | İsteğe bağlı** | Next.js → n8n | n8n Cloud |
| `NEXT_PUBLIC_APP_URL` | Public | İsteğe bağlı** | n8n workflow | Vercel domain |

*Clerk middleware eklenmişse zorunlu  
**Olmasa da temel işlevler çalışır; eksikliğinde ilgili özellik devre dışı kalır

---

## .env.local Şablonu

```bash
# Proje kökünde .env.local oluştur (git'e commit etme)
cp .env.example .env.local
# Değerleri doldur
```

`.env.local` örnek içerik:
```env
DATABASE_URL=postgresql://klinik_owner:password@ep-xxxx.neon.tech/klinikdb?sslmode=require
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
VAPI_API_KEY=vapi_xxxx
OPENAI_API_KEY=sk-proj-xxxx
N8N_WEBHOOK_URL=http://localhost:5678/webhook
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
