export const dynamic = "force-dynamic";

import { CheckCircle, XCircle, Activity } from "lucide-react";

async function checkHealth() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/health`,
      { cache: "no-store" }
    );
    return res.json();
  } catch {
    return { status: "error", checks: {}, totalLatency: 0 };
  }
}

export default async function HealthPage() {
  const health = await checkHealth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sistem Sağlığı</h1>
        <p className="text-sm text-gray-500 mt-1">Servis durumları ve bağlantı testleri</p>
      </div>

      <div className={`rounded-xl border p-5 shadow-sm ${
        health.status === "ok" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
      }`}>
        <div className="flex items-center gap-3">
          {health.status === "ok"
            ? <CheckCircle className="h-6 w-6 text-green-600" />
            : <XCircle className="h-6 w-6 text-red-600" />}
          <div>
            <p className="font-semibold text-gray-900">
              Sistem {health.status === "ok" ? "Sağlıklı" : "Sorunlu"}
            </p>
            <p className="text-sm text-gray-600">Toplam latency: {health.totalLatency ?? 0}ms</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(health.checks ?? {}).map(([name, check]: [string, unknown]) => {
          const c = check as { status: string; latency?: number; error?: string };
          return (
            <div key={name} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-gray-900 capitalize">{name}</p>
                {c.status === "healthy"
                  ? <CheckCircle className="h-5 w-5 text-green-500" />
                  : <XCircle className="h-5 w-5 text-red-500" />}
              </div>
              <p className={`text-sm ${c.status === "healthy" ? "text-green-600" : "text-red-600"}`}>
                {c.status}
              </p>
              {c.latency && <p className="text-xs text-gray-400 mt-1">Latency: {c.latency}ms</p>}
              {c.error && <p className="text-xs text-red-500 mt-1 truncate">{c.error}</p>}
            </div>
          );
        })}

        {/* Static status cards for external services */}
        {[
          { name: "VAPI", info: "dashboard.vapi.ai üzerinden kontrol edin" },
          { name: "N8N", info: "n8n cloud dashboard üzerinden kontrol edin" },
        ].map((svc) => (
          <div key={svc.name} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-gray-900">{svc.name}</p>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500">{svc.info}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
