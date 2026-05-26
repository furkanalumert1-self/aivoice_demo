# VAPI Kurulum ve Konfigürasyon Kılavuzu

Bu kılavuz, Klinik AI Call Center sistemindeki VAPI assistant'ını sıfırdan kurmak için gereken tüm adımları içerir. İlk kez VAPI kullananlar için ekran ekran açıklanmıştır.

---

## Gereksinimler

- [VAPI](https://vapi.ai) hesabı (dashboard.vapi.ai)
- Deploy edilmiş N8N instance (workflow URL'leri hazır olmalı)
- Vercel'e deploy edilmiş Next.js uygulaması (`NEXT_PUBLIC_APP_URL` hazır)

---

## 1. Assistant Oluşturma

### Adım 1 — Dashboard'a Giriş

1. [dashboard.vapi.ai](https://dashboard.vapi.ai) adresine gidin
2. Hesabınıza giriş yapın
3. Sol menüden **Assistants** seçin
4. Sağ üst köşeden **+ Create Assistant** butonuna tıklayın

---

### Adım 2 — Temel Ayarlar

**Name alanına** şunu girin:
```
Klinik AI Asistan
```

**Model alanı:**
- Provider: `OpenAI`
- Model: `gpt-4o` (önerilir) veya `gpt-4o-mini` (düşük maliyet)
- Temperature: `0.3` (tutarlı, az yaratıcı — klinik için ideal)
- Max Tokens: `500`

---

### Adım 3 — Voice (Ses) Ayarı

Sol paneldeki **Voice** sekmesine tıklayın:

| Alan | Değer |
|---|---|
| **Provider** | `ElevenLabs` veya `Azure` |
| **Voice** | Türkçe ses için: ElevenLabs → `Hana` veya Azure → `tr-TR-AhmetNeural` |
| **Speed** | `0.95` (hafif yavaş — netlik için) |
| **Stability** | `0.6` |

> **ÖNEMLİ:** Türkçe ses modeli seçmek, assistant'ın Türkçe kelimelerini doğru telaffuz etmesini sağlar.

---

### Adım 4 — System Prompt

**Transcriber → Language** alanını `tr-TR` (Türkçe) olarak ayarlayın.

**Model → System Prompt** alanına şunu yapıştırın:

```
Sen Klinik AI'nın Türkçe konuşan randevu asistanısın.

Görevin:
- Hastalara randevu almalarında yardımcı olmak
- Randevu iptal veya taşıma işlemlerini gerçekleştirmek
- Doktor ve klinik hakkında bilgi vermek
- Geri arama taleplerini kaydetmek

Kurallar:
- Her zaman kibarca ve profesyonelce konuş
- Türkçe konuş, başka dil kullanma
- Randevu için: hasta adı, telefon, doktor adı, tarih ve saat bilgisi al
- Belirsiz tarihleri (yarın, hafta sonu) net tarihe çevir (YYYY-MM-DD formatı)
- Onay almadan randevu oluşturma veya iptal etme
- Bilmediğin bir şey sorulursa dürüstçe söyle

Çalışma saatleri: Pazartesi-Cuma 09:00-18:00

Randevu oluştururken şunları mutlaka al:
1. Hasta adı soyadı
2. Telefon numarası
3. Hangi doktor veya uzmanlık alanı
4. Tercih edilen tarih
5. Tercih edilen saat

Randevu onaylamadan önce tüm bilgileri hastaya tekrarla ve onay al.
```

---

### Adım 5 — Response ve Interruption Ayarları

**Advanced** sekmesine tıklayın:

| Alan | Değer | Açıklama |
|---|---|---|
| **Interruption Threshold** | `100ms` | Hastanın sözünü kesmesine izin verme süresi |
| **Background Denoising** | ✅ Açık | Arka plan gürültüsünü filtreler |
| **End Call Phrases** | `güle güle, hoşça kal, görüşürüz` | Bu kelimelerde çağrıyı bitirir |
| **Max Call Duration** | `600` (saniye) | 10 dakika maksimum çağrı süresi |
| **Silence Timeout** | `30` (saniye) | 30 saniye sessizlik = çağrı biter |

---

## 2. Tool Ekleme

### Genel Adımlar (Her Tool için Tekrarlayın)

1. Assistant sayfasında **Tools** sekmesine tıklayın
2. **+ Add Tool** butonuna tıklayın
3. **"Function"** tipini seçin
4. Aşağıdaki tablolara göre alanları doldurun

---

### Tool 1: checkAppointmentAvailability

| Alan | Değer |
|---|---|
| **Name** | `checkAppointmentAvailability` |
| **Description** | `Belirtilen doktorun belirtilen tarih ve saatte müsait olup olmadığını kontrol eder. Çakışan randevular varsa alternatif saatler önerir.` |
| **Server URL** | `https://YOUR-N8N-DOMAIN/webhook/check-availability` |
| **Method** | `POST` |
| **Timeout** | `8000` (ms) |

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "doctorName": {
      "type": "string",
      "description": "Müsaitliği kontrol edilecek doktorun adı. Örnek: Dr. Ayşe Kaya"
    },
    "preferredDate": {
      "type": "string",
      "description": "Kontrol edilecek tarih, YYYY-MM-DD formatında. Örnek: 2025-09-15"
    },
    "preferredTime": {
      "type": "string",
      "description": "Tercih edilen saat, HH:MM formatında. Örnek: 10:00. İsteğe bağlı."
    }
  },
  "required": ["doctorName", "preferredDate"]
}
```

---

### Tool 2: createAppointment

| Alan | Değer |
|---|---|
| **Name** | `createAppointment` |
| **Description** | `Hasta için randevu oluşturur. Hasta adı, telefon, doktor adı, tarih ve saat bilgisi gereklidir. Önce checkAppointmentAvailability ile müsaitlik kontrolü yapılmalıdır.` |
| **Server URL** | `https://YOUR-N8N-DOMAIN/webhook/create-appointment` |
| **Method** | `POST` |
| **Timeout** | `8000` (ms) |

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "patientName": {
      "type": "string",
      "description": "Hastanın adı ve soyadı. Örnek: Ali Veli"
    },
    "phone": {
      "type": "string",
      "description": "Hastanın telefon numarası. Örnek: 05551234567"
    },
    "doctorName": {
      "type": "string",
      "description": "Randevu alınacak doktorun tam adı. Örnek: Dr. Ayşe Kaya"
    },
    "appointmentDate": {
      "type": "string",
      "description": "Randevu tarihi YYYY-MM-DD formatında. Örnek: 2025-09-15"
    },
    "appointmentTime": {
      "type": "string",
      "description": "Randevu saati HH:MM formatında. Örnek: 10:00"
    },
    "notes": {
      "type": "string",
      "description": "Randevuya ait ek notlar. İsteğe bağlı."
    }
  },
  "required": ["patientName", "phone", "doctorName", "appointmentDate", "appointmentTime"]
}
```

---

### Tool 3: cancelAppointment

| Alan | Değer |
|---|---|
| **Name** | `cancelAppointment` |
| **Description** | `Hastanın aktif randevusunu iptal eder. Hasta telefon numarası veya adı ile arama yapılır.` |
| **Server URL** | `https://YOUR-N8N-DOMAIN/webhook/cancel-appointment` |
| **Method** | `POST` |
| **Timeout** | `8000` (ms) |

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "phone": {
      "type": "string",
      "description": "Hastanın telefon numarası. Randevu bu numara ile aranır. Örnek: 05551234567"
    },
    "patientName": {
      "type": "string",
      "description": "Hastanın adı soyadı. Telefon yoksa bu alan ile arama yapılır."
    },
    "appointmentDate": {
      "type": "string",
      "description": "İptal edilecek randevunun tarihi YYYY-MM-DD formatında. İsteğe bağlı, birden fazla randevu varsa belirtilmesi önerilir."
    }
  }
}
```

> **Not:** `phone` veya `patientName` alanlarından en az biri dolu olmalıdır. N8N workflow bunu doğrular.

---

### Tool 4: rescheduleAppointment

| Alan | Değer |
|---|---|
| **Name** | `rescheduleAppointment` |
| **Description** | `Hastanın mevcut randevusunu yeni bir tarih ve saate taşır. Yeni slotun müsait olup olmadığını otomatik kontrol eder.` |
| **Server URL** | `https://YOUR-N8N-DOMAIN/webhook/reschedule-appointment` |
| **Method** | `POST` |
| **Timeout** | `8000` (ms) |

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "phone": {
      "type": "string",
      "description": "Hastanın telefon numarası. Örnek: 05551234567"
    },
    "patientName": {
      "type": "string",
      "description": "Hastanın adı soyadı."
    },
    "newDate": {
      "type": "string",
      "description": "Yeni randevu tarihi YYYY-MM-DD formatında. Örnek: 2025-09-20"
    },
    "newTime": {
      "type": "string",
      "description": "Yeni randevu saati HH:MM formatında. Örnek: 14:00"
    }
  },
  "required": ["newDate", "newTime"]
}
```

---

### Tool 5: getDoctorInformation

| Alan | Değer |
|---|---|
| **Name** | `getDoctorInformation` |
| **Description** | `Klinikteki doktorlar hakkında bilgi verir. Uzmanlık alanı veya doktor adına göre arama yapılabilir. Çalışma günleri ve saatlerini içerir.` |
| **Server URL** | `https://YOUR-N8N-DOMAIN/webhook/doctor-information` |
| **Method** | `POST` |
| **Timeout** | `8000` (ms) |

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "doctorName": {
      "type": "string",
      "description": "Aranacak doktorun adı veya adının bir kısmı. İsteğe bağlı. Örnek: Ayşe"
    },
    "specialization": {
      "type": "string",
      "description": "Uzmanlık alanı. İsteğe bağlı. Örnek: Kardiyoloji, Dahiliye, Ortopedi"
    }
  }
}
```

---

### Tool 6: createCallbackRequest

| Alan | Değer |
|---|---|
| **Name** | `createCallbackRequest` |
| **Description** | `Hasta geri arama talep ettiğinde bu bilgileri kaydeder. Admin panelinde bekleyen görev olarak görünür.` |
| **Server URL** | `https://YOUR-N8N-DOMAIN/webhook/callback-request` |
| **Method** | `POST` |
| **Timeout** | `8000` (ms) |

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "phone": {
      "type": "string",
      "description": "Geri arama yapılacak telefon numarası. Örnek: 05551234567"
    },
    "patientName": {
      "type": "string",
      "description": "Hastanın adı soyadı. İsteğe bağlı."
    },
    "reason": {
      "type": "string",
      "description": "Geri aramanın nedeni. İsteğe bağlı. Örnek: Randevu bilgisi almak istiyorum"
    }
  },
  "required": ["phone"]
}
```

---

## 3. Webhook URL Mapping

Her VAPI tool'u ilgili N8N webhook'una bağlanır. N8N'de workflow'u aktif ettikten sonra Production URL'yi alın.

| VAPI Tool | N8N Webhook Path | Tam URL Formatı |
|---|---|---|
| `checkAppointmentAvailability` | `/webhook/check-availability` | `https://YOUR-N8N/webhook/check-availability` |
| `createAppointment` | `/webhook/create-appointment` | `https://YOUR-N8N/webhook/create-appointment` |
| `cancelAppointment` | `/webhook/cancel-appointment` | `https://YOUR-N8N/webhook/cancel-appointment` |
| `rescheduleAppointment` | `/webhook/reschedule-appointment` | `https://YOUR-N8N/webhook/reschedule-appointment` |
| `getDoctorInformation` | `/webhook/doctor-information` | `https://YOUR-N8N/webhook/doctor-information` |
| `createCallbackRequest` | `/webhook/callback-request` | `https://YOUR-N8N/webhook/callback-request` |

