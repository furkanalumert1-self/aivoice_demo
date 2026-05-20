# Klinik AI Call Center

Klinik AI, sağlık tesisleri için geliştirilmiş sesli yapay zeka destekli çağrı merkezi sistemidir. Hastalar telefon arayarak Türkçe konuşan bir AI asistanıyla randevu alabilir, iptal edebilir veya yeniden planlayabilir. Tüm çağrılar kayıt altına alınır, özetlenir ve admin panelinden takip edilebilir.

---

## Teknoloji Yığını

| Bileşen | Teknoloji | Amaç |
|---------|-----------|-------|
| Frontend + Backend | Next.js 15 (App Router) | Admin dashboard ve API route'ları |
| Sesli AI | VAPI.ai (GPT-4o + ElevenLabs) | Türkçe telefon asistanı |
| Veritabanı | Neon PostgreSQL (Serverless) | Randevu, çağrı ve bildirim kaydı |
| ORM | Drizzle ORM | Type-safe SQL sorguları |
| Auth | Clerk | Admin kullanıcı kimlik doğrulama |
| Otomasyon | n8n Cloud | Bildirim ve iş akışları |
| Deploy | Vercel | Sunucusuz production ortamı |
| CSS | Tailwind CSS + Radix UI | Modern arayüz bileşenleri |

---

## Ön Gereksinimler

- Node.js 20 veya üzeri
- npm 10 veya üzeri
- Git
- Neon PostgreSQL hesabı (ücretsiz tier yeterli)
- VAPI.ai hesabı
- n8n Cloud hesabı (opsiyonel — lokal geliştirme için Docker)
- Clerk hesabı (opsiyonel — auth eklenecekse)
- Vercel hesabı (production deploy için)

---

## Hızlı Başlangıç

Projeyi 15 dakikada ayağa kaldırmak için:

```bash
git clone [repo-url]
cd aivoice_demo
npm install
cp .env.example .env.local
# .env.local içindeki DATABASE_URL'yi Neon'dan doldur
npm run db:push
npm run dev
# http://localhost:3000/admin
```

Detaylı adımlar → [QUICKSTART.md](./QUICKSTART.md)

---

## Mimari Özeti

```
Hasta (Telefon)
    ↓
VAPI AI (GPT-4o + ElevenLabs Türkçe)
    ↓ HTTP Function Call
Next.js API Routes (Vercel)
    ↓ SQL
Neon PostgreSQL
    ↓ Webhook
n8n → Bildirim / WhatsApp
    ↑
Admin Dashboard (Next.js SSR)
```

Detaylı mimari → [../docs/system-architecture.md](../docs/system-architecture.md)

---

## Döküman Haritası

| Döküman | İçerik |
|---------|--------|
| [docs/system-architecture.md](../docs/system-architecture.md) | Sistem mimarisi, veri akışı, production topolojisi |
| [docs/vapi-integration.md](../docs/vapi-integration.md) | VAPI yapılandırması, function tools, webhook payloads |
| [docs/n8n-workflow.md](../docs/n8n-workflow.md) | n8n workflow node'ları, credential kurulumu |
| [docs/backend-api.md](../docs/backend-api.md) | API route referansı, istek/yanıt örnekleri |
| [docs/frontend-flow.md](../docs/frontend-flow.md) | Admin dashboard mimarisi, Server Component pattern |
| [docs/deployment-guide.md](../docs/deployment-guide.md) | Production deployment adımları |
| [docs/env-variables.md](../docs/env-variables.md) | Tüm environment variable'ların açıklaması |
| [docs/debugging.md](../docs/debugging.md) | Sık karşılaşılan problemler ve çözümleri |
| [docs/security-checklist.md](../docs/security-checklist.md) | Güvenlik kontrol listesi |
| [QUICKSTART.md](./QUICKSTART.md) | 15 dakikada çalıştır |
| [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) | Lokal geliştirme ortamı kurulumu |
| [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md) | Production deployment kontrol listesi |
