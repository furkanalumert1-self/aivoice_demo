# VAPI.ai Entegrasyon Rehberi — Klinik AI Call Center

> Bu döküman, VAPI dashboard yapılandırmasını, function/tool tanımlarını, webhook payload formatlarını ve backend entegrasyon akışını kıdemli mühendis detayında açıklar.

---

## 1. VAPI Nedir ve Nasıl Çalışır?

VAPI, telefon tabanlı AI asistan altyapısı sağlayan bir cloud servisidir. Şu bileşenleri entegre eder:
- **STT (Speech-to-Text):** Deepgram — gerçek zamanlı ses tanıma
- **LLM:** OpenAI GPT-4o — diyalog yönetimi ve function calling
- **TTS (Text-to-Speech):** ElevenLabs — doğal sesli yanıt
- **Telefon altyapısı:** PSTN/SIP — gerçek telefon numarası üzerinden arama

Uygulamamız VAPI'yi şu amaçlarla kullanır:
1. Hasta araması geldiğinde Türkçe karşılama
2. Randevu işlemleri için backend API'yi tetikleme (function calling)
3. Çağrı biterken tüm veriyi `/api/vapi/call-ended` webhook'una gönderme

---

## 2. VAPI Dashboard Yapılandırması

### Adım 1: Hesap ve Asistan Oluşturma

1. `https://dashboard.vapi.ai` adresine git
2. **Sign Up** → Google veya email ile kayıt
3. Sol menüden **Assistants** → **Create Assistant**

---

### 2.1 Assistant Ayarları — Her Alan Açıklaması

#### Name (Asistan Adı)
```
Değer: "Klinik AI Assistant"
```
- Dashboard'da tanımlama içindir, hasta bunu duymaz.
- Birden fazla asistan varsa ayırt etmek için anlamlı isim ver.
- Maksimum 64 karakter.

#### Model
```
Provider: OpenAI
Model: gpt-4o
```
**Neden GPT-4o, GPT-3.5-turbo değil?**
- Türkçe anlama kalitesi: GPT-4o %40 daha iyi.
- Function calling güvenilirliği: GPT-4o daha az hallucination.
- Latency farkı: ~200ms daha yavaş ama kalite bunu karşılar.
- Maliyet: ~10x daha pahalı (gpt-4o: $5/1M token vs $0.5/1M). Klinik ortamında doğruluk önceliklidir.

#### System Prompt (Sistem Promptu)
```
Sen Klinik AI'ın sesli asistanısın. Türkçe konuşursun ve her zaman nazik, profesyonel bir ton kullanırsın.

Görevlerin:
1. Randevu almak isteyen hastalara yardımcı olmak
2. Mevcut randevuları iptal etmek veya ötelemek
3. Doktor müsaitliğini kontrol etmek
4. Genel klinik bilgisi vermek

Önemli kurallar:
- Her zaman önce hastanın adını sor
- Randevu için mutlaka tarih ve saat bilgisi al
- Doktor adı belirtilmezse "herhangi bir müsait doktor" ile devam et
- İşlem tamamlanınca net onay ver
- Tıbbi tavsiye verme, sadece randevu işlemlerini yap
- Çok uzun yanıtlardan kaçın, telefon görüşmesi için kısa tut

Çalışma saatleri: Hafta içi 09:00–18:00
Klinik adresi: Örnek Mah. Sağlık Cad. No:1, İstanbul
```

#### First Message (İlk Mesaj)
```
"Merhaba! Klinik AI asistanıyım. Size nasıl yardımcı olabilirim?"
```
- Hasta aramayı kabul ettiğinde bu metin TTS ile seslendirilir.
- Kısa tut — 10 saniyeyi geçmemeli.
- Türkçe karakterler tam desteklenir.

#### Voice Provider
```
Provider: ElevenLabs
```
**Neden ElevenLabs?**
- Türkçe için en doğal TTS sesi sunar.
- Azure Cognitive Services ve Google TTS'e göre Türkçe'de daha az robotik ses.
- Özelleştirilebilir: konuşma hızı, ton, vurgu ayarlanabilir.
- VAPI Dashboard'da doğrudan entegre — ayrı API key gerekmez (VAPI hesabınız üzerinden fatura edilir).

#### Voice ID (Ses Kimliği)
ElevenLabs Türkçe sesi bulmak için:
1. `https://elevenlabs.io/voice-lab` → Voices sayfasına git
2. **Filter by language** → Turkish seç
3. Beğendiğin sesi önizle
4. Sesin URL'sinden ID'yi al: `elevenlabs.io/voice-lab/[VOICE_ID]`
5. VAPI Dashboard'da Voice → ElevenLabs → Voice ID alanına yapıştır

