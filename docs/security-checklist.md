# Güvenlik Kontrol Listesi — Klinik AI Call Center

> Production ortamına almadan önce kontrol edilmesi gereken güvenlik maddeleri.

---

## 1. Environment Variables ve Secret Yönetimi

### .env.local Git'e Gitmiyor mu?

```bash
# .gitignore'u kontrol et
cat .gitignore | grep env
# Çıktıda .env.local görünmeli

# Git tracking'de var mı kontrol et
git ls-files .env.local
# Çıktı boş olmalı — dosya tracked değilse güvenli

# Yanlışlıkla commit edildiyse:
git rm --cached .env.local
git commit -m "fix: remove .env.local from tracking"
```

**Durum:** `.gitignore`'da bulunmalı:
```
.env.local
.env.*.local
```

### Secret Rotation Prosedürü

Bir key sızdığında:
1. **VAPI:** dashboard.vapi.ai → Account → API Keys → Revoke + Create new
2. **Neon:** console.neon.tech → Project → Settings → Reset password
3. **Clerk:** dashboard.clerk.com → API Keys → Revoke + Create new
4. **OpenAI:** platform.openai.com → API Keys → Delete + Create new
5. Vercel'de tüm değerleri güncelle → Redeploy

---

## 2. VAPI Webhook Signature Doğrulama

Şu anda `/api/vapi/call-ended` endpoint'i gelen her POST isteğini kabul ediyor. Bu açık kalabilir. VAPI webhook imzası doğrulamak için:

```typescript
// app/api/vapi/call-ended/route.ts
import crypto from "crypto";

function verifyVapiSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text(); // JSON.parse değil, text olarak al
  
  const signature = req.headers.get("x-vapi-signature");
  const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;
  
  if (webhookSecret && signature) {
    if (!verifyVapiSignature(body, signature, webhookSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  
  const data = JSON.parse(body);
  // ... devam
}
```

**Gerekli:**
```
# .env.local
VAPI_WEBHOOK_SECRET=your_vapi_webhook_secret_here
```

VAPI Dashboard → Assistant → Server URL → Secret field'ından al.

---

## 3. Rate Limiting API Route'larında

Şu anda rate limiting yok. Biri botu ile `/api/vapi/book` endpoint'ine spam yapabilir.

**Basit In-Memory Rate Limiting (Geliştirme):**
```typescript
// lib/rate-limit.ts
const ipCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return true; // OK
  }
  
  if (entry.count >= limit) return false; // Limit aşıldı
  
  entry.count++;
  return true;
}
```

**Vercel için Önerilen:**
[`@upstash/ratelimit`](https://github.com/upstash/ratelimit) + Redis:
```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// app/api/vapi/book/route.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"), // 60 saniyede 10 istek
});

export async function POST(req: NextRequest) {
  const ip = req.ip ?? "unknown";
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json({ error: "Çok fazla istek" }, { status: 429 });
  }
  // ...
}
```

---

## 4. SQL Injection Koruması

**Drizzle ORM parametreli sorgular kullanır — SQL injection riski minimal.**

```typescript
// GÜVENLI — Drizzle ORM parametreli sorgu:
const result = await db
  .select()
  .from(appointments)
  .where(eq(appointments.doctorName, doctorName)); 
// doctorName: "'; DROP TABLE appointments; --" girilse bile güvenli
// Drizzle bunu parametre olarak gönderir: WHERE doctor_name = $1

// UNSAFE — ham string interpolation (KULLANMA):
// db.execute(`SELECT * FROM appointments WHERE doctor_name = '${doctorName}'`)
```

**Kontrol:**
```bash
grep -r "db.execute" app/api/         # Ham SQL kullanımı var mı?
grep -r "sql\`.*\${" app/api/         # Template literal SQL injection riski?
```

---

## 5. CORS Yapılandırması

Admin dashboard aynı domain'de sunuluyor, cross-origin istek gerekmez. Ancak mobil app veya başka domain entegrasyonu için:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.NEXT_PUBLIC_APP_URL ?? "" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};
```

**Production'da VAPI kaynaklı istekler:**
VAPI server-to-server iletişim kurar — CORS etkilemez. Yalnızca browser-based isteklerde CORS header gerekir.

---

## 6. Clerk Authentication — Admin Route Koruması

`middleware.ts` olmadan tüm admin sayfaları herkese açık. Uygulamak için:

```typescript
// middleware.ts (proje kökünde)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/admin(.*)"]);
const isPublicApiRoute = createRouteMatcher(["/api/vapi(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicApiRoute(req)) return; // VAPI'ye geç
  if (isProtectedRoute(req)) await auth.protect(); // Admin'i koru
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg)).*)","/(api|trpc)(.*)"],
};
```

**Test:**
```bash
# Oturumsuz admin erişimi — redirect gelmeli
curl -I http://localhost:3000/admin
# 302 Found → /sign-in