> **NOT:** `YOUR-N8N` yerine kendi N8N domain adresinizi yazın.  
> Örnek: `https://n8n.yourcompany.com/webhook/check-availability`

---

## 4. Timeout ve Retry Ayarları

### VAPI Tarafında (Her Tool için):

| Ayar | Önerilen Değer | Açıklama |
|---|---|---|
| **Timeout** | `8000 ms` | N8N'in cevap vermesi için verilen süre |
| **Retries** | `1` | Başarısız olursa 1 kez daha dene |

> **Neden 8000ms?** VAPI'nin genel tool call timeout'u 10 saniyedir. N8N Postgres sorgusuna da pay bırakmak için 8 saniye kullanıyoruz.

### N8N Tarafında (Workflow Settings):

1. Her workflow'u açın
2. Sağ üst köşe → **...** → **Settings**
3. Şu ayarları yapın:

| Ayar | Değer |
|---|---|
| **Save Manual Executions** | ✅ Açık |
| **Timezone** | `Europe/Istanbul` |
| **On Error** | `Stop Workflow` |

### Fallback Davranışı

Tool timeout olduğunda VAPI otomatik olarak şu mesajı söyler:
```
Üzgünüm, şu an bu işlemi gerçekleştiremiyorum. 
Lütfen daha sonra tekrar arayın veya geri arama talebinde bulunun.
```