Önerilen Türkçe sesler (2025 itibarıyla):
```
Bella    → daha doğal, hasta iletişimi için uygun
Antoni   → daha resmi, kurumsal ortamlar için
```

#### Language / Locale
```
Language: Turkish
Locale: tr-TR
```
- STT (Deepgram) dili etkiler — Türkçe ses tanıma için zorunlu.
- TTS aksanını da etkiler.

---

### 2.2 Server URL (Webhook URL) — KRİTİK ALAN

#### Nedir?
VAPI'nin çağrı olaylarını gönderdiği endpoint. `call-ended` raporu ve function call dışındaki genel event'ler buraya gelir.

#### Değer
```
https://aivoice-demo.vercel.app/api/vapi/call-ended
```

#### Bu URL'ye VAPI Ne Gönderir?
```json
{
  "type": "end-of-call-report",
  "call": {
    "id": "call_abc123",
    "customer": {
      "number": "+905301234567"
    },
    "startedAt": "2025-09-11T10:00:00.000Z",
    "endedAt": "2025-09-11T10:03:45.000Z",
    "cost": 0.0234,
    "artifact": {
      "transcript": "Asistan: Merhaba! Klinik AI asistanıyım...\nKullanıcı: Dr. Ayşe ile randevu almak istiyorum...",
      "recordingUrl": "https://storage.vapi.ai/recordings/call_abc123.mp3"
    },
    "analysis": {
      "summary": "Hasta Dr. Ayşe Kaya ile 11 Eylül 2025 saat 10:00 için randevu aldı."
    }
  }
}
```

#### Yanlış URL Girilirse Ne Olur?
- VAPI çağrı sonu raporu gönderilemez → calls tablosuna kayıt düşmez.
- Admin dashboard'da çağrı geçmişi boş görünür.
- Hata: VAPI dashboard → Call Logs → "Webhook delivery failed" mesajı.

#### Test Etme
```bash
# ngrok ile local test (bkz. LOCAL_DEVELOPMENT.md)
ngrok http 3000

# Test payload gönder
curl -X POST https://[ngrok-url]/api/vapi/call-ended \
  -H "Content-Type: application/json" \
  -d '{
    "type": "end-of-call-report",
    "call": {
      "id": "test_call_001",
      "customer": {"number": "+905301234567"},
      "startedAt": "2025-09-11T10:00:00Z",
      "endedAt": "2025-09-11T10:03:00Z",
      "cost": 0.015,
      "artifact": {
        "transcript": "Test transcript",
        "recordingUrl": null
      },
      "analysis": {"summary": "Test özeti"}
    }
  }'
```
Beklenen yanıt: `{"success":true,"callId":"uuid..."}`

---

### 2.3 Function/Tool Calling Yapılandırması

VAPI Dashboard → Assistant → Tools bölümünden 5 adet tool eklenir.

Her tool için: **Add Tool** → **Server** (Custom Function) seç.

---

#### Tool 1: check_availability

```json
{
  "type": "function",
  "function": {
    "name": "check_availability",
    "description": "Belirtilen doktor ve tarih için müsait randevu saatlerini kontrol eder. Randevu almadan önce çağrılmalıdır.",
    "parameters": {
      "type": "object",
      "properties": {
        "doctorName": {
          "type": "string",
          "description": "Doktorun tam adı. Örnek: 'Dr. Ayşe Kaya'. Belirtilmezse boş bırak."
        },
        "date": {
          "type": "string",
          "description": "Kontrol edilecek tarih. ISO 8601 formatı: YYYY-MM-DD. Örnek: '2025-09-11'"
        }
      },
      "required": ["date"]
    }
  },
  "server": {
    "url": "https://aivoice-demo.vercel.app/api/vapi/availability"
  }
}
```

---

#### Tool 2: book_appointment

