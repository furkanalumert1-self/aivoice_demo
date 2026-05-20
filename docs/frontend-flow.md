# Frontend Akışı — Klinik AI Admin Dashboard

> Next.js 15 Server Component mimarisi, sidebar navigasyon, durum yönetimi ve Clerk auth entegrasyonu.

---

## 1. Sidebar Navigasyon Yapısı

`/home/user/aivoice_demo/components/sidebar.tsx` içinde tanımlı `navItems` array'i tüm menüyü oluşturur:

```typescript
const navItems = [
  { label: "Ana Sayfa",         href: "/admin",              icon: LayoutDashboard, exact: true },
  { label: "Randevu Kayıtları", href: "/admin/appointments", icon: Calendar },
  { label: "Form Kayıtları",    href: "/admin/forms",        icon: ClipboardList },
  { label: "Çağrı Kayıtları",  href: "/admin/calls",        icon: Phone },
  { label: "Arama Listesi",     href: "/admin/call-list",    icon: PhoneCall },
  { label: "Doktor / Takvim",   href: "/admin/doctors",      icon: Stethoscope },
  { label: "Hizmetler",         href: "/admin/services",     icon: Wrench },
  { label: "Uzmanlık Alanları", href: "/admin/specialties",  icon: Brain },
  { label: "Kullanıcı Yönetimi",href: "/admin/users",        icon: Users },
];
```

### Route → Sayfa Eşlemesi

| URL | Dosya | İçerik |
|-----|-------|--------|
| `/admin` | `app/admin/page.tsx` | Dashboard — istatistikler, son çağrılar, bildirimler |
| `/admin/appointments` | `app/admin/appointments/page.tsx` | Tüm randevular tablosu |
| `/admin/calls` | `app/admin/calls/page.tsx` | Çağrı kayıtları, transcript, özet |
| `/admin/call-list` | `app/admin/call-list/page.tsx` | Arama listesi yönetimi |
| `/admin/doctors` | `app/admin/doctors/page.tsx` | Doktor ve takvim yönetimi |
| `/admin/forms` | `app/admin/forms/page.tsx` | Form kayıtları |
| `/admin/services` | `app/admin/services/page.tsx` | Klinik hizmetleri |
| `/admin/specialties` | `app/admin/specialties/page.tsx` | Uzmanlık alanları |
| `/admin/users` | `app/admin/users/page.tsx` | Kullanıcı yönetimi |

### Aktif Menü Öğesi Tespiti

Sidebar `"use client"` direktifi ile client component'tir — `usePathname()` hook'u kullanır:

```typescript
"use client";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  
  // Her nav item için aktif mi kontrolü:
  const isActive = item.exact 
    ? pathname === item.href
    : pathname.startsWith(item.href);
  
  // Aktif item farklı stil alır:
  className={cn(
    "flex items-center gap-3 px-3 py-2 rounded-lg",
    isActive 
      ? "bg-indigo-50 text-indigo-700 font-medium"
      : "text-gray-600 hover:bg-gray-50"
  )}
}
```

**`exact: true` neden önemli?**  
`/admin` path'i `startsWith` ile test edilirse `/admin/appointments` gibi alt sayfalar da aktif görünür. `exact: true` yalnızca tam eşleşmede aktif gösterir.

---

## 2. Server Component Veri Çekimi

Next.js 15'te Server Component'ler `async/await` ile direkt DB sorgusu yapabilir — useState, useEffect, API fetch gerekmez.

### Örnek: Admin Dashboard (`/admin/page.tsx`)

```typescript
export const dynamic = "force-dynamic"; // Cache devre dışı

async function getStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Paralel sorgular (Promise.all'a gerek yok — Drizzle lazy eval)
    const [todayCalls] = await db
      .select({ count: count() })
      .from(calls)
      .where(gte(calls.createdAt, today));

    const [aiAppointments] = await db
      .select({ count: count() })
      .from(appointments)
      .where(eq(appointments.source, "voice_agent"));

    // ... diğer sorgular

    return { todayCallCount: todayCalls.count, ... };
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return emptyStats; // Hata durumunda boş veri döner, crash olmaz
  }
}

// Server Component — async function
export default async function AdminPage() {
  const stats = await getStats(); // Doğrudan DB'ye
  // ...JSX render
}
```

