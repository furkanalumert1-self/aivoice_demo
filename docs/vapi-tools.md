# VAPI Tool Definitions — Klinik AI

Bu dosya, VAPI asistanına eklenecek 6 tool tanımını içermektedir.
`server.url` değerleri `N8N_WEBHOOK_BASE_URL` ortam değişkeninden türetilmelidir.

---

## Tool 1: checkAppointmentAvailability

```json
{
  "name": "checkAppointmentAvailability",
  "description": "Doktor müsaitlik durumunu kontrol eder. Hasta belirli bir doktor ve tarih için randevu almak istediğinde kullan. Önce bu tool ile müsaitlik kontrol et, sonra randevu oluştur.",
  "parameters": {
    "type": "object",
    "properties": {
      "doctorName": {
        "type": "string",
        "description": "Kontrol edilecek doktorun tam adı (örn: Dr. Ayşe Kaya)"
      },
      "preferredDate": {
        "type": "string",
        "description": "Tercih edilen tarih YYYY-MM-DD formatında (örn: 2025-09-10)"
      },
      "preferredTime": {
        "type": "string",
        "description": "Tercih edilen saat HH:MM formatında (örn: 10:00)"
      }
    },
    "required": ["preferredDate"]
  },
  "server": {
    "url": "{{N8N_WEBHOOK_BASE_URL}}/webhook/check-availability"
  }
}
```

---

## Tool 2: createAppointment

```json
{
  "name": "createAppointment",
  "description": "Yeni randevu oluşturur. Hasta adı, telefon numarası, istenen tarih ve saat bilgilerini al. Oluşturmadan önce hastaya bilgileri onayla.",
  "parameters": {
    "type": "object",
    "properties": {
      "patientName": {
        "type": "string",
        "description": "Hastanın tam adı soyadı"
      },
      "phone": {
        "type": "string",
        "description": "Hastanın telefon numarası (örn: 0532 123 4567)"
      },
      "doctorName": {
        "type": "string",
        "description": "Randevu alınacak doktorun adı"
      },
      "date": {
        "type": "string",
        "description": "Randevu tarihi YYYY-MM-DD formatında"
      },
      "time": {
        "type": "string",
        "description": "Randevu saati HH:MM formatında"
      },
      "notes": {
        "type": "string",
        "description": "Varsa ek notlar veya şikayetler"
      }
    },
    "required": ["patientName", "phone", "date", "time"]
  },
  "server": {
    "url": "{{N8N_WEBHOOK_BASE_URL}}/webhook/create-appointment"
  }
}
```

---

## Tool 3: cancelAppointment

```json
{
  "name": "cancelAppointment",
  "description": "Mevcut bir randevuyu iptal eder. Hastanın telefon numarasını doğrula. Sadece hastanın kendi randevusunu iptal edebileceğini unutma.",
  "parameters": {
    "type": "object",
    "properties": {
      "phone": {
        "type": "string",
        "description": "Randevunun iptal edileceği hastanın telefon numarası"
      },
      "appointmentId": {
        "type": "string",
        "description": "İptal edilecek randevunun UUID'si (opsiyonel)"
      },
      "reason": {
        "type": "string",
        "description": "İptal nedeni (opsiyonel)"
      }
    },
    "required": ["phone"]
  },
  "server": {
    "url": "{{N8N_WEBHOOK_BASE_URL}}/webhook/cancel-appointment"
  }
}
```

---

## Tool 4: rescheduleAppointment

```json
{
  "name": "rescheduleAppointment",
  "description": "Mevcut randevuyu yeni bir tarihe/saate taşır. Önce yeni slotun müsait olduğunu checkAppointmentAvailability ile kontrol et.",
  "parameters": {
    "type": "object",
    "properties": {
      "phone": {
        "type": "string",
        "description": "Hastanın telefon numarası"
      },
      "appointmentId": {
        "type": "string",
        "description": "Yeniden planlanacak randevunun UUID'si (opsiyonel)"
      },
      "newDate": {
        "type": "string",
        "description": "Yeni randevu tarihi YYYY-MM-DD formatında"
      },
      "newTime": {
        "type": "string",
        "description": "Yeni randevu saati HH:MM formatında"
      },
      "doctorName": {
        "type": "string",
        "description": "Doktor değişikliği varsa yeni doktorun adı (opsiyonel)"
      }
    },
    "required": ["phone", "newDate", "newTime"]
  },
  "server": {
    "url": "{{N8N_WEBHOOK_BASE_URL}}/webhook/reschedule-appointment"
  }
}
```

---

## Tool 5: getDoctorInformation

```json
{
  "name": "getDoctorInformation",
  "description": "Kliniğin doktorları hakkında bilgi verir. Hasta doktor uzmanlığı, çalışma saatleri veya belirli bir doktor hakkında soru sorduğunda kullan.",
  "parameters": {
    "type": "object",
    "properties": {
      "doctorName": {
        "type": "string",
        "description": "Bilgi alınacak doktorun adı (opsiyonel)"
      },
      "specialization": {
        "type": "string",
        "description": "Uzmanlık alanı (örn: Kardiyoloji, Pediatri, Dahiliye)"
      }
    },
    "required": []
  },
  "server": {
    "url": "{{N8N_WEBHOOK_BASE_URL}}/webhook/doctor-information"
  }
}
```

---

## Tool 6: createCallbackRequest

```json
{
  "name": "createCallbackRequest",
  "description": "Hastanın geri arama talebini kaydeder. Hasta şu an konuşamıyorsa veya daha sonra aranmak istiyorsa kullan.",
  "parameters": {
    "type": "object",
    "properties": {
      "phone": {
        "type": "string",
        "description": "Geri arama yapılacak telefon numarası"
      },
      "patientName": {
        "type": "string",
        "description": "Hastanın adı (opsiyonel)"
      },
      "reason": {
        "type": "string",
        "description": "Geri arama nedeni veya konu (opsiyonel)"
      }
    },
    "required": ["phone"]
  },
  "server": {
    "url": "{{N8N_WEBHOOK_BASE_URL}}/webhook/callback-request"
  }
}
```

---

## Notlar

- `{{N8N_WEBHOOK_BASE_URL}}` → `.env.local` dosyasındaki `N8N_WEBHOOK_BASE_URL` değişkeniyle değiştirilmelidir.
- Tüm tool'lar VAPI'nin `toolCallList` formatında çağrılır ve `results` array formatında yanıt bekler.
- n8n workflow'larının ilgili webhook path'lerinde aktif olması gerekir.