```json
{
  "type": "function",
  "function": {
    "name": "book_appointment",
    "description": "Hasta için yeni randevu oluşturur. Çağırmadan önce check_availability ile müsaitlik doğrulanmalıdır.",
    "parameters": {
      "type": "object",
      "properties": {
        "patientName": {
          "type": "string",
          "description": "Hastanın tam adı. Örnek: 'Ahmet Yılmaz'"
        },
        "phone": {
          "type": "string",
          "description": "Hastanın telefon numarası. Örnek: '05301234567'"
        },
        "doctorName": {
          "type": "string",
          "description": "Randevu yapılacak doktorun adı. Örnek: 'Dr. Ayşe Kaya'"
        },
        "date": {
          "type": "string",
          "description": "Randevu tarihi. ISO 8601: YYYY-MM-DD. Örnek: '2025-09-11'"
        },
        "time": {
          "type": "string",
          "description": "Randevu saati. HH:MM formatı. Örnek: '10:00'"
        }
      },
      "required": ["patientName", "phone", "date", "time"]
    }
  },
  "server": {
    "url": "https://aivoice-demo.vercel.app/api/vapi/book"
  }
}
```

---

#### Tool 3: cancel_appointment

```json
{
  "type": "function",
  "function": {
    "name": "cancel_appointment",
    "description": "Hastanın mevcut randevusunu iptal eder. Randevu ID veya telefon numarasıyla bulunur.",
    "parameters": {
      "type": "object",
      "properties": {
        "appointmentId": {
          "type": "string",
          "description": "İptal edilecek randevunun UUID'si. Varsa kullan."
        },
        "phone": {
          "type": "string",
          "description": "Hastanın telefon numarası. appointmentId yoksa kullan."
        },
        "reason": {
          "type": "string",
          "description": "İptal nedeni. Opsiyonel. Örnek: 'Hasta seyahate çıkıyor'"
        }
      },
      "required": []
    }
  },
  "server": {
    "url": "https://aivoice-demo.vercel.app/api/vapi/cancel"
  }
}
```

---

#### Tool 4: reschedule_appointment

```json
{
  "type": "function",
  "function": {
    "name": "reschedule_appointment",
    "description": "Hastanın mevcut randevusunu yeni tarih ve saate taşır.",
    "parameters": {
      "type": "object",
      "properties": {
        "appointmentId": {
          "type": "string",
          "description": "Ötellenecek randevunun UUID'si."
        },
        "phone": {
          "type": "string",
          "description": "Hastanın telefon numarası. appointmentId yoksa kullan."
        },
        "newDate": {
          "type": "string",
          "description": "Yeni randevu tarihi. YYYY-MM-DD formatı."
        },
        "newTime": {
          "type": "string",
          "description": "Yeni randevu saati. HH:MM formatı."
        },
        "doctorName": {
          "type": "string",
          "description": "Yeni doktor adı. Değiştirilmeyecekse boş bırak."
        }
      },
      "required": ["newDate", "newTime"]
    }
  },
  "server": {
    "url": "https://aivoice-demo.vercel.app/api/vapi/reschedule"
  }
}
```

---

#### Tool 5: find_appointment

> Not: `find_appointment` bağımsız bir route olarak henüz implement edilmemiştir. Cancel ve reschedule route'ları telefon numarası ile arama yaparak aynı işlevi görür. Bu tool eklenecekse `/api/vapi/find` route'u oluşturulmalıdır.

```json
{
  "type": "function",
  "function": {
    "name": "find_appointment",
    "description": "Hastanın mevcut randevularını listeler.",
    "parameters": {
      "type": "object",
      "properties": {
        "phone": {
          "type": "string",
          "description": "Hastanın telefon numarası."
        }
      },
      "required": ["phone"]
    }
  },
  "server": {
    "url": "https://aivoice-demo.vercel.app/api/vapi/find"
  }
}
```

---

## 3. VAPI Webhook Payload Örnekleri

### 3.1 call.started Event
```json
{
  "type": "call-start",
  "call": {
    "id": "call_xYz123abc",
    "orgId": "org_klinik_001",
    "type": "inboundPhoneCall",
    "customer": {
      "number": "+905301234567"
    },
    "startedAt": "2025-09-11T10:00:00.000Z",
    "status": "in-progress"
  }
}
```

