# Lokal Geliştirme Ortamı Kurulumu

> VAPI webhook testleri, n8n lokal kurulumu ve tam geliştirme ortamı.

---

## Gereksinimler

| Araç | Sürüm | Kurulum |
|------|-------|---------|
| Node.js | >= 20.0.0 | [nodejs.org](https://nodejs.org) veya `nvm install 20` |
| npm | >= 10 | Node.js ile geliyor |
| Git | Herhangi | [git-scm.com](https://git-scm.com) |
| ngrok (VAPI için) | Herhangi | [ngrok.com](https://ngrok.com/download) |
| Docker (n8n için) | >= 24 | [docker.com](https://docker.com) |

---

## Adım 1: Node.js Kurulumu

```bash
# nvm ile (önerilen)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
node --version  # v20.x.x görünmeli

# Veya direkt nodejs.org'dan indir
```

---

## Adım 2: Projeyi Klonla ve Bağımlılıkları Yükle

```bash
git clone [repo-url] aivoice_demo
cd aivoice_demo
npm install

# Kurulum tamamlandı mı kontrol et
node_modules/.bin/next --version  # Next.js sürümü görünmeli
```

---

## Adım 3: Neon Ücretsiz Tier Database

1. `https://console.neon.tech` → **Sign Up** (GitHub ile)
2. **New Project** → `klinik-ai-local`
3. **Connection Details** → **Connection String** kopyala

`.env.local` oluştur:
```bash
cp .env.example .env.local
```

`.env.local` içeriği:
```env
DATABASE_URL=postgresql://klinik_owner:password@ep-xxxx.neon.tech/klinikdb?sslmode=require
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Adım 4: Database Schema Oluştur

```bash
# Drizzle schema'yı Neon'a push et
npm run db:push

# Çıktı:
# [✓] appointments
# [✓] calls
# [✓] notifications

# (Opsiyonel) Test verisi ekle
npm run db:seed
```

**db:push vs db:migrate farkı:**
- `db:push`: Schema'yı direkt günceller, migration dosyası oluşturmaz. Geliştirme için hızlı.
- `db:migrate`: Migration dosyalarını sırayla çalıştırır. Production için güvenli.

**Diğer DB komutları:**
```bash
npm run db:generate   # Schema'dan migration dosyası oluştur
npm run db:studio     # Drizzle Studio GUI (http://local.drizzle.studio)
```

---

## Adım 5: Clerk Local Kurulumu (Auth istiyorsan)

1. `https://clerk.com` → Sign Up → Create Application
2. **Development** ortamı için API key al:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
   CLERK_SECRET_KEY=sk_test_xxxx
   ```
3. Clerk Dashboard → Settings → **Allowed origins** → `http://localhost:3000` ekle

`middleware.ts` oluştur (proje kökünde):
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/api/vapi(.*)", "/sign-in(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(html?|css|js)).*)", "/(api|trpc)(.*)"],
};
```

---

## Adım 6: Geliştirme Sunucusunu Başlat

```bash
npm run dev

# Çıktı:
# ▲ Next.js 15.x.x
# Local:        http://localhost:3000
# ✓ Ready in 2.1s
```

**http://localhost:3000/admin** → Dashboard açılıyor

---

## Adım 7: VAPI Webhook Testleri — ngrok

VAPI'nin function call'larını local'e yönlendirmek için ngrok gerekli.

### ngrok Kurulumu
```bash
# Homebrew (macOS)
brew install ngrok/ngrok/ngrok

# Linux
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Hesap oluştur, auth token al: ngrok.com/dashboard
ngrok config add-authtoken [token]
```

### ngrok Tüneli Başlat

```bash
# Yeni terminal penceresi aç
ngrok http 3000

# Çıktı:
# Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```

### VAPI Dashboard'u Güncelle

1. VAPI → Assistant → Tools → Her tool'un Server URL'ini güncelle:
   ```
   https://abc123.ngrok-free.app/api/vapi/availability
   https://abc123.ngrok-free.app/api/vapi/book
   https://abc123.ngrok-free.app/api/vapi/cancel
   https://abc123.ngrok-free.app/api/vapi/reschedule
   ```
2. VAPI → Assistant → Server URL:
   ```
   https://abc123.ngrok-free.app/api/vapi/call-ended
   ```

**Dikkat:** ngrok ücretsiz tier'ında URL her başlatmada değişir. Static domain için ngrok Pro veya [localtunnel](https://theboroer.github.io/localtunnel/) alternatif.

### VAPI Function Call Simülasyonu (curl)

```bash
# Müsaitlik kontrolü test
curl -X POST http://localhost:3000/api/vapi/availability \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "toolCallList": [{
        "id": "test_001",
        "function": {
          "name": "check_availability",
          "parameters": {"doctorName": "Dr. Test", "date": "2025-09-15"}
        }
      }]
    }
  }'

# Randevu oluşturma test
curl -X POST http://localhost:3000/api/vapi/book \
  -H "Content-Type: application/json" \
  -d '{"patientName":"Test Hasta","phone":"05001234567","date":"2025-09-15","time":"10:00"}'

# Call-ended webhook simülasyonu
curl -X POST http://localhost:3000/api/vapi/call-ended \
  -H "Content-Type: application/json" \
  -d '{
    "type": "end-of-call-report",
    "call": {
      "id": "local_test_001",
      "customer": {"number": "+905301234567"},
      "startedAt": "2025-09-11T10:00:00Z",
      "endedAt": "2025-09-11T10:03:00Z",
      "cost": 0.012,
      "artifact": {"transcript": "Test transkripti", "recordingUrl": null},
      "analysis": {"summary": "Test çağrısı"}
    }
  }'
```

---

## Adım 8: n8n Lokal Kurulumu — Docker

```bash
# Docker ile n8n başlat
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Tarayıcıda aç
open http://localhost:5678
```

**İlk kurulumda:** kullanıcı adı/şifre oluşturmanı isteyecek.

### n8n Workflow Import

1. n8n → Workflows → + New Workflow → Import from File
2. `/workflows/appointment-created.json` → Import
3. Diğer 3 workflow için tekrarla

### n8n'de Neon Credential

```
Settings → Credentials → + Add → PostgreSQL
Host: [Neon host]
Port: 5432
Database: [Neon DB adı]
User: [Neon kullanıcı]
Password: [Neon şifre]
SSL: require
```

### Local n8n Webhook URL

`.env.local`'de:
```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

**Not:** n8n ve Next.js farklı container/process'te. n8n webhook URL'si n8n'in dinlediği port.

---

## Adım 9: VS Code Uzantıları (Önerilen)

```json
// .vscode/extensions.json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",        // Tailwind IntelliSense
    "esbenp.prettier-vscode",           // Kod formatlama
    "dbaeumer.vscode-eslint",           // ESLint
    "ms-vscode.vscode-typescript-next", // TypeScript dil servisi
    "Prisma.prisma",                     // Drizzle ORM (syntax highlight)
    "rangav.vscode-thunder-client",     // API test (curl alternatifi)
    "christian-kohler.path-intellisense" // Path completion
  ]
}
```

---

## npm Script Referansı

| Komut | Ne Yapar |
|-------|----------|
| `npm run dev` | Geliştirme sunucusu (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Production sunucu |
| `npm run lint` | ESLint çalıştır |
| `npm run db:generate` | Schema'dan migration dosyası oluştur |
| `npm run db:migrate` | Migration'ları çalıştır |
| `npm run db:push` | Schema'yı direkt DB'ye push et (dev için) |
| `npm run db:seed` | Test verisi ekle |
| `npm run db:studio` | Drizzle Studio GUI aç |

---

## Lokal Geliştirme Akışı Özeti

```
Terminal 1: npm run dev        → Next.js (localhost:3000)
Terminal 2: ngrok http 3000    → VAPI webhooks için tünel
Terminal 3: docker run n8n     → n8n (localhost:5678)
Tarayıcı:   localhost:3000/admin → Admin dashboard
Tarayıcı:   localhost:5678     → n8n editor
```
