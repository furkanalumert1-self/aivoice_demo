# Klinik AI Call Center — Sistem Yol Haritası

## Proje Özeti

VAPI sesli AI asistanı → N8N workflow otomasyonu → NeonDB → Next.js admin paneli zincirinden oluşan, kliniğe özel randevu yönetimi ve çağrı merkezi demo sistemi.

---

## Faz 1 — Altyapı Kurulumu ✅

**Hedef:** Temel bileşenlerin çalışır hale getirilmesi

| Görev | Durum |
|---|---|
| NeonDB projesi oluşturma | ✅ |
| Drizzle ORM entegrasyonu | ✅ |
| Next.js 15 App Router kurulumu | ✅ |
| Clerk authentication | ✅ |
| Vercel deployment | ✅ |
| Temel DB şeması (doctors, appointments, callLogs) | ✅ |
| Migration sistemi | ✅ |

**Riskler:** DB bağlantı hatası, Vercel build config hatası  
**Bağımlılıklar:** DATABASE_URL, CLERK keys, Vercel hesabı

---

## Faz 2 — VAPI + N8N Entegrasyonu ✅

**Hedef:** Sesli AI asistanın N8N workflow'larına bağlanması

| Görev | Durum |
|---|---|
| VAPI assistant oluşturma | ✅ |
| VAPI function tool tanımları | ✅ |
| N8N webhook workflow'ları (9 adet) | ✅ |
| check-availability endpoint | ✅ |
| create-appointment endpoint | ✅ |
| cancel-appointment endpoint | ✅ |
| reschedule-appointment endpoint | ✅ |
| doctor-information endpoint | ✅ |
| call-logging endpoint | ✅ |
| Tüm notification referansları kaldırıldı | ✅ |

**Riskler:** VAPI toolCallList format uyumsuzluğu, N8N timeout  
**Bağımlılıklar:** VAPI_API_KEY, VAPI_ASSISTANT_ID, N8N_WEBHOOK_BASE_URL

---

## Faz 3 — Admin Panel ✅

**Hedef:** Canlı veriyle beslenen yönetim paneli

| Görev | Durum |
|---|---|
| Admin layout (sidebar + header) | ✅ |
| Dashboard — özet istatistikler | ✅ |
| Randevu kayıtları | ✅ |
| Çağrı kayıtları | ✅ |
| Doktor / Takvim yönetimi | ✅ |
| Hizmetler yönetimi | ✅ |
| Monitoring sayfası | ✅ |
| Analitik sayfası | ✅ |
| Sistem sağlığı sayfası | ✅ |
| Audit kayıtları sayfası | ✅ |

---

## Faz 4 — Gözlemlenebilirlik Katmanı ✅

**Hedef:** İç olay sistemi (bildirim sistemine alternatif)

| Görev | Durum |
|---|---|
| workflow_logs tablosu | ✅ |
| system_events tablosu | ✅ |
| admin_audit_logs tablosu | ✅ |
| workflow_health tablosu | ✅ |
| /api/health endpoint | ✅ |
| Migration 0003 | ✅ |

---

## Faz 5 — UI/UX Revision ✅

**Hedef:** Demo-odaklı, minimal, modern arayüz

| Görev | Durum |
|---|---|
| Dashboard sadeleştirme (maliyet kartı kaldırıldı) | ✅ |
| Bildirimler bölümü kaldırıldı | ✅ |
| Randevu sayfası: 2 durum (Aktif/İptal) | ✅ |
| Randevu sayfası: Kaynak kolonu kaldırıldı | ✅ |
| Çağrı sayfası: Maliyet kolonu kaldırıldı | ✅ |
| Çağrı sayfası: Audio player eklendi | ✅ |
| Form Kayıtları modülü kaldırıldı | ✅ |
| Arama Listesi modülü kaldırıldı | ✅ |

---

## Faz 6 — Demo Hazırlık (Aktif)

**Hedef:** Canlı demo gösterimine hazır sistem

| Görev | Durum |
|---|---|
| Seed data yükleme (doktorlar, hizmetler) | 🔲 |
| VAPI test çağrısı | 🔲 |
| N8N workflow'larının uçtan uca testi | 🔲 |
| Dashboard canlı veri doğrulaması | 🔲 |
| Mobile responsive kontrol | 🔲 |
| Error state kontrolü | 🔲 |
| Demo senaryoları hazırlama | 🔲 |

---

## Faz 7 — Production Hardening (Opsiyonel)

**Hedef:** Gerçek kullanıma hazır mimari

| Görev | Durum |
|---|---|
| Duplicate booking prevention (DB unique constraint) | 🔲 |
| Concurrent booking lock | 🔲 |
| N8N retry ve timeout konfigürasyonu | 🔲 |
| VAPI interruption handling | 🔲 |
| Rate limiting (API routes) | 🔲 |
| Input validation (Zod) | 🔲 |
| Doctors ↔ Services ilişkisi tamamlanması | 🔲 |

---

## Kritik Bağımlılık Zinciri

```
VAPI (voice call)
  ↓ toolCallList webhook
N8N Workflow
  ↓ PostgreSQL query
NeonDB
  ↓ drizzle select/insert
Next.js Admin Panel
  ↑ force-dynamic server components
```

Herhangi bir halkada kesinti tüm zinciri etkiler.

---

## Riskler ve Azaltma Stratejileri

| Risk | Olasılık | Etki | Azaltma |
|---|---|---|---|
| NeonDB bağlantı limiti | Orta | Yüksek | Pooled connection kullanımı |
| VAPI toolCallList format hatası | Düşük | Yüksek | Dokümantasyonla sabitlendi |
| N8N webhook timeout | Orta | Orta | Respond to Webhook node önce |
| Vercel cold start | Düşük | Düşük | force-dynamic + lazy DB |
| DB şema drift | Düşük | Yüksek | Migration sistemi + drizzle push |