### 3.2 call.ended Event (Full End-of-Call-Report)
```json
{
  "type": "end-of-call-report",
  "call": {
    "id": "call_xYz123abc",
    "customer": {
      "number": "+905301234567"
    },
    "startedAt": "2025-09-11T10:00:00.000Z",
    "endedAt": "2025-09-11T10:03:45.000Z",
    "cost": 0.0234,
    "artifact": {
      "transcript": "AI: Merhaba! Klinik AI asistanıyım. Size nasıl yardımcı olabilirim?\nKullanıcı: Dr. Ayşe Kaya ile randevu almak istiyorum.\nAI: Tabii ki! Adınızı öğrenebilir miyim?\nKullanıcı: Ahmet Yılmaz\nAI: Teşekkürler Ahmet Bey. Hangi tarih için randevu almak istiyorsunuz?\nKullanıcı: Yarın sabah 10'da uygun olur mu?\nAI: Kontrol ediyorum... Dr. Ayşe Kaya için yarın 10:00 müsait. Telefon numaranızı alabilir miyim?\nKullanıcı: 05301234567\nAI: Randevunuz 11 Eylül 2025 saat 10:00 için Dr. Ayşe Kaya ile oluşturuldu. İyi günler!",
      "recordingUrl": "https://storage.vapi.ai/recordings/call_xYz123abc.mp3",
      "stereoRecordingUrl": "https://storage.vapi.ai/recordings/stereo/call_xYz123abc.mp3"
    },
    "analysis": {
      "summary": "Hasta Ahmet Yılmaz, Dr. Ayşe Kaya ile 11 Eylül 2025 saat 10:00 için randevu aldı. Telefon: 05301234567.",
      "structuredData": {}
    }
  }
}
```

### 3.3 Tool Call Event (Function Çağrısı Sırasında)
VAPI, function call'ı aşağıdaki formatta gönderir:
```json
{
  "message": {
    "type": "tool-calls",
    "toolCallList": [
      {
        "id": "call_abc456def",
        "type": "function",
        "function": {
          "name": "book_appointment",
          "parameters": {
            "patientName": "Ahmet Yılmaz",
            "phone": "05301234567",
            "doctorName": "Dr. Ayşe Kaya",
            "date": "2025-09-11",
            "time": "10:00"
          }
        }
      }
    ],
    "call": {
      "id": "call_xYz123abc"
    }
  }
}
```

### 3.4 Tool Call Result (Backend'den VAPI'ye Yanıt)
```json
{
  "results": [
    {
      "toolCallId": "call_abc456def",
      "result": {
        "success": true,
        "appointmentId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "message": "Randevunuz 2025-09-11 tarihinde saat 10:00 için Dr. Ayşe Kaya ile oluşturuldu."
      }
    }
  ]
}
```

---

## 4. VAPI API Key

### Nereden Alınır?
1. `https://dashboard.vapi.ai` → sağ üst köşe profil ikonu
2. **Account Settings** → **API Keys** bölümü
3. **Create new key** → key'i kopyala (bir kez gösterilir)

### Nereye Girilir?
```bash
# .env.local
VAPI_API_KEY=vapi_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Vercel'de:
```
Dashboard → Settings → Environment Variables → Add Variable
Name: VAPI_API_KEY
Value: vapi_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
Environment: Production, Preview, Development (hepsi)
```

### Backend'de Nasıl Kullanılır?
```typescript
// Örnek: VAPI API'ye istek gönderme (outbound call vs)
const response = await fetch('https://api.vapi.ai/call', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ assistantId: '...', customer: { number: '...' } })
});
```

### ASLA Frontend'e Gönderilmez
`VAPI_API_KEY` `NEXT_PUBLIC_` prefix'i olmadığından otomatik olarak server-side'da kalır. Next.js 15 bu convention'ı enforces eder.

---

## 5. Function Call → Backend → Response Tam Akışı

### Senaryo: Hasta "randevu almak istiyorum" diyor

**Adım 1 — Kullanıcı Konuşur**
```
Hasta: "Yarın sabah Dr. Ayşe Kaya ile randevu almak istiyorum. 
        Adım Ahmet Yılmaz, numaram 0530 123 45 67."
```

**Adım 2 — GPT-4o Karar Verir**
GPT-4o conversation history + system prompt'u değerlendirir:
- Tüm gerekli bilgiler mevcut: isim, telefon, doktor, tarih
- Önce müsaitlik kontrol et → `check_availability`

**Adım 3 — VAPI POST /api/vapi/availability**
```http
POST https://aivoice-demo.vercel.app/api/vapi/availability
Content-Type: application/json

{
  "message": {
    "toolCallList": [{
      "id": "call_check_001",
      "function": {
        "name": "check_availability",
        "parameters": {
          "doctorName": "Dr. Ayşe Kaya",
          "date": "2025-09-11"
        }
      }
    }]
  }
}
```

**Adım 4 — Backend Neon'a Sorgu**
```typescript
// availability/route.ts
const booked = await db
  .select({ appointmentAt: appointments.appointmentAt })
  .from(appointments)
  .where(
    and(
      gte(appointments.appointmentAt, startOfDay),
      lte(appointments.appointmentAt, endOfDay),
      eq(appointments.doctorName, "Dr. Ayşe Kaya"),
      eq(appointments.status, "onaylandi")
    )
  );
