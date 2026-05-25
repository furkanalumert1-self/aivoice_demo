# N8N Kurulum ve Workflow Kılavuzu

Bu kılavuz, Klinik AI sistemindeki 7 N8N workflow'unu sıfırdan kurmak için gereken tüm adımları içermektedir.

---

## Genel Gereksinimler

- N8N hesabı (cloud veya self-hosted)
- NeonDB PostgreSQL bağlantısı
- VAPI hesabı
- Vercel'e deploy edilmiş Next.js uygulaması

---

## 1. PostgreSQL Credential Oluşturma

Bu adım TÜM workflow'lar için zorunludur. Önce tamamlayın.

### N8N'de:

1. Sol menüden **Settings → Credentials → Add Credential**
2. **"Postgres"** seçin
3. Şu alanları doldurun:

| Alan | Değer |
|---|---|
| **Credential Name** | `Neon PostgreSQL` |
| **Host** | `ep-xxxx.eu-central-1.aws.neon.tech` (Neon'dan alın) |
| **Database** | `neondb` |
| **User** | `neondb_owner` (veya Neon'daki kullanıcı adınız) |
| **Password** | Neon project password |
| **Port** | `5432` |
| **SSL** | `Enable` ✅ |

> **ÖNEMLİ:** Host olarak **pooled connection** kullanın:
> Neon Console → Project → Connection Details → "Pooled connection" checkbox'ını işaretleyin → Host'u kopyalayın

4. **Test** butonuna basın → "Connection successful" görünmeli
5. **Save** edin

---

## 2. Workflow'ları Import Etme

### Her workflow için:

1. N8N → **Workflows → Add Workflow → Import from file**
2. `/workflows/` klasöründen ilgili `.json` dosyasını seçin
3. Import sonrası:
   - Her **Postgres node**'una tıklayın
   - **Credentials** alanında `Neon PostgreSQL` seçin
   - **Save** edin
4. Sağ üst köşeden **Activate** edin (toggle)

---

## 3. Webhook URL'lerini Alma

Workflow aktif edildikten sonra Webhook node'una tıklayın:

- **Production URL** şu formattadır:
```
https://YOUR-N8N-DOMAIN/webhook/WEBHOOK-PATH
```

Her workflow için URL'yi kopyalayın ve VAPI tool konfigürasyonuna ekleyin.

---

## 4. Workflow Detayları

### Workflow 1: check-appointment-availability

**Dosya:** `check-appointment-availability.json`  
**Webhook path:** `/webhook/check-availability`  
**Görev:** Doktor müsaitlik kontrolü, çakışma sorgusu

**Node açıklamaları:**

| Node | Tip | Açıklama |
|---|---|---|
| Webhook | Webhook | POST isteği alır, responseMode: responseNode |
| Argümanları Çıkar | Code | toolCallList'ten doctorName, preferredDate, preferredTime çıkarır. Eksik alan varsa hata döner |
| Doğrulama Geçerli? | IF | `$json.error === false` kontrolü |
| Çakışmaları Kontrol Et | Postgres | `appointments` tablosunda aynı doktor+tarih için dolu saatleri sorgular |
| Müsaitlik Formatla | Code | Çakışma yoksa "müsait" mesajı, varsa dolu saatleri listeler |
| Doğrulama Hatası | Code | Hata mesajını pass-through yapar |
| Yanıt Ver | Respond to Webhook | VAPI formatında JSON yanıt: `{ results: [{ toolCallId, result }] }` |

**PostgreSQL Query:**
```sql
SELECT id, appointment_date, appointment_time, patient_name
FROM appointments
WHERE doctor_name ILIKE '%' || $1 || '%'
  AND appointment_date = $2
  AND status != 'iptal'
ORDER BY appointment_time
```

**Test payload (N8N'de Manual Execute için):**
```json
{
  "message": {
    "toolCallList": [{
      "id": "test-call-id-001",
      "function": {
        "name": "checkAvailability",
        "arguments": "{\"doctorName\": \"Dr. Ayşe Kaya\", \"preferredDate\": \"2025-09-15\", \"preferredTime\": \"10:00\"}"
      }
    }]
  }
}
```

---

### Workflow 2: create-appointment

**Dosya:** `create-appointment.json`  
**Webhook path:** `/webhook/create-appointment`  
**Görev:** Randevu oluşturma + duplicate önleme

**Node açıklamaları:**

| Node | Tip | Açıklama |
|---|---|---|
| Webhook | Webhook | POST isteği alır |
| Argümanları Çıkar | Code | patientName, phone, doctorName, appointmentDate, appointmentTime çıkarır |
| Doğrulama Geçerli? | IF | Eksik alan kontrolü |
| Duplicate Kontrol | Postgres | Aynı doktor+tarih+saat kombinasyonunu kontrol eder |
| Slot Boş Mu? | IF | Çakışan kayıt sayısı 0 mı? |
| Randevu Ekle | Postgres | `appointments` tablosuna INSERT |
| Başarı Yanıtı | Code | Onay mesajı formatlar |
| Çakışma Yanıtı | Code | "Slot dolu" mesajı |
| Doğrulama Hatası | Code | Eksik alan mesajı |
| Yanıt Ver | Respond to Webhook | VAPI formatında yanıt |

**Duplicate kontrol query:**
```sql
SELECT id FROM appointments
WHERE doctor_name ILIKE '%' || $1 || '%'
  AND appointment_date = $2
  AND appointment_time = $3
  AND status != 'iptal'
LIMIT 1
```

**Insert query:**
```sql
INSERT INTO appointments (patient_name, patient_phone, doctor_name, appointment_date, appointment_time, appointment_at, status, source)
VALUES ($1, $2, $3, $4, $5, NOW(), 'onaylandi', 'voice_agent')
RETURNING id
```

**Test payload:**
```json
{
  "message": {
    "toolCallList": [{
      "id": "test-call-id-002",
      "function": {
        "name": "bookAppointment",
        "arguments": "{\"patientName\": \"Ali Veli\", \"phone\": \"05551234567\", \"doctorName\": \"Dr. Ayşe Kaya\", \"appointmentDate\": \"2025-09-15\", \"appointmentTime\": \"10:00\"}"
      }
    }]
  }
}
```

---

### Workflow 3: cancel-appointment

**Dosya:** `cancel-appointment.json`  
**Webhook path:** `/webhook/cancel-appointment`  
**Görev:** Hasta randevusunu iptal et

**Node açıklamaları:**

| Node | Tip | Açıklama |
|---|---|---|
| Webhook | Webhook | POST isteği alır |
| Argümanları Çıkar | Code | phone veya patientName çıkarır |
| Doğrulama Geçerli? | IF | En az biri dolu mu? |
| Randevuyu Bul | Postgres | phone veya isimle aktif randevu arar |
| Randevu Bulundu Mu? | IF | Sonuç var mı? |
| Durumu Güncelle | Postgres | `status = 'iptal'`, `updated_at = NOW()` |
| İptal Yanıtı | Code | Başarılı iptal mesajı |
| Bulunamadı Yanıtı | Code | "Randevu bulunamadı" mesajı |
| Yanıt Ver | Respond to Webhook | VAPI formatında yanıt |

---

### Workflow 4: reschedule-appointment

**Dosya:** `reschedule-appointment.json`  
**Webhook path:** `/webhook/reschedule-appointment`  
**Görev:** Randevu tarih/saat değişikliği (yeni slot kontrolüyle)

**Akış:** Mevcut randevuyu bul → Yeni slotun boş olup olmadığını kontrol et → UPDATE

---

### Workflow 5: doctor-information

**Dosya:** `doctor-information.json`  
**Webhook path:** `/webhook/doctor-information`  
**Görev:** Doktor listesi ve çalışma saatleri bilgisi

**Query:**
```sql
SELECT full_name, specialization, working_hours, active
FROM doctors
WHERE ($1 = '' OR full_name ILIKE '%' || $1 || '%')
  AND ($2 = '' OR specialization ILIKE '%' || $2 || '%')
  AND active = true
ORDER BY full_name
LIMIT 5
```

`working_hours` alanı JSONB formatında: `{"mon": "09:00-17:00", "tue": "09:00-17:00", ...}`

---

### Workflow 6: callback-request

**Dosya:** `callback-request.json`  
**Webhook path:** `/webhook/callback-request`  
**Görev:** Geri arama talebi kaydet

**Insert query:**
```sql
INSERT INTO callback_requests (patient_name, phone, reason, status, requested_at)
VALUES ($1, $2, $3, 'bekliyor', NOW())
RETURNING id
```

---

### Workflow 7: call-logging

**Dosya:** `call-logging.json`  
**Webhook path:** `/webhook/call-logging`  
**Görev:** VAPI çağrı verilerini kaydet (transcript, süre, niyet, kayıt URL)

Bu workflow VAPI'nin `end-of-call-report` payload'ını işler.

**Upsert query (duplicate önleme):**
```sql
INSERT INTO call_logs (caller_number, vapi_call_id, transcript, summary, duration, intent, call_status, recording_url, cost)
VALUES ($1, NULLIF($2,''), $3, $4, $5, $6, $7, NULLIF($8,''), $9)
ON CONFLICT (vapi_call_id)
DO UPDATE SET summary = EXCLUDED.summary, intent = EXCLUDED.intent, duration = EXCLUDED.duration
RETURNING id
```

---

## 5. Genel N8N Ayarları

### Respond to Webhook Node — Doğru Format

Tüm VAPI-facing workflow'larda Response body şu formatta olmalı:

```json
{{ { results: [{ toolCallId: $json.toolCallId, result: $json.result }] } }}
```

> Bu format VAPI'nin beklediği yanıt yapısıdır. Farklı bir format VAPI tarafında hata yaratır.

### Timeout Ayarı

VAPI tool call timeout genellikle **10 saniye**dir. N8N workflow'larının bu süre içinde yanıt vermesi gerekir.

Önerilen: Her Postgres node için **Query Timeout: 8000ms** (8 saniye) ayarlayın.

### Retry Ayarı

Workflow Settings → **On Error: Stop Workflow** (default yeterli)  
Kritik workflow'lar için: **Retry On Fail: 2 kez, 1 saniye bekle**

---

## 6. Test Etme

### N8N'de Manual Execution:
1. Workflow'u açın
2. Sol üst köşe → **Test Workflow**
3. Webhook node'una tıklayın → **Listen for Test Event**
4. Test payload'ı curl veya Postman ile gönderin:

```bash
curl -X POST https://YOUR-N8N-DOMAIN/webhook-test/check-availability \
  -H "Content-Type: application/json" \
  -d '{"message":{"toolCallList":[{"id":"test-001","function":{"name":"checkAvailability","arguments":"{\"doctorName\":\"Dr. Ayşe\",\"preferredDate\":\"2025-09-15\"}"}}]}}'
```

### Beklenen yanıt:
```json
{
  "results": [
    {
      "toolCallId": "test-001",
      "result": "Dr. Ayşe doktoru 2025-09-15 tarihinde 09:00-18:00 saatleri arasında müsait."
    }
  ]
}
```

---

## 7. Yaygın Hatalar

| Hata | Neden | Çözüm |
|---|---|---|
| `Connection refused` | Neon host yanlış | Pooled connection host'u kullanın |
| `SSL required` | SSL kapalı | Postgres credential'da SSL: Enable |
| `toolCallList is empty` | VAPI payload format değişti | `body.message.toolCallList[0]` kontrol edin |
| `Respond to Webhook timeout` | Postgres query yavaş | Query optimize edin veya index ekleyin |
| `relation "appointments" does not exist` | Migration çalıştırılmadı | Neon Console'da migration SQL'lerini çalıştırın |
| Workflow aktif değil | Toggle kapalı | N8N'de workflow sayfasından Activate edin |