Bu fallback mesajını özelleştirmek için: Assistant → **Advanced → Fallback Message** alanını doldurun.

---

## 5. End-of-Call Report (Çağrı Sonu Raporu)

VAPI her çağrı bittiğinde otomatik olarak bir webhook gönderir. Bu webhook çağrı özetini, transkripti, süreyi ve kayıt URL'sini içerir.

### Adım 1 — Server URL Ayarı

1. Assistant sayfasında **Advanced** sekmesine gidin
2. **Server URL** alanına şunu girin:
```
https://YOUR-VERCEL-APP.vercel.app/api/vapi/call-ended
```

> Bu URL Next.js uygulamanızdaki `/app/api/vapi/call-ended/route.ts` dosyasını çalıştırır.

### Adım 2 — Server Messages

**Server Messages** alanında şunların seçili olduğundan emin olun:

- ✅ `end-of-call-report`
- ✅ `status-update` (opsiyonel, debug için faydalı)

### Çağrı Sonu Verisi

`/api/vapi/call-ended` endpoint'i şu verileri işler ve `call_logs` tablosuna kaydeder:

| VAPI Alanı | DB Kolonu | Açıklama |
|---|---|---|
| `call.id` | `vapi_call_id` | VAPI çağrı kimliği (unique) |
| `call.customer.number` | `caller_number` | Arayan numara |
| `artifact.transcript` | `transcript` | Tam konuşma metni |
| `analysis.summary` | `summary` | AI tarafından oluşturulan özet |
| `startedAt` - `endedAt` farkı | `duration` | Çağrı süresi (saniye) |
| `artifact.recordingUrl` | `recording_url` | Ses kaydı URL'si |
| `call.cost` | `cost` | Çağrı maliyeti |

