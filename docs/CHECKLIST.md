# Klinik AI Call Center — Checklist

## Backend Checklist

- [x] Next.js 15 App Router kurulumu
- [x] Drizzle ORM + Neon bağlantısı (lazy Proxy pattern)
- [x] `export const dynamic = "force-dynamic"` tüm admin sayfalarda
- [x] API routes: /api/vapi/book, cancel, reschedule, availability, doctor-info, call-ended, callback
- [x] /api/health endpoint (DB ping + latency)
- [x] Tüm API routes try/catch ile korumalı
- [x] VAPI toolCallList format uyumlu response yapısı
- [x] .env.example güncel (9 değişken, notification yok)
- [ ] Input validation (Zod) tüm webhook endpoint'lerinde
- [ ] Rate limiting (IP bazlı, /api/vapi/* routes)
- [ ] Duplicate appointment prevention (DB unique constraint)

## Frontend Checklist

- [x] Sidebar: Form Kayıtları ve Arama Listesi kaldırıldı
- [x] Dashboard: maliyet kartı kaldırıldı
- [x] Dashboard: bildirimler bölümü kaldırıldı
- [x] Dashboard: Son Randevular paneli eklendi
- [x] Appointments: 2 durum (Aktif/İptal), Kaynak kolonu kaldırıldı
- [x] Calls: Maliyet kolonu kaldırıldı, audio player eklendi
- [x] Tüm tablolar: boş durum (empty state) ile icon
- [x] Tüm tablolar: DB hatası için amber banner
- [x] Monitoring / Analitik / Sağlık / Audit sayfaları
- [ ] Mobile responsive test (< 768px)
- [ ] Loading skeleton state (Suspense)
- [ ] Doktor sayfası: çalışma saatleri JSONB görselleştirme
- [ ] Hizmetler sayfası: doktor ilişkisi görünümü

## N8N Checklist

- [x] check-appointment-availability workflow
- [x] create-appointment workflow
- [x] cancel-appointment workflow
- [x] reschedule-appointment workflow
- [x] doctor-information workflow
- [x] call-logging workflow
- [x] daily-analytics workflow
- [x] callback-request workflow
- [x] internal-reminder-placeholder workflow
- [x] Tüm workflow'larda WhatsApp/SMS/Email node yok
- [x] Tüm workflow JSON dosyaları /workflows klasöründe
- [ ] Tüm workflow'lar N8N'e import edildi
- [ ] PostgreSQL credential N8N'de tanımlandı
- [ ] Webhook URL'leri VAPI'a eklendi
- [ ] Her workflow uçtan uca test edildi
- [ ] Timeout değerleri ayarlandı (≤ 10s VAPI limiti)

## VAPI Checklist

- [x] Assistant oluşturuldu
- [x] Türkçe sistem prompt yazıldı
- [x] Function tool'ları tanımlandı (checkAvailability, bookAppointment, cancelAppointment, rescheduleAppointment, getDoctorInfo)
- [x] VAPI_ASSISTANT_ID env'e eklendi
- [ ] Her tool için webhook URL'si ayarlandı
- [ ] Türkçe voice seçildi
- [ ] Test çağrısı yapıldı
- [ ] Invalid date / eksik bilgi senaryoları test edildi
- [ ] Fallback response konfigüre edildi
- [ ] Max call duration ayarlandı

## NeonDB Checklist

- [x] Proje oluşturuldu
- [x] DATABASE_URL (pooled) .env'e eklendi
- [x] Tüm tablolar migration ile oluşturuldu
- [x] Migration 0000: temel tablolar
- [x] Migration 0001: eksik kolonlar (ALTER TABLE IF NOT EXISTS)
- [x] Migration 0002: yeni tablolar (doctors, callLogs, aiActions, vb.)
- [x] Migration 0003: gözlemlenebilirlik tabloları
- [x] /drizzle klasörü git'e dahil (.gitignore'dan kaldırıldı)
- [ ] Seed data yüklendi (örnek doktorlar, hizmetler)
- [ ] Index'ler production trafiği için yeterli
- [ ] Connection pool limiti Neon planıyla uyumlu

## Deployment Checklist

- [x] Vercel'e bağlı GitHub repo
- [x] vercel.json: `{ "framework": "nextjs" }` (minimal)
- [x] Tüm env değişkenleri Vercel'e eklendi
- [x] Build başarılı (npm run build ✓)
- [x] TypeScript hataları yok
- [ ] Production URL test edildi
- [ ] /api/health endpoint production'da yanıt veriyor
- [ ] Clerk redirect URL'leri production domain'ine güncellendi
- [ ] N8N webhook URL'leri production domain kullanıyor

## Demo Readiness Checklist

- [ ] Gerçek veya seed doktor verileri DB'de mevcut
- [ ] Test randevusu VAPI çağrısıyla oluşturulabildi
- [ ] Randevu admin panelde görünüyor
- [ ] Randevu iptali VAPI çağrısıyla çalıştı
- [ ] Çağrı kaydı callLogs'a düştü
- [ ] Dashboard istatistikleri güncel
- [ ] Monitoring sayfasında workflow logları var
- [ ] Demo senaryosu script'i hazırlandı
- [ ] Yedek seed data hazırlandı (DB temizlendikten sonra hızlı yükleme için)
- [ ] Ekran paylaşımı için panel tam ekran test edildi
