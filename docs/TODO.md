# Klinik AI Call Center — Görev Listesi

## 🔴 Critical (Demo engelleyici)

- [ ] **Seed data yükle** — `db/seed.ts` çalıştır: en az 3 doktor, 4 hizmet, çalışma saatleri
- [ ] **N8N workflow'larını import et** — `/workflows/*.json` dosyalarını N8N'e aktar
- [ ] **N8N PostgreSQL credential** — NeonDB bağlantı stringini N8N'e ekle
- [ ] **VAPI webhook URL'lerini ayarla** — Her function tool için N8N webhook URL'si gir
- [ ] **Uçtan uca test** — VAPI → N8N → DB → Panel akışını gerçek çağrıyla doğrula

## 🟠 High (Demo kalitesi için gerekli)

- [ ] **Türkçe VAPI voice** — Assistant'a Türkçe ses modeli ata
- [ ] **DB şeması production'da uygula** — Neon Console'da tüm migration SQL'lerini çalıştır
- [ ] **Mobile responsive kontrol** — Tablet/mobil görünümü test et ve düzelt
- [ ] **Doktor çalışma saatleri görselleştirme** — `workingHours` JSONB'yi admin panelde okunabilir göster
- [ ] **Hizmetler ↔ Doktor ilişkisi** — Services sayfasına doctor listesi ekle
- [ ] **N8N timeout ayarı** — Tüm workflow'larda VAPI'nin 10s limitini aşmayacak şekilde yapılandır

## 🟡 Medium (Sağlamlık için)

- [ ] **Input validation** — Zod ile /api/vapi/* endpoint'lerinde payload doğrulama
- [ ] **Duplicate booking önleme** — appointments tablosuna (doctor_id, date, time) unique constraint
- [ ] **Çağrı detay sayfası** — /admin/calls/[id] sayfasını transcript gösterimle güncelle
- [ ] **Loading skeleton** — Admin sayfaları için Suspense + skeleton component
- [ ] **Doctors sayfası yenileme** — Doktor ekleme/düzenleme formu (şu an sadece listeleme)
- [ ] **Services sayfası yenileme** — Hizmet ekleme/düzenleme formu
- [ ] **workingHours JSON schema** — JSONB için TypeScript tipi ve N8N'de parsing

## 🟢 Low (Nice-to-have)

- [ ] **Rate limiting** — /api/vapi/* routes için IP bazlı limit (örn. 10 req/dk)
- [ ] **Callıback request yönetimi** — callbackRequests tablosu için admin sayfası
- [ ] **Arama filtreleme** — Çağrı ve randevu tablolarında tarih/durum filtresi
- [ ] **CSV export** — Randevu ve çağrı kayıtları için dışa aktarma
- [ ] **Sistem ayarları sayfası** — clinicSettings tablosu için UI
- [ ] **Uzmanlık alanları** — specialties sayfasını DB'ye bağla (şu an statik)
- [ ] **Kullanıcı yönetimi** — Clerk Dashboard yerine admin panel entegrasyonu
- [ ] **Dark mode** — Tailwind dark: prefix ile tema desteği

---

## Tamamlanan Görevler ✅

- [x] Proje altyapısı (Next.js 15, Drizzle, Neon, Clerk, Vercel)
- [x] VAPI function tool şemaları
- [x] 9 N8N workflow JSON dosyası (notification-free)
- [x] Tüm DB tabloları ve migration'lar (0000–0003)
- [x] Admin panel (sidebar, layout, tüm sayfalar)
- [x] Gözlemlenebilirlik katmanı (workflow_logs, system_events, audit_logs)
- [x] Dashboard sadeleştirme (maliyet ve bildirimler kaldırıldı)
- [x] Randevu sayfası: 2 durum, gereksiz kolonlar kaldırıldı
- [x] Çağrı sayfası: maliyet kaldırıldı, audio player eklendi
- [x] Form Kayıtları ve Arama Listesi modülleri kaldırıldı
- [x] Kapsamlı dokümantasyon (setup, n8n, vapi, neon, testing)