### N8N call-logging Workflow Bağlantısı

`/api/vapi/call-ended` endpoint'i DB'ye kaydettikten sonra N8N'e de veri gönderebilir. Eğer call-logging workflow'u N8N üzerinden çalıştırmak isterseniz, `/webhook/call-logging` endpoint'ini doğrudan VAPI Server URL olarak kullanabilirsiniz:

```
https://YOUR-N8N-DOMAIN/webhook/call-logging
```

> **Hangisini kullanmalıyım?**  
> - **Vercel endpoint** (`/api/vapi/call-ended`): DB kaydı + opsiyonel N8N tetikleme  
> - **N8N webhook** (`/webhook/call-logging`): Sadece N8N üzerinden DB kaydı  
> Demo için Vercel endpoint önerilir — daha fazla kontrol sağlar.

---

## 6. Test Call Prosedürü

### Adım 1 — VAPI Dashboard'da Test Call

1. Assistant sayfasında **Test** butonuna tıklayın (veya sağ üst köşe)
2. **"Talk with Assistant"** seçin
3. Türkçe konuşmaya başlayın

**Test senaryoları:**

**Senaryo A — Randevu Alma:**
```
"Merhaba, Dr. Ayşe Kaya ile 15 Eylül Pazartesi saat 10 için randevu almak istiyorum. 
Adım Ali Veli, telefon numaram 05551234567."
```

Beklenen: Assistant müsaitliği kontrol eder, onay alır, randevu oluşturur.

**Senaryo B — Randevu İptali:**
```
"Merhaba, 05551234567 numaralı telefonla randevum vardı, iptal etmek istiyorum."
```