**Geleneksel yaklaşımla fark:**
```typescript
// ESKİ (client-side fetch):
"use client"
const [data, setData] = useState([]);
useEffect(() => {
  fetch("/api/appointments").then(r => r.json()).then(setData);
}, []);

// YENİ (Server Component — daha hızlı, daha az bundle):
export default async function Page() {
  const data = await db.select().from(appointments);
  return <Table data={data} />;
}
```

---

## 3. `force-dynamic` — Cache Önleme

```typescript
export const dynamic = "force-dynamic";
```

Bu direktif Next.js 15'in ISR (Incremental Static Regeneration) ve route cache mekanizmalarını devre dışı bırakır.

**Olmadan ne olur?**

```
İlk istek → DB'den veri çekilir → Vercel edge cache'e alınır
Sonraki istekler → Cache'den döner (DB sorgusu yok)
Yeni randevu eklenirse → Sayfa hala eski veriyi gösterir
```

**Olunca ne olur?**

```
Her istek → DB'ye sorgu → Fresh data
Cache yok → Hafif latency artışı ama her zaman güncel
```

**Her `page.tsx` ve API route'a eklenmelidir** — özellikle:
- `/api/appointments` → yeni randevu eklenince güncel listeler
- `/api/calls` → yeni çağrı kaydı anında görünür
- `/admin/*/page.tsx` → admin her sayfayı açtığında fresh data

---

## 4. Status Badge Sistemi

`/home/user/aivoice_demo/lib/utils.ts` içindeki map'ler UI bileşenlerine renk ve etiket sağlar:

```typescript
export const statusLabels: Record<string, string> = {
  onaylandi: "Onaylandı",
  bekleniyor: "Bekliyor",
  iptal: "İptal",
  tamamlandi: "Tamamlandı",
};

export const statusColors: Record<string, string> = {
  onaylandi: "bg-green-100 text-green-800 border-green-200",
  bekleniyor: "bg-yellow-100 text-yellow-800 border-yellow-200",
  iptal: "bg-red-100 text-red-800 border-red-200",
  tamamlandi: "bg-blue-100 text-blue-800 border-blue-200",
};

export const sourceLabels: Record<string, string> = {
  voice_agent: "Sesli Asistan",
  web: "Web",
  phone: "Telefon",
};

export const outcomeLabels: Record<string, string> = {
  randevu_alindi: "Randevu Alındı",
  bilgi_verildi: "Bilgi Verildi",
  iptal_edildi: "İptal Edildi",
  geri_arama: "Geri Arama",
  cevap_yok: "Cevap Yok",
};
```

**Kullanım:**
```tsx
<span className={cn(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
  statusColors[appt.status ?? ""] ?? "bg-gray-100 text-gray-800"
)}>
  {statusLabels[appt.status ?? ""] ?? appt.status}
</span>
```

**Yeni Durum Ekleme:**
```typescript
// utils.ts'e ekle:
statusLabels["ertelendi"] = "Ertelendi";
statusColors["ertelendi"] = "bg-purple-100 text-purple-800 border-purple-200";
```

DB'de de bu değer kullanılmalı — `status` kolonu `text` tipte olduğundan herhangi string kabul eder.

---

## 5. DB Schema Hatası UI'da Nasıl Görünür

`/admin/appointments/page.tsx` öğretici bir pattern kullanır:

```tsx
let dbError = false;

try {
  appointmentRecords = await db.select().from(appointments)...
} catch (error) {
  dbError = true;
}

// UI'da hata gösterimi:
{dbError && (
  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
    Veritabanı şeması güncellenmesi gerekiyor. Neon Console'da{" "}
    <code>drizzle/0001_add_missing_columns.sql</code> dosyasını çalıştırın.
  </div>
)}
```

**Tablo içinde hata state'i:**
```tsx
{appointmentRecords.length === 0 ? (
  <tr>
    <td colSpan={6} className="text-center text-gray-400">
      {dbError
        ? "Veritabanı hatası — şema güncellenmesi gerekiyor"
        : "Henüz randevu kaydı bulunmuyor"}
    </td>
  </tr>
) : (
  // Kayıtları listele
)}
```

