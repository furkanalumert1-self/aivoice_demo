# Klinik AI Call Center — Kurulum ve Kullanım Rehberi

Bu rehber, sistemi Vercel'de canlıya aldıktan sonra nasıl kullanacağınızı adım adım açıklar.

---

## 0. Veritabanı Migration (İlk Kurulum)

Migration dosyaları `drizzle/` klasöründe bulunur. Production Neon veritabanına uygulamak için **iki yöntem** vardır:

### Yöntem A — Neon SQL Editor (Önerilen)

1. [console.neon.tech](https://console.neon.tech) → Projeniz → **SQL Editor**
2. Tablolar **ilk kez oluşturuluyorsa** `drizzle/0000_spooky_mesmero.sql` içeriğini yapıştırıp çalıştırın.
3. Tablolar zaten varsa ama eksik kolon hatası alıyorsanız `drizzle/0001_add_missing_columns.sql` içeriğini yapıştırıp çalıştırın (tüm ifadeler idempotent — güvenle tekrar çalıştırılabilir).

### Yöntem B — Drizzle Push (Local)

Projeyi local'de çalıştırıyorsanız `.env.local` dosyasına `DATABASE_URL` ekleyip:

```bash
npm run db:push
```

komutuyla schema'yı doğrudan production DB'ye uygulayabilirsiniz.

### Migration Dosyaları

| Dosya | Açıklama |
|---|---|
| `drizzle/0000_spooky_mesmero.sql` | Tüm tabloları sıfırdan oluşturur |
| `drizzle/0001_add_missing_columns.sql` | Eksik kolonları mevcut tablolara ekler (`ADD COLUMN IF NOT EXISTS`) |

### Schema Özeti

```
appointments  — hasta randevuları (id, patient_name, phone, doctor_name, appointment_at, status, source)
calls         — çağrı kayıtları (id, caller_phone, duration_seconds, transcript, summary, cost, outcome, appointment_id, recording_url)
notifications — sistem bildirimleri (id, title, description, is_read)
```

---

## 1. Vercel Dashboard'una Erişim

Projeniz Vercel'e deploy edildikten sonra size özel bir URL oluşturulur:

```
https://aivoice-demo.vercel.app
```

> Vercel panelinden (vercel.com/dashboard) projenizi seçerek güncel URL'yi görebilirsiniz.

Ana sayfa otomatik olarak `/admin` adresine yönlendirir.

---

## 2. Admin Panel Sayfaları

| URL | Açıklama |
|---|---|
| `/admin` | Ana dashboard — metrik kartlar ve son aktivite |
| `/admin/calls` | Tüm çağrı kayıtları tablosu |
| `/admin/calls/[id]` | Çağrı detayı — transcript, özet, maliyet |
| `/admin/appointments` | Randevu listesi ve durum yönetimi |
| `/admin/doctors` | Doktor ve takvim yönetimi |
| `/admin/services` | Klinik hizmetleri |
| `/admin/specialties` | Uzmanlık alanları |
| `/admin/users` | Kullanıcı yönetimi |
| `/admin/call-list` | Giden arama listesi |
| `/admin/forms` | Form kayıtları |

Her sayfaya doğrudan URL girerek veya sol sidebar navigasyondan ulaşabilirsiniz.

---

## 3. Dashboard Arayüzü Kullanımı

### Ana Dashboard (`/admin`)
- Üst kısımdaki **metrik kartlar** bugünkü çağrı sayısını, AI tarafından alınan randevuları, ortalama görüşme süresini ve toplam maliyeti gösterir.
- Kartlar sayfayı yeniledikçe veritabanındaki gerçek verilerle güncellenir.

### Çağrı Kayıtları (`/admin/calls`)
- Tabloda her çağrının telefon numarası, tarihi, süresi, AI özeti ve maliyeti görünür.
- **Transkript İndir** butonuyla tam konuşma metnini indirebilirsiniz.
- **Randevuya Git** butonu ilgili randevu kaydına yönlendirir.

### Randevular (`/admin/appointments`)
- Randevu durumu renkli rozetlerle gösterilir:
  - 🟢 **Onaylandı** — yeşil
  - 🟡 **Bekliyor** — sarı
  - 🔴 **İptal** — kırmızı
  - 🔵 **Tamamlandı** — mavi
- Durumu dropdown menüden değiştirebilirsiniz.

---

## 4. Neon Veritabanı Kayıtlarını Doğrulama

1. [console.neon.tech](https://console.neon.tech) adresine gidin.
2. `klinik-ai-demo` projesini seçin.
3. Sol menüden **SQL Editor**'ü açın.
4. Aşağıdaki sorguları çalıştırarak kayıtları kontrol edin:

```sql
-- Son 10 çağrıyı göster
SELECT * FROM calls ORDER BY created_at DESC LIMIT 10;

-- Son 10 randevuyu göster
SELECT * FROM appointments ORDER BY created_at DESC LIMIT 10;

-- Bugünkü çağrı sayısı
SELECT COUNT(*) FROM calls WHERE created_at::date = CURRENT_DATE;

-- Okunmamış bildirimler
SELECT * FROM notifications WHERE is_read = false;
```

---

## 5. VAPI Asistanını Production API Route'larına Bağlama

1. [dashboard.vapi.ai](https://dashboard.vapi.ai) adresine gidin.
2. **Assistants** bölümünden `Klinik AI Assistant`'ı seçin.
3. **Functions** sekmesine geçin.
4. Her fonksiyon için **Server URL** alanını production URL'nizle güncelleyin:

| Fonksiyon | URL |
|---|---|
| `check_availability` | `https://aivoice-demo.vercel.app/api/vapi/availability` |
| `book_appointment` | `https://aivoice-demo.vercel.app/api/vapi/book` |
| `cancel_appointment` | `https://aivoice-demo.vercel.app/api/vapi/cancel` |
| `reschedule_appointment` | `https://aivoice-demo.vercel.app/api/vapi/reschedule` |

5. **Call Ended Webhook** için şu URL'yi girin:
   ```
   https://aivoice-demo.vercel.app/api/vapi/call-ended
   ```
6. **Save** butonuna tıklayın ve bir test çağrısı başlatın.

---

## 6. n8n Production Webhook'larını Yapılandırma

1. [app.n8n.cloud](https://app.n8n.cloud) hesabınıza giriş yapın.
2. Her workflow için webhook URL'lerini kopyalayın (format: `https://xxxx.n8n.cloud/webhook/...`).
3. Vercel projenizin **Environment Variables** bölümüne gidin.
4. `N8N_WEBHOOK_URL` değişkenini production n8n adresinizle güncelleyin:
   ```
   N8N_WEBHOOK_URL=https://xxxx.n8n.cloud/webhook
   ```
5. Vercel'de değişikliği kaydedin ve **Redeploy** yapın.

---

## 7. n8n Workflow'larını Import Etme

Proje kökündeki `/workflows` klasöründe 4 adet hazır JSON dosyası bulunur.

**Import adımları:**

1. n8n dashboard'unda sol menüden **Workflows**'a gidin.
2. Sağ üstten **Import from file** butonuna tıklayın.
3. Sırayla şu dosyaları import edin:

| Dosya | Açıklama |
|---|---|
| `appointment-created.json` | Yeni randevu → bildirim + WhatsApp (mock) |
| `appointment-cancelled.json` | İptal → durum güncelleme + admin bildirimi |
| `appointment-reminder.json` | Cron → yarınki randevulara hatırlatıcı |
| `call-summary.json` | Çağrı bitti → GPT özet → DB kaydı |

4. Her workflow'u import ettikten sonra **Activate** (aktif) konumuna getirin.
5. `call-summary.json` workflow'unda **OpenAI credentials** bölümüne API anahtarınızı girin.
6. Postgres node'larında **Neon PostgreSQL** credentials'ını `DATABASE_URL` ile yapılandırın.

---

## 8. Fonksiyonları Test Etme

### Randevu Alma Testi
```bash
curl -X POST https://aivoice-demo.vercel.app/api/vapi/book \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "toolCallList": [{
        "id": "test-1",
        "function": {
          "name": "book_appointment",
          "arguments": "{\"patientName\":\"Ahmet Yılmaz\",\"phone\":\"05301234567\",\"doctorName\":\"Dr. Ayşe Kaya\",\"appointmentAt\":\"2025-09-10T10:00:00\"}"
        }
      }]
    }
  }'
```

### Randevu İptal Testi
```bash
curl -X POST https://aivoice-demo.vercel.app/api/vapi/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "toolCallList": [{
        "id": "test-2",
        "function": {
          "name": "cancel_appointment",
          "arguments": "{\"phone\":\"05301234567\"}"
        }
      }]
    }
  }'
```

### Transcript Kayıt Testi
```bash
curl -X POST https://aivoice-demo.vercel.app/api/vapi/call-ended \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "type": "end-of-call-report",
      "call": {"id": "test-call-001"},
      "transcript": "Hasta: Randevu almak istiyorum. Asistan: Sizi yönlendiriyorum.",
      "durationSeconds": 120,
      "cost": 0.05,
      "recordingUrl": ""
    }
  }'
```

Test sonrası `/admin/calls` sayfasını açarak yeni kaydın geldiğini doğrulayın.

---

## 9. Hata İzleme ve Monitoring

### Vercel Fonksiyon Logları
1. [vercel.com/dashboard](https://vercel.com/dashboard) → Projenizi seçin.
2. **Logs** sekmesine gidin.
3. **Function Logs** filtresini seçin.
4. `/api/vapi/*` route'larına gelen istekleri ve hata mesajlarını buradan görebilirsiniz.

### VAPI Hata İzleme
1. VAPI dashboard → **Calls** bölümüne gidin.
2. Başarısız çağrıları kırmızı ile işaretlenmiş görürsünüz.
3. Çağrıya tıklayarak **Function Calls** sekmesinden hangi fonksiyonun hata verdiğini inceleyin.
4. **Error** alanı genellikle HTTP durum kodu veya timeout mesajı içerir.

### n8n Execution Logları
1. n8n → İlgili workflow'u açın.
2. Sol alttaki **Executions** butonuna tıklayın.
3. Başarısız execution'lar kırmızı ile gösterilir.
4. Üzerine tıklayarak hangi node'un hata verdiğini ve hata detayını görebilirsiniz.

### Neon Veritabanı Bağlantı Hatası
Eğer API route'lardan `DATABASE_URL is not set` hatası geliyorsa:
1. Vercel → **Settings** → **Environment Variables** bölümünü kontrol edin.
2. `DATABASE_URL` değişkeninin `Production` ortamı için tanımlı olduğundan emin olun.
3. Değişiklikten sonra **Redeploy** yapın.

---

## 10. Otomatik Yeniden Deploy (GitHub → Vercel)

Vercel, GitHub entegrasyonu sayesinde her commit'i otomatik olarak deploy eder:

```
Siz kod yazarsınız
     ↓
git commit + git push
     ↓
GitHub repository güncellenir
     ↓
Vercel webhook tetiklenir (otomatik)
     ↓
Yeni build başlar (~1-2 dakika)
     ↓
Production URL güncellenir
```

**Nasıl takip edersiniz:**
1. Vercel dashboard → Projeniz → **Deployments** sekmesi.
2. Her push için yeni bir satır oluşur: building → ready veya error.
3. Hatalı build'de size e-posta bildirimi gelir.

**Branch kuralı:**
- `main` branch'e push → production deploy
- Diğer branch'ler → preview URL oluşturur (test için kullanışlı)

---

## Demo Kullanıcısı

```
Email: demo@klinikai.com
Şifre: Demo123*
```

---

## Hızlı Kontrol Listesi

Deploy sonrası her şeyin çalıştığını doğrulamak için:

- [ ] `/admin` açılıyor ve metrik kartlar görünüyor
- [ ] `/admin/calls` tablosu yükleniyor
- [ ] `/admin/appointments` randevuları gösteriyor
- [ ] `curl` ile `/api/vapi/book` çağrısı 200 dönüyor
- [ ] Neon SQL Editor'de yeni kayıt görünüyor
- [ ] VAPI test çağrısı `/api/vapi/call-ended`'i tetikliyor
- [ ] n8n workflow'ları aktif ve execution logları temiz