Beklenen: Randevuyu bulur, onay alır, iptal eder.

**Senaryo C — Doktor Bilgisi:**
```
"Klinikinizdeki kardiyoloji doktorları hakkında bilgi alabilir miyim?"
```

Beklenen: DB'deki aktif kardiyoloji doktorlarını listeler.

---

### Adım 2 — Tool Tetikleme Testi

N8N'de ilgili workflow'u açın → **Executions** sekmesine tıklayın. Test çağrısından sonra burada bir kayıt görünmeli.

Execution başarısıysa: yeşil `Success` etiketi  
Başarısızsa: kırmızı `Error` etiketi ve hata detayı

---

### Adım 3 — Webhook Test (curl ile)

N8N workflow'u doğrudan test etmek için:

```bash
# check-availability testi
curl -X POST https://YOUR-N8N-DOMAIN/webhook/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "toolCallList": [{
        "id": "test-001",
        "function": {
          "name": "checkAppointmentAvailability",
          "arguments": "{\"doctorName\": \"Dr. Ayşe Kaya\", \"preferredDate\": \"2025-09-15\", \"preferredTime\": \"10:00\"}"
        }
      }]
    }
  }'
```

**Beklenen yanıt:**
```json
{
  "results": [
    {
      "toolCallId": "test-001",
      "result": "Dr. Ayşe Kaya doktoru 2025-09-15 tarihinde saat 10:00 müsait. Randevu oluşturmak ister misiniz?"
    }
  ]
}
```

---

### Adım 4 — Timeout Testi

N8N workflow'da Postgres node'una geçici olarak çok uzun bir query ekleyin (`pg_sleep(15)`), ardından VAPI test call yapın. VAPI'nin timeout sonrası fallback mesajı verdiğini doğrulayın.

---

### Adım 5 — Invalid Payload Testi

```bash
curl -X POST https://YOUR-N8N-DOMAIN/webhook/create-appointment \
  -H "Content-Type: application/json" \
  -d '{"message": {"toolCallList": []}}'
```

**Beklenen yanıt:** Workflow validation error döner, VAPI'ye anlamlı hata mesajı gider.

---

## 7. Yaygın Hatalar ve Çözümleri

### Hata: `invalid schema`

**Belirti:** Tool kaydedilemiyor veya çağrı sırasında schema hatası alınıyor  
**Neden:** JSON Schema formatı geçersiz  
**Çözüm:**
- Tüm property tiplerini kontrol edin (`"type": "string"` zorunlu)
- `required` array'in property adlarıyla eşleştiğini doğrulayın
- JSON'ı [jsonlint.com](https://jsonlint.com) ile doğrulayın

---

### Hata: `tool timeout`