**Sonuç:** Sayfa crash olmaz. Admin kullanıcı migration yapması gerektiğini anlar.

---

## 6. Client Component Fetch Örneği

Server Component'ler DB'ye direkt eriştir ama bazı durumlarda (kullanıcı etkileşimi sonrası refresh, form submit) client-side fetch gerekir:

```typescript
"use client";

import { useState, useEffect } from "react";

export function AppointmentList() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/appointments")
      .then(res => res.json())
      .then(data => {
        setAppointments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <ul>
      {appointments.map(appt => (
        <li key={appt.id}>{appt.patientName}</li>
      ))}
    </ul>
  );
}
```

**Ne zaman kullanılır:**
- Periyodik polling (her 30 saniyede yenile)
- Form submit sonrası liste güncelleme
- Kullanıcı aksiyonuna göre filtreleme

**Ne zaman kullanılmaz:**
- İlk sayfa yükü — Server Component daha hızlı
- Statik veriler — Server Component cache edilebilir

---

## 7. Admin Layout Yapısı

`/admin/layout.tsx`:

```tsx
import { Sidebar } from "@/components/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
```

- `Sidebar` sabit 256px (`w-64`) genişlikte, sol sabitlenmiş (`fixed inset-y-0 left-0`).
- `main` `ml-64` ile sidebar'ın sağında başlar.
- `{children}` her sayfa için değişir (Next.js nested layout).

---

## 8. Clerk Authentication Entegrasyonu

Şu anda proje Clerk package'ını içeriyor (`@clerk/nextjs`) ama middleware aktif değil. Aktifleştirmek için:

### Adım 1: middleware.ts Oluştur

`/home/user/aivoice_demo/middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Korunan route'lar
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",    // Tüm admin sayfaları
]);

// Açık API route'lar (VAPI webhook'ları auth gerektirmez)
const isPublicApiRoute = createRouteMatcher([
  "/api/vapi(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // VAPI route'ları herkese açık
  if (isPublicApiRoute(req)) return;
  
  // Admin route'ları auth gerektiriyor
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### Adım 2: Root Layout'a ClerkProvider Ekle

`/home/user/aivoice_demo/app/layout.tsx`:

```tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="tr">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### Adım 3: Environment Variables

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx

# Local geliştirme için Clerk dashboard'da izin verilecek URL:
# http://localhost:3000
```

### Auth Flow Diyagramı

```
/admin/* erişim isteği
    ↓
middleware.ts → Clerk auth kontrolü
    ↓
Oturum var mı?
  ├─ EVET → Sayfayı render et
  └─ HAYIR → /sign-in'e yönlendir (Clerk hosted page)
              (veya custom /login sayfası)
```

---

## 9. Loading State Pattern

Next.js 15'te route segment'i için `loading.tsx`:

```tsx
// app/admin/appointments/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
      <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
    </div>
  );
}
```

Bu dosya otomatik olarak Suspense boundary oluşturur. Server Component veri çekerken skeleton gösterilir.

---

## 10. Önerilen Proje Klasör Yapısı

```
app/
├── layout.tsx               ← Root layout (ClerkProvider buraya)
├── page.tsx                 ← Landing page veya / → /admin redirect
├── admin/
│   ├── layout.tsx           ← Admin layout (Sidebar)
│   ├── page.tsx             ← Dashboard
│   ├── appointments/
│   │   ├── page.tsx         ← Randevu listesi (Server Component)
│   │   └── loading.tsx      ← Skeleton
│   ├── calls/
│   │   ├── page.tsx         ← Çağrı kayıtları
│   │   └── loading.tsx
│   └── ...
└── api/
    ├── vapi/
    │   ├── availability/route.ts
    │   ├── book/route.ts
    │   ├── cancel/route.ts
    │   ├── reschedule/route.ts
    │   └── call-ended/route.ts
    ├── appointments/route.ts
    └── calls/route.ts

components/
└── sidebar.tsx              ← Client Component

lib/
└── utils.ts                 ← cn(), formatDate(), statusColors, ...

db/
├── index.ts                 ← Drizzle + Neon + Proxy
├── schema.ts                ← Table definitions + TypeScript types
└── seed.ts                  ← Seed data

middleware.ts                ← Clerk auth (eklenecek)
```
