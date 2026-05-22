export const dynamic = "force-dynamic";

import { db } from "@/db";
import { systemEvents, adminAuditLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatDateTime } from "@/lib/utils";
import { Shield, Info, AlertTriangle, AlertOctagon } from "lucide-react";
import { type LucideIcon } from "lucide-react";

const severityConfig: Record<string, { icon: LucideIcon; className: string }> = {
  info: { icon: Info, className: "text-blue-500" },
  warning: { icon: AlertTriangle, className: "text-yellow-500" },
  error: { icon: AlertOctagon, className: "text-red-500" },
  critical: { icon: AlertOctagon, className: "text-red-700" },
};

export default async function AuditPage() {
  let events: typeof systemEvents.$inferSelect[] = [];
  let auditLogs: typeof adminAuditLogs.$inferSelect[] = [];
  let dbError = false;

  try {
    [events, auditLogs] = await Promise.all([
      db.select().from(systemEvents).orderBy(desc(systemEvents.createdAt)).limit(50),
      db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(30),
    ]);
  } catch (e) {
    console.error("Audit fetch error:", e);
    dbError = true;
  }

  // Suppress unused variable warning - auditLogs fetched for future use
  void auditLogs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sistem Olayları & Audit</h1>
        <p className="text-sm text-gray-500 mt-1">Tüm sistem olayları ve yönetici aktiviteleri</p>
      </div>

      {dbError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Audit tabloları henüz oluşturulmamış. Neon Console&apos;da{" "}
          <code className="font-mono text-xs">drizzle/0003_observability_tables.sql</code> çalıştırın.
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Sistem Olayları</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {events.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              {dbError ? "Tablo bulunamadı" : "Henüz sistem olayı yok"}
            </p>
          ) : events.map((event) => {
            const config = severityConfig[event.severity ?? "info"] ?? severityConfig.info;
            const Icon = config.icon;
            return (
              <div key={event.id} className="flex items-start gap-4 px-6 py-3">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.className}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{event.eventType}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{event.source}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(event.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