// Dolu slotları çıkar, ilk 6 müsaiti döndür
```

**Adım 5 — Backend VAPI'ye Yanıt**
```json
{
  "results": [{
    "toolCallId": "call_check_001",
    "result": {
      "available": true,
      "slots": ["09:00", "09:30", "10:00", "11:00", "14:00", "15:30"],
      "date": "2025-09-11",
      "doctorName": "Dr. Ayşe Kaya"
    }
  }]
}
```

**Adım 6 — GPT-4o Müsaitliği İşler**
GPT-4o yanıtı okur, conversation'a ekler, devam eder.

**Adım 7 — VAPI TTS**
```
"Dr. Ayşe Kaya için yarın 09:00, 09:30, 10:00, 11:00, 14:00 ve 
15:30 saatlerinde müsaitlik var. Hangi saati tercih edersiniz?"
```

**Adım 8 — Hasta Saat Seçer**
```
Hasta: "10:00 olsun."
GPT-4o: Artık book_appointment çağırabilir
```

**Adım 9 — VAPI POST /api/vapi/book**
```http
POST https://aivoice-demo.vercel.app/api/vapi/book
Content-Type: application/json

{
  "message": {
    "toolCallList": [{
      "id": "call_book_002",
      "function": {
        "name": "book_appointment",
        "parameters": {
          "patientName": "Ahmet Yılmaz",
          "phone": "05301234567",
          "doctorName": "Dr. Ayşe Kaya",
          "date": "2025-09-11",
          "time": "10:00"
        }
      }
    }]
  }
}
```

**Adım 10 — Backend DB'ye INSERT**
```typescript
// book/route.ts
const [newAppointment] = await db
  .insert(appointments)
  .values({
    patientName: "Ahmet Yılmaz",
    phone: "05301234567",
    doctorName: "Dr. Ayşe Kaya",
    appointmentAt: new Date("2025-09-11T10:00:00"),
    status: "onaylandi",
    source: "voice_agent",
  })
  .returning();

// n8n tetikle (async, hata izole)
await fetch(`${n8nWebhookUrl}/appointment-created`, {
  method: "POST",
  body: JSON.stringify(newAppointment)
});
```

**Adım 11 — Backend VAPI'ye Başarı Yanıtı**
```json
{
  "results": [{
    "toolCallId": "call_book_002",
    "result": {
      "success": true,
      "appointmentId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "message": "Randevunuz 2025-09-11 tarihinde saat 10:00 için Dr. Ayşe Kaya ile oluşturuldu."
    }
  }]
}
```

**Adım 12 — VAPI TTS ile Onay**
```
"Randevunuz 11 Eylül 2025 saat 10:00 için Dr. Ayşe Kaya ile 
başarıyla oluşturuldu. İyi günler dilerim!"
```

---

## 6. VAPI Yapılandırma Özeti Tablosu

| Alan | Değer | Notlar |
|------|-------|--------|
| Name | Klinik AI Assistant | Dashboard'da tanımlama |
| Model Provider | OpenAI | |
| Model | gpt-4o | Türkçe kalite için |
| System Prompt | (bkz. Bölüm 2.1) | TR doğruluk önemli |
| First Message | "Merhaba! Klinik AI..." | Kısa tut |
| Voice Provider | ElevenLabs | |
| Language | Turkish / tr-TR | STT için zorunlu |
| Server URL | `/api/vapi/call-ended` | Call-ended raporu için |
| Tools | 5 adet | Her biri ayrı server URL |
| Max Duration | 600 saniye | 10 dakika yeterli |
| Silence Timeout | 30 saniye | Sessizlikte kapat |

---

## 7. VAPI Hata Durumları ve Çözümleri

| Hata | Neden | Çözüm |
|------|-------|-------|
| Tool call timeout | Backend 10s içinde yanıt vermedi | DB sorguyu optimize et, index ekle |
| Invalid tool response format | `results` array eksik | Route'un `results: [{ toolCallId, result }]` döndürdüğünü doğrula |
| STT accuracy low | Türkçe dil ayarı yanlış | Language: tr-TR olmalı |
| TTS sounds robotic | ElevenLabs voice ID yanlış | Türkçe voice ID'yi doğrula |
| call-ended not received | Server URL yanlış | Vercel URL'ini VAPI dashboard'a gir |
| Function never called | System prompt yeterince açık değil | Tool açıklamalarını güncelle |
