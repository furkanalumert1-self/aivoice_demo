# n8n Workflow Rehberi — Klinik AI Call Center

> Bu döküman, 4 n8n workflow'unun her node'unu, expression'larını, credential kurulumunu ve debug prosedürlerini detaylandırır.

---

## Genel Bakış

Projede 4 n8n workflow bulunur:

| Workflow | Tetikleyici | Amaç |
|----------|-------------|-------|
| `appointment-created.json` | Webhook POST | Yeni randevu bildirimi (DB), sistem olayı kaydı |
| `call-summary.json` | Webhook POST | Çağrı özeti AI ile oluşturma, DB kayıt |
| `appointment-cancelled.json` | Webhook POST | İptal bildirimi, DB güncelleme |
| `appointment-reminder.json` | Cron (saatlik) | Yarınki randevu hatırlatıcıları (DB bildirimi) |

**Önemli:** Workflow'lar import sonrası mutlaka **Activate** edilmeli. Aksi halde webhook URL'leri yanıt vermez.

---

## Workflow 1: Klinik AI — Randevu Oluşturuldu

Kaynak: `/home/user/aivoice_demo/workflows/appointment-created.json`

Bu workflow, `/api/vapi/book` route'u yeni randevu oluşturduğunda tetiklenir. Zincir: Webhook → Bildirim Oluştur (DB) → Sistem Olayı Kaydet (DB) → Yanıt Ver.

---

### Node 1: Webhook

**Amaç:** Workflow'u dışarıdan gelen HTTP POST ile tetikler. Next.js API route'undan randevu verisi gelir.

**Görevi:** HTTP isteğini kabul eder, body'yi parse eder, sonraki node'a geçirir.

**Node Tipi:** `n8n-nodes-base.webhook`  
**Bağlantılar:** Giriş yok (trigger) → Bildirim Oluştur

**Doldurulacak Alanlar:**

| Alan | Değer | Neden Gerekli |
|------|-------|---------------|
| HTTP Method | POST | Next.js `fetch()` POST gönderir |
| Path | `appointment-created` | URL path: `/webhook/appointment-created` |
| Response Mode | `responseNode` | Yanıtı "Yanıt Ver" node'u gönderir |

**Input Örneği (Next.js'den gelen payload):**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "patientName": "Ahmet Yılmaz",
  "phone": "05301234567",
  "doctorName": "Dr. Ayşe Kaya",
  "appointmentAt": "2025-09-11T10:00:00.000Z",
  "status": "onaylandi",
  "source": "voice_agent",
  "createdAt": "2025-09-11T07:15:32.000Z"
}
```

**Output Örneği:**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "patientName": "Ahmet Yılmaz",
  "phone": "05301234567",
  "doctorName": "Dr. Ayşe Kaya",
  "appointmentAt": "2025-09-11T10:00:00.000Z",
  "status": "onaylandi",
  "source": "voice_agent",
  "createdAt": "2025-09-11T07:15:32.000Z"
}
```

**Credential:** Webhook node'u credential gerektirmez.