# VAPI route — direkt erişim
curl -X POST http://localhost:3000/api/vapi/availability -d '{"date":"2025-09-11"}'
# 200 OK (auth yok)
```

---

## 7. n8n Webhook Secret Token

Şu anda n8n webhook URL'leri herkes tarafından bilinirse istek gönderilebilir.

**n8n'de Header Auth Ekleme:**
1. n8n → Webhook node → **Authentication** → **Header Auth**
2. Header Name: `X-Webhook-Secret`
3. Header Value: güçlü random string oluştur: `openssl rand -hex 32`

**Next.js'de Secret Gönderme:**
```typescript
// book/route.ts'de n8n çağrısı:
await fetch(`${n8nWebhookUrl}/appointment-created`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET ?? "",
  },
  body: JSON.stringify(newAppointment),
});
```

```
# .env.local
N8N_WEBHOOK_SECRET=your_random_secret_here
```

---

## 8. Neon SSL Modu

Her zaman `?sslmode=require` ile bağlanılmalı:

```
# DOĞRU:
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require

# YANLIŞ (şifreli olmayan bağlantı):
DATABASE_URL=postgresql://user:pass@host.neon.tech/db
```

Neon zaten SSL zorunlu kılar ama `sslmode=require` açık belirtmek iyi pratik.

---

## 9. API Key'lerin Loglanmaması

```typescript
// YAPMA — API key log'a gidiyor:
console.log("Database URL:", process.env.DATABASE_URL);
console.log("Request body:", JSON.stringify(body)); // body'de hassas veri varsa

// YAP — hassas verilen gizle:
console.log("DB bağlantısı başarılı");
console.log("Randevu oluşturuldu, ID:", newAppointment.id);
```

**Vercel'de Log Gizleme:**
Vercel, environment variable değerlerini log'larda otomatik maskelemez. Kod seviyesinde dikkatli olunmalı.

---

## 10. Production vs Development Secrets

```bash
# YANLIŞ — dev key production'da:
CLERK_SECRET_KEY=sk_test_xxx   # "test" içeriyor — production key değil!

# DOĞRU — production'da production key:
CLERK_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
```

Vercel → Settings → Environment Variables:
- `Production` environment için `_live_` key'leri kullan
- `Preview` ve `Development` için `_test_` key'leri kullan

---

## 11. Patient Data Privacy (KVKK/GDPR)

Uygulama hasta adı, telefon numarası ve sağlık bilgisi içerebilir:

- **Transcript verisi:** `/api/vapi/call-ended` tüm konuşmayı kaydediyor. Bu kişisel veri.
- **Telefon numarası:** calls ve appointments tablolarında saklanıyor.
- **Retention:** Kullanılmayan kayıtlar için silme politikası olmalı.

**Minimum Önlemler:**
1. Neon'da veri şifreleme aktif (Neon default şifreli storage kullanıyor)
2. Vercel Log'larında transcript görünmemeli (log'a yazılmıyor — kontrol et)
3. KVKK politikası hazırla, kullanıcıya göster

---

## 12. Dependency Security

```bash
# Güvenlik açığı tara
npm audit

# Kritik açıkları gider
npm audit fix

# Bağımlılıkları güncel tut
npm outdated
```

**Otomatik Güvenlik Taraması:**
GitHub → Repository → Security → **Dependabot alerts** aktif et.

---

## Güvenlik Kontrol Listesi Özeti

| Madde | Durum | Öncelik |
|-------|-------|---------|
| `.env.local` git'te değil | Kontrol et | Kritik |
| `NEXT_PUBLIC_` olmayan key'ler server-side | Uygulandı | Kritik |
| Neon `sslmode=require` | Uygulandı | Kritik |
| Clerk admin route koruması | Uygulanacak | Yüksek |
| VAPI webhook signature doğrulama | Uygulanacak | Yüksek |
| n8n webhook secret token | Uygulanacak | Orta |
| Rate limiting | Uygulanacak | Orta |
| CORS yapılandırması | Gerektiğinde | Düşük |
| SQL injection (Drizzle) | Uygulandı | Kritik |
| Secret rotation prosedürü | Dokümante | Yüksek |
| Dependency security taraması | Periyodik | Orta |
| KVKK/GDPR uyumu | Hazırlanacak | Yüksek |
