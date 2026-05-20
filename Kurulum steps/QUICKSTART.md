# Hızlı Başlangıç — 15 Dakikada Çalıştır

---

## Gereksinimler

- Node.js 20+
- Neon hesabı (console.neon.tech — ücretsiz)

---

## Adımlar

### 1. Repoyu Klonla

```bash
git clone [repo-url] aivoice_demo
cd aivoice_demo
```

### 2. Bağımlılıkları Yükle

```bash
npm install
```

### 3. Environment Dosyasını Oluştur

```bash
cp .env.example .env.local
```

`.env.local` dosyasını düzenle — minimum gereken:

```env
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

**Neon connection string nasıl alınır:**
1. console.neon.tech → Create Project
2. Connection Details → Connection String → Kopyala

Diğer alanlar opsiyonel — temel dashboard çalışması için yalnızca `DATABASE_URL` yeterli.

### 4. Veritabanı Şemasını Oluştur

```bash
npm run db:push
```

Bu komut Neon'da tabloları oluşturur (`appointments`, `calls`, `notifications`).

Alternatif — Neon SQL Editor'de manuel:
```sql
-- drizzle/0000_spooky_mesmero.sql içeriğini kopyalayıp SQL Editor'de çalıştır
```

### 5. (Opsiyonel) Seed Data Ekle

```bash
npm run db:seed
```

Test randevuları ve çağrıları ekler.

### 6. Geliştirme Sunucusunu Başlat

```bash
npm run dev
```

### 7. Admin Dashboard'u Aç

```
http://localhost:3000/admin
```

Dashboard açılıyor ve istatistikler görünüyor → Kurulum başarılı!

---

## Sonraki Adımlar

- VAPI entegrasyonu → [docs/vapi-integration.md](../docs/vapi-integration.md)
- n8n workflow kurulumu → [docs/n8n-workflow.md](../docs/n8n-workflow.md)
- Production deploy → [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md)
- Lokal VAPI testi (ngrok) → [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)

---

## Sık Karşılaşılan Hızlı Sorunlar

| Sorun | Çözüm |
|-------|-------|
| `DATABASE_URL is not set` | `.env.local` oluştur, URL'yi gir |
| `npm run db:push` başarısız | Neon connection string'i kontrol et |
| Dashboard boş açılıyor | DB seed çalıştır: `npm run db:seed` |
| Port 3000 kullanımda | `npm run dev -- -p 3001` |