**Belirti:** Assistant "şu an yardımcı olamıyorum" diyor  
**Neden:** N8N webhook 8 saniyede cevap vermedi  
**Çözüm:**
1. N8N → Executions → Execution süresini kontrol edin
2. Postgres query çok yavaşsa index ekleyin:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date 
   ON appointments(doctor_name, appointment_date);
   ```
3. N8N'de **Respond to Webhook** node'unun Postgres node'undan önce olmadığını doğrulayın

---

### Hata: `webhook 404`

**Belirti:** Tool çağrısı yapılıyor ama N8N'e ulaşmıyor  
**Neden:** Webhook URL yanlış veya workflow aktif değil  
**Çözüm:**
1. N8N dashboard → Workflow → Aktif mi? (toggle mavi olmalı)
2. URL'nin `/webhook/` ile başladığını doğrulayın (`/webhook-test/` değil — bu sadece test için)
3. N8N domain'inin dışarıdan erişilebilir olduğunu test edin:
   ```bash
   curl -I https://YOUR-N8N-DOMAIN/webhook/check-availability
   ```

---

### Hata: `invalid JSON` (arguments parse hatası)

**Belirti:** N8N'de Code node'unda JSON parse error  
**Neden:** VAPI `arguments` alanını string olarak gönderiyor, direkt object olarak kullanmaya çalışıyorsunuz  
**Çözüm:** Code node'unda arguments'ı her zaman parse edin:
```javascript
let args = {};
try {
  args = typeof toolCall.function?.arguments === 'string'
    ? JSON.parse(toolCall.function.arguments)
    : (toolCall.function?.arguments || {});
} catch(e) { args = {}; }
```

---

### Hata: `empty toolCallList`

**Belirti:** N8N workflow başlıyor ama `toolCallList` boş  
**Neden:** VAPI farklı bir event tipi gönderdi (status-update gibi)  
**Çözüm:** Code node'unda kontrol ekleyin:
```javascript
const toolCallList = body?.message?.toolCallList || [];
if (toolCallList.length === 0) {
  return [{ json: { toolCallId: 'unknown', error: true, result: 'Geçersiz istek.' } }];
}
```

---

### Hata: `assistant not calling tool`

**Belirti:** Konuşmada randevu alıyorsunuz ama tool tetiklenmiyor  
**Neden:** System prompt tool'u ne zaman çağıracağını anlatmıyor  
**Çözüm:** System prompt'a şunu ekleyin:
```
Randevu müsaitliğini kontrol etmek için checkAppointmentAvailability tool'unu kullan.
Randevu oluşturmak için createAppointment tool'unu kullan.
Randevu iptal için cancelAppointment tool'unu kullan.
```

---

### Hata: `slow response` (3+ saniye gecikme)

**Belirti:** Assistant cevap verene kadar uzun bekleme  
**Neden:** OpenAI API yavaş, N8N Postgres yavaş, veya her ikisi  
**Çözüm:**
1. Model'i `gpt-4o-mini` olarak değiştirin (2-3x daha hızlı)
2. N8N → Execution Time → Hangi node yavaş olduğunu tespit edin
3. Neon bağlantısında **pooled connection** kullanıldığını doğrulayın

---

### Hata: `duplicate requests`

**Belirti:** Aynı randevu iki kez oluşturuluyor  
**Neden:** VAPI retry mekanizması aynı tool call'u tekrarlıyor  
**Çözüm:** `create-appointment` workflow'unda duplicate kontrol IF node'u var. `call_logs` tablosunda `ON CONFLICT (vapi_call_id)` upsert kullanıldığını doğrulayın.

---

## 8. Final Validation Checklist

Demo başlamadan önce bu kontrolleri yapın:

### VAPI Kontrolleri

- [ ] Assistant oluşturuldu ve kaydedildi
- [ ] Türkçe voice seçildi
- [ ] System prompt girildi
- [ ] 6 tool'un tamamı eklendi
- [ ] Her tool'un Server URL'si doğru N8N webhook'una işaret ediyor
- [ ] Timeout 8000ms olarak ayarlandı
- [ ] End-of-call Server URL Vercel app'ini gösteriyor
- [ ] Test call yapıldı — assistant Türkçe konuşuyor

### N8N Kontrolleri

- [ ] 7 workflow import edildi
- [ ] Tüm workflow'lar **Active** (mavi toggle)
- [ ] Her Postgres node'unda `Neon PostgreSQL` credential seçili
- [ ] Webhook URL'leri production URL (not `/webhook-test/`)
- [ ] En az bir test execution başarılı (`Success` etiketi)

### NeonDB Kontrolleri

- [ ] Tüm migration SQL'leri çalıştırıldı (0000–0003)
- [ ] `doctors` tablosunda en az 1 aktif kayıt var
- [ ] Test sonrası `appointments` tablosunda yeni kayıt oluştu

### Vercel Kontrolleri

- [ ] `VAPI_API_KEY` env değişkeni eklendi
- [ ] `VAPI_ASSISTANT_ID` env değişkeni eklendi
- [ ] `N8N_WEBHOOK_BASE_URL` env değişkeni eklendi
- [ ] `/api/vapi/call-ended` endpoint'i 200 dönüyor
- [ ] Admin panel dashboard canlı veri gösteriyor

### Uçtan Uca Test

- [ ] VAPI test call → randevu alındı → DB'de kayıt var
- [ ] Admin panelde yeni randevu görünüyor
- [ ] Çağrı kaydı Çağrı Kayıtları sayfasında görünüyor
- [ ] Randevu iptali çalışıyor (status = 'iptal')
- [ ] Doktor bilgisi sorgusu doğru yanıt veriyor