**Test URL (n8n editor'de görünür):**
```
https://[instance].n8n.cloud/webhook-test/appointment-created
```

**Production URL (aktif workflow):**
```
https://[instance].n8n.cloud/webhook/appointment-created
```

**Debug için curl:**
```bash
curl -X POST https://[instance].n8n.cloud/webhook-test/appointment-created \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-uuid-001",
    "patientName": "Test Hasta",
    "phone": "05001234567",
    "doctorName": "Dr. Test",
    "appointmentAt": "2025-09-12T09:00:00.000Z",
    "status": "onaylandi",
    "source": "voice_agent",
    "createdAt": "2025-09-11T08:00:00.000Z"
  }'
```

**Hata Durumları:**
- `404 Not Found` → Workflow aktif değil veya path yanlış
- `405 Method Not Allowed` → HTTP Method alanı GET seçilmiş

**Production Notu:** n8n Cloud'da workflow aktif edilmeden Test URL kullanılabilir ama Production URL çalışmaz.

---

### Node 2: Bildirim Oluştur

**Amaç:** Yeni randevu oluşturulduğunu admin bildirimleri tablosuna kaydeder.

**Görevi:** Neon `notifications` tablosuna INSERT yapar.

**Node Tipi:** `n8n-nodes-base.postgres`  
**Bağlantılar:** ← Webhook | → Sistem Olayı Kaydet

**Doldurulacak Alanlar:**

| Alan | Değer | Neden Gerekli |
|------|-------|---------------|
| Operation | `insert` | Yeni kayıt oluşturma |
| Table | `notifications` | Hedef tablo |
| Columns | `title,description,is_read` | Insert edilecek kolonlar |

**Column Values (Expression):**

| Kolon | Expression | Açıklama |
|-------|-----------|----------|
| `title` | `Yeni Randevu Oluşturuldu` | Sabit metin |
| `description` | `={{ $json.patientName }} - {{ $json.doctorName }} - {{ $json.appointmentAt }}` | Dinamik içerik |
| `is_read` | `false` | Okunmamış olarak işaretle |

**Expression Açıklamaları:**
- `{{ $json.patientName }}` → Webhook node'undan gelen `patientName` alanını okur
- `{{ $json.doctorName }}` → Doktor adını alır
- `{{ $json.appointmentAt }}` → Randevu zamanını alır

**Input Örneği:**
```json
{
  "patientName": "Ahmet Yılmaz",
  "doctorName": "Dr. Ayşe Kaya",
  "appointmentAt": "2025-09-11T10:00:00.000Z"
}
```

**Output Örneği (DB'den returning):**
```json
{
  "id": "notif-uuid-001",
  "title": "Yeni Randevu Oluşturuldu",
  "description": "Ahmet Yılmaz - Dr. Ayşe Kaya - 2025-09-11T10:00:00.000Z",
  "is_read": false,
  "created_at": "2025-09-11T07:15:33.000Z"
}
```

**Credential: Neon PostgreSQL**

Nasıl oluşturulur:
1. n8n → Settings → Credentials → **+ New Credential**
2. Arama kutusuna "PostgreSQL" yaz
3. **PostgreSQL** seç

| Alan | Değer | Nereden Alınır |
|------|-------|----------------|
| Host | `ep-bold-pond-123456.eu-central-1.aws.neon.tech` | Neon Console → Project → Connection Details → Host |
| Port | `5432` | Sabit |
| Database | `klinikdb` (veya proje adın) | Neon Console → Database name |
| User | `klinik_owner` | Neon Console → User |
| Password | `xxxxx` | Neon Console → Connection Details → şifreni göster |
| SSL | `require` | Neon zorunlu kılar |

Credential adı: `Neon PostgreSQL` (workflow JSON'da bu isimle referans edilir)

**Hata Durumları:**
- `relation "notifications" does not exist` → Migration çalıştırılmamış
- `SSL connection required` → SSL modu `require` değil
- `password authentication failed` → Şifre yanlış

---

### Node 3: Sistem Olayı Kaydet

**Amaç:** Randevu oluşturuldu olayını sistem_events tablosuna kaydeder (iç olay sistemi — dış bildirim yok).

**Görevi:** Neon `system_events` tablosuna INSERT yapar.

**Node Tipi:** `n8n-nodes-base.postgres`  
**Bağlantılar:** ← Bildirim Oluştur | → Yanıt Ver

**Doldurulacak Alanlar:**

| Alan | Değer | Neden Gerekli |
|------|-------|---------------|
| Operation | `insert` | Yeni kayıt oluşturma |
| Table | `system_events` | Hedef tablo |
| Columns | `event_type,source,severity,payload` | Insert edilecek kolonlar |

**Column Values:**

| Kolon | Değer | Açıklama |
|-------|-------|----------|
| `event_type` | `appointment_created` | Olay tipi |
| `source` | `n8n_workflow` | Kaynak sistem |
| `severity` | `info` | Önem seviyesi |
| `payload` | `={{ $json }}` | Randevu verisi JSON olarak |

**Credential:** `Neon PostgreSQL`

**Hata Durumları:**
- `relation "system_events" does not exist` → `drizzle/0003_observability_tables.sql` migration çalıştırılmamış

---

### Node 4: Yanıt Ver

**Amaç:** Webhook'a başarı yanıtı döndürür. `responseMode: responseNode` ayarı sayesinde bu node yanıtı kontrol eder.

**Görevi:** Next.js'e HTTP 200 ve JSON yanıtı gönderir.

**Node Tipi:** `n8n-nodes-base.respondToWebhook`  
**Bağlantılar:** ← WhatsApp Bildirim (Mock)

**Doldurulacak Alanlar:**

| Alan | Değer | Neden Gerekli |
|------|-------|---------------|
| Respond With | `json` | JSON formatı |
| Response Body | `={{ { success: true, message: 'Workflow tamamlandı' } }}` | Yanıt içeriği |

**Output (Next.js'in aldığı yanıt):**
```json
{
  "success": true,
  "message": "Workflow tamamlandı"
}
```

---

## Workflow 2: Klinik AI — Çağrı Özeti

Kaynak: `/home/user/aivoice_demo/workflows/call-summary.json`

Bu workflow, `/api/vapi/call-ended` route'u çalıştıktan sonra tetiklenir. Zincir: Webhook → GPT Özeti → Çağrı Kaydı Ekle → Bildirim Oluştur → Yanıt Ver.

---

### Node 1: Webhook

**Node Tipi:** `n8n-nodes-base.webhook`  
**Bağlantılar:** Trigger | → GPT Özeti Oluştur

| Alan | Değer |
|------|-------|
| HTTP Method | POST |
| Path | `call-summary` |
| Response Mode | `responseNode` |

**Input (Next.js calls kaydı):**
```json
{
  "id": "call-uuid-001",
  "callerPhone": "+905301234567",
  "durationSeconds": 225,
  "transcript": "AI: Merhaba!...\nKullanıcı: Randevu almak istiyorum...",
  "summary": "Kısa özet (Next.js tarafından üretildi)",
  "cost": "0.023400",
  "outcome": "randevu_alindi",
  "appointmentId": null,
  "recordingUrl": "https://storage.vapi.ai/recordings/call-uuid-001.mp3",
  "createdAt": "2025-09-11T07:20:00.000Z"
}
```

**Debug:**
```bash
curl -X POST https://[instance].n8n.cloud/webhook-test/call-summary \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-call-001",
    "callerPhone": "+905301234567",
    "durationSeconds": 180,
    "transcript": "AI: Merhaba!\nKullanıcı: Randevu almak istiyorum.",
    "summary": "Test özeti",
    "cost": "0.015000",
    "outcome": "randevu_alindi",
    "createdAt": "2025-09-11T10:00:00.000Z"
  }'
```

---

### Node 2: GPT Özeti Oluştur

**Amaç:** VAPI'nin otomatik özeti yetersizse GPT-4o-mini ile daha iyi Türkçe özet üretir.

**Görevi:** OpenAI API'ye çağrı yapar, transkripti özetler.

**Node Tipi:** `@n8n/n8n-nodes-langchain.openAi`  
**Bağlantılar:** ← Webhook | → Çağrı Kaydı Ekle

| Alan | Değer |
|------|-------|
| Resource | `chat` |
| Operation | `complete` |
| Model | `gpt-4o-mini` |

**Messages:**
```
System: "Sen bir tıbbi call center asistanısın. Verilen transkripti analiz ederek 
kısa ve öz bir özet çıkar. Özet Türkçe olmalı ve 2-3 cümleyi geçmemeli."

User: "Aşağıdaki çağrı transkriptini özetle:\n\n{{ $json.transcript }}"
```

**Expression Açıklamaları:**
- `{{ $json.transcript }}` → Webhook'tan gelen transcript alanını prompt'a ekler

**Options:**
- `maxTokens: 200` → Özet 200 tokenden uzun olmayacak

**Input:**
```json
{
  "transcript": "AI: Merhaba!\nKullanıcı: Dr. Ayşe ile randevu almak istiyorum..."
}
```

**Output:**
```json
{
  "message": {
    "content": "Hasta Dr. Ayşe Kaya ile 11 Eylül 2025 saat 10:00 için randevu aldı. Görüşme sorunsuz tamamlandı."
  }
}
```

**Credential: OpenAI API Key**

1. n8n → Settings → Credentials → **+ New**
2. "OpenAI" ara → **OpenAI Api** seç

| Alan | Değer | Nereden |
|------|-------|---------|
| API Key | `sk-proj-xxxx...` | platform.openai.com → API Keys |

Credential adı: `OpenAI API Key`

**Hata Durumları:**
- `401 Unauthorized` → API key yanlış
- `429 Too Many Requests` → Rate limit aşıldı
- `context_length_exceeded` → Transcript çok uzun → `maxTokens` düşür veya transcript kırp

---

### Node 3: Çağrı Kaydı Ekle

**Amaç:** GPT özetini calls tablosuna yazar.

**Görevi:** Neon `calls` tablosuna INSERT.

**Node Tipi:** `n8n-nodes-base.postgres`  
**Bağlantılar:** ← GPT Özeti Oluştur | → Bildirim Oluştur

| Alan | Değer |
|------|-------|
| Operation | `insert` |
| Table | `calls` |
| Columns | `caller_phone,duration_seconds,transcript,summary,cost,outcome,recording_url` |

**Column Values:**

| Kolon | Expression |
|-------|-----------|
| `caller_phone` | `={{ $('Webhook').item.json.callerPhone }}` |
| `duration_seconds` | `={{ $('Webhook').item.json.durationSeconds }}` |
| `transcript` | `={{ $('Webhook').item.json.transcript }}` |
| `summary` | `={{ $json.message.content }}` (GPT çıktısı) |
| `cost` | `={{ $('Webhook').item.json.cost }}` |
| `outcome` | `={{ $('Webhook').item.json.outcome }}` |
| `recording_url` | `={{ $('Webhook').item.json.recordingUrl }}` |

**Expression Açıklamaları:**
- `$('Webhook').item.json.callerPhone` → Webhook node'unun orijinal verisine döner (GPT node çalıştıktan sonra `$json` GPT çıktısı olur)
- `$json.message.content` → GPT node'unun ürettiği özet metni

**Credential:** `Neon PostgreSQL` (aynı credential)

**Hata Durumları:**
- `column "recording_url" does not exist` → Migration çalıştırılmamış (bkz. debugging.md)

---

### Node 4: Bildirim Oluştur

**Amaç:** Admin bildirim listesine çağrı özeti bildirimi ekler.

**Node Tipi:** `n8n-nodes-base.postgres`  
**Bağlantılar:** ← Çağrı Kaydı Ekle | → Yanıt Ver

| Kolon | Expression |
|-------|-----------|
| `title` | `Çağrı Özeti Oluşturuldu` |
| `description` | `={{ $('Webhook').item.json.callerPhone }} - {{ $json.message.content.slice(0, 100) }}` |
| `is_read` | `false` |

---

### Node 5: Yanıt Ver

**Node Tipi:** `n8n-nodes-base.respondToWebhook`

| Alan | Değer |
|------|-------|
| Respond With | `json` |
| Response Body | `={{ { success: true, callId: $('Çağrı Kaydı Ekle').item.json.id } }}` |

**Expression Açıklaması:**
- `$('Çağrı Kaydı Ekle').item.json.id` → "Çağrı Kaydı Ekle" node'unun DB'den döndürdüğü kaydın ID'si

---

## Workflow 3: Klinik AI — Randevu İptal Edildi

Kaynak: `/home/user/aivoice_demo/workflows/appointment-cancelled.json`

Tetikleyici: `/api/vapi/cancel` route'u n8n'e POST atar.  
Zincir: Webhook → Randevu Durumu Güncelle → Admin Bildirimi Oluştur → Yanıt Ver

---

### Node 1: Webhook

| Alan | Değer |
|------|-------|
| HTTP Method | POST |
| Path | `appointment-cancelled` |
| Response Mode | `responseNode` |

**Input:**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "patientName": "Ahmet Yılmaz",
  "phone": "05301234567",
  "doctorName": "Dr. Ayşe Kaya",
  "appointmentAt": "2025-09-11T10:00:00.000Z",
  "status": "iptal",
  "reason": "Hasta seyahate çıkıyor"
}
```

**Debug:**
```bash
curl -X POST https://[instance].n8n.cloud/webhook-test/appointment-cancelled \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-appt-001",
    "patientName": "Test Hasta",
    "phone": "05001234567",
    "status": "iptal",
    "reason": "Test iptal"
  }'
```

---

### Node 2: Randevu Durumu Güncelle

**Amaç:** `appointments` tablosunda `status = 'iptal'` olarak günceller (DB zaten güncel olabilir — idempotency).

**Node Tipi:** `n8n-nodes-base.postgres`

| Alan | Değer |
|------|-------|
| Operation | `update` |
| Table | `appointments` |
| Update Key | `id` |
| Columns | `status` |

**Column Values:**

| Kolon | Değer |
|-------|-------|
| `id` | `={{ $json.id }}` |
| `status` | `iptal` |

**Not:** `/api/vapi/cancel` route'u DB'yi zaten günceller. Bu n8n node'u idempotent güncelleme yapar — zararlı değil.

---

### Node 3: Admin Bildirimi Oluştur

**Node Tipi:** `n8n-nodes-base.postgres`

| Kolon | Expression |
|-------|-----------|
| `title` | `Randevu İptal Edildi` |
| `description` | `={{ $('Webhook').item.json.patientName }} randevusunu iptal etti. Neden: {{ $('Webhook').item.json.reason ?? 'Belirtilmedi' }}` |
| `is_read` | `false` |

---

### Node 4: Yanıt Ver

```json
{ "success": true, "message": "İptal işlendi" }
```

---

## Workflow 4: Klinik AI — Randevu Hatırlatıcı

Kaynak: `/home/user/aivoice_demo/workflows/appointment-reminder.json`

Bu workflow webhook değil **cron** ile tetiklenir. Her saat başı çalışır, yarınki randevuları sorgular ve hatırlatma gönderir.

Zincir: Zamanlanmış Tetikleyici → Yarınki Randevuları Bul → Randevu Var mı? → [Evet] Hatırlatıcıları Hazırla → Hatırlatıcı Bildirimi Kaydet (DB)

---

### Node 1: Zamanlanmış Tetikleyici

**Amaç:** Saatlik otomatik çalıştırma.

**Node Tipi:** `n8n-nodes-base.scheduleTrigger`  
**Bağlantılar:** Trigger | → Yarınki Randevuları Bul

| Alan | Değer |
|------|-------|
| Rule Type | Hours |
| Hours Interval | 1 |

**Production Notu:** Her saat başı çalışır. Sabah 08:00'de çalışması için Trigger Hour'u 8 olarak set et. Aksi halde gece çalışması boş sorgu yapar (maliyetsiz ama gereksiz).

---

### Node 2: Yarınki Randevuları Bul

**Amaç:** Yarın gerçekleşecek onaylanmış randevuları DB'den çeker.

**Node Tipi:** `n8n-nodes-base.postgres`  
**Bağlantılar:** ← Zamanlanmış Tetikleyici | → Randevu Var mı?

| Alan | Değer |
|------|-------|
| Operation | `executeQuery` (custom SQL) |
| Query | (aşağıda) |

**SQL Sorgusu:**
```sql
SELECT * FROM appointments 
WHERE appointment_at::date = (CURRENT_DATE + INTERVAL '1 day') 
AND status = 'onaylandi'
```

**Açıklama:**
- `appointment_at::date` → timestamp'i sadece tarih kısmına dönüştürür
- `CURRENT_DATE + INTERVAL '1 day'` → yarının tarihi
- `status = 'onaylandi'` → iptal edilmişleri hariç tutar

**Credential:** `Neon PostgreSQL`

**Output Örneği:**
```json
[
  {
    "id": "appt-001",
    "patient_name": "Ahmet Yılmaz",
    "phone": "05301234567",
    "doctor_name": "Dr. Ayşe Kaya",
    "appointment_at": "2025-09-12T10:00:00.000Z",
    "status": "onaylandi"
  }
]
```

**Hata Durumları:**
- Sonuç boş array → yarın randevu yok (normal durum)
- `ERROR: relation "appointments" does not exist` → migration çalıştırılmamış

---

### Node 3: Randevu Var mı?

**Amaç:** Sonuç boş ise workflow'u durdurur (gereksiz işlem yapmaz).

**Node Tipi:** `n8n-nodes-base.if`  
**Bağlantılar:** ← Yarınki Randevuları Bul | [true] → Hatırlatıcıları Hazırla | [false] → (bitiş)

**Condition:**

| Alan | Değer |
|------|-------|
| Left Value | `={{ $json.length }}` |
| Operation | `Greater Than` |
| Right Value | `0` |

**Expression Açıklaması:**
- `$json.length` → önceki node'dan gelen array'in eleman sayısı
- 0'dan büyükse [true] branch devam eder

**Not:** `$json.length` kullanımı `Select` sorgusu array döndürdüğünde çalışır. Eğer sonuç 0 kayıt dönerse array boş, length 0 → false branch.

---

### Node 4: Hatırlatıcıları Hazırla

**Amaç:** Her randevu için bildirim verisi hazırlar.

**Node Tipi:** `n8n-nodes-base.code`  
**Bağlantılar:** ← Randevu Var mı? (true) | → Hatırlatıcı Bildirimi Kaydet

**JavaScript Kodu:**
```javascript
const appointments = $input.all();
const reminders = [];

for (const appt of appointments) {
  const data = appt.json;
  const appointmentTime = new Date(data.appointment_at)
    .toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  
  reminders.push({
    title: `Randevu Hatırlatıcısı — ${data.patient_name}`,
    description: `Sayın ${data.patient_name}, yarın saat ${appointmentTime} için ${data.doctor_name} ile randevunuz bulunmaktadır.`,
    is_read: false,
    patientName: data.patient_name,
    appointmentAt: data.appointment_at
  });
}

return reminders.map(r => ({ json: r }));
```

**Açıklama:**
- `$input.all()` → önceki node'dan gelen tüm kayıtları array olarak alır
- Her kayıt için ayrı bir output item oluşturur
- `return reminders.map(r => ({ json: r }))` → n8n'in beklediği format: `[{ json: {...} }]`

**Output (her randevu için ayrı item):**
```json
{
  "title": "Randevu Hatırlatıcısı — Ahmet Yılmaz",
  "description": "Sayın Ahmet Yılmaz, yarın saat 10:00 için Dr. Ayşe Kaya ile randevunuz bulunmaktadır.",
  "is_read": false,
  "patientName": "Ahmet Yılmaz",
  "appointmentAt": "2025-09-12T10:00:00.000Z"
}
```

---

### Node 5: Hatırlatıcı Bildirimi Kaydet

**Amaç:** Her hasta için hatırlatıcı bildirimini DB'ye yazar (dış mesajlaşma yok — tüm olaylar DB'ye).

**Node Tipi:** `n8n-nodes-base.postgres`  
**Bağlantılar:** ← Hatırlatıcıları Hazırla

| Alan | Değer |
|------|-------|
| Operation | `insert` |
| Table | `notifications` |
| Columns | `title,description,is_read` |

**Column Values:**

| Kolon | Expression |
|-------|-----------|
| `title` | `={{ $json.title }}` |
| `description` | `={{ $json.description }}` |
| `is_read` | `={{ $json.is_read }}` |

**Not:** Bu node her input item için ayrı çalışır (n8n default davranışı). 3 randevu varsa 3 bildirim kaydı oluşturulur.

**Credential:** `Neon PostgreSQL`

---

## n8n Credential Oluşturma Rehberi

### 1. Neon PostgreSQL Credential

**Neon Dashboard'dan bilgileri alma:**
1. `https://console.neon.tech` → Projen → **Connection Details**
2. **Connection String**'i kopyala:
   ```
   postgresql://klinik_owner:password123@ep-bold-pond-123456.eu-central-1.aws.neon.tech/klinikdb?sslmode=require
   ```
3. Bu string'den parçaları çıkar:
   - Host: `ep-bold-pond-123456.eu-central-1.aws.neon.tech`
   - Port: `5432`
   - Database: `klinikdb`
   - User: `klinik_owner`
   - Password: `password123`

**n8n'de Credential Oluşturma:**
1. n8n → sol menü → **Settings** → **Credentials**
2. **+ Add Credential**
3. Arama: "PostgreSQL" → seç
4. Alanları doldur:

| Alan | Değer |
|------|-------|
| Credential Name | `Neon PostgreSQL` |
| Host | `ep-bold-pond-123456.eu-central-1.aws.neon.tech` |
| Port | `5432` |
| Database | `klinikdb` |
| User | `klinik_owner` |
| Password | `password123` |
| SSL | `require` |

5. **Test Connection** → "Connection successful" onayı al
6. **Save**

### 2. OpenAI API Key Credential

1. `https://platform.openai.com/api-keys` → **Create new secret key**
2. Key'i kopyala (bir kez gösterilir)
3. n8n → Settings → Credentials → **+ Add Credential**
4. "OpenAI" → **OpenAI Api**

| Alan | Değer |
|------|-------|
| Credential Name | `OpenAI API Key` |
| API Key | `sk-proj-xxxxxxxxxxxxxxxx` |

---

## Webhook URL Alma Kılavuzu

### Test URL (Geliştirme)
n8n editor'de Webhook node'a tıkla → sağ panelde görünür:
```
https://[instance].n8n.cloud/webhook-test/appointment-created
```
- Yalnızca workflow açıkken geçerli
- Her editor oturumunda yeniden aktif edilmesi gerekebilir
- Production webhook URL'i ile **farklıdır**

### Production URL (Canlı Sistem)
Workflow'u **Activate** et (sağ üst toggle) → URL değişir:
```
https://[instance].n8n.cloud/webhook/appointment-created
```
- Workflow aktif olduğu sürece her zaman çalışır
- Bu URL'i `N8N_WEBHOOK_URL` env variable'ına gir (path dahil etme):
  ```
  N8N_WEBHOOK_URL=https://[instance].n8n.cloud/webhook
  ```
  Next.js route'ları `/appointment-created`, `/call-summary` gibi path'leri kendisi ekler.

### Test vs Production Farkı

| Özellik | Test URL | Production URL |
|---------|----------|----------------|
| URL Prefix | `/webhook-test/` | `/webhook/` |
| Koşul | Editor açıkken | Workflow aktifken |
| Süresi | Geçici | Kalıcı |
| Hangi durum | Geliştirme | Canlı sistem |

---

## n8n Workflow Import Etme

1. n8n → **Workflows** → **+ New Workflow**
2. Sağ üst **⋮** (üç nokta) → **Import from File**
3. `/home/user/aivoice_demo/workflows/` altındaki `.json` dosyalarından birini seç
4. Import tamamlanınca credential'ları bağla (sarı uyarı ikonu varsa tıkla)
5. Her node'u aç → credential seçimini doğrula
6. **Save** → **Activate**

**Tüm workflow'ları import et:**
- `appointment-created.json`
- `call-summary.json`
- `appointment-cancelled.json`
- `appointment-reminder.json`
