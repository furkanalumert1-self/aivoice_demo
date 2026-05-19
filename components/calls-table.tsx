import { formatDateTime, formatDuration, formatCurrency, outcomeLabels } from "@/lib/utils";
import { Phone } from "lucide-react";
import Link from "next/link";
import type { Call } from "@/db/schema";

interface CallsTableProps {
  calls: Call[];
  compact?: boolean;
}

export function RecentCallsTable({ calls, compact = false }: CallsTableProps) {
  if (calls.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-sm text-gray-400">
        Henüz çağrı kaydı yok
      </p>
    );
  }

  if (compact) {
    return (
      <div className="divide-y divide-gray-50">
        {calls.map((call) => (
          <div key={call.id} className="flex items-center gap-4 px-6 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 shrink-0">
              <Phone className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {call.callerPhone ?? "Bilinmiyor"}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {call.summary?.slice(0, 55) ?? "-"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-500">{formatDuration(call.durationSeconds)}</p>
              <p className="text-xs text-gray-400">{formatCurrency(call.cost)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-gray-500">Telefon</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Tarih</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Süre</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Özet</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Sonuç</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Maliyet</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Detay</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {calls.map((call) => (
            <tr key={call.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">
                {call.callerPhone ?? "-"}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {formatDateTime(call.createdAt)}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {formatDuration(call.durationSeconds)}
              </td>
              <td className="px-4 py-3 max-w-xs text-gray-600 truncate">
                {call.summary ?? "-"}
              </td>
              <td className="px-4 py-3">
                {call.outcome ? (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    {outcomeLabels[call.outcome] ?? call.outcome}
                  </span>
                ) : "-"}
              </td>
              <td className="px-4 py-3 text-gray-600">{formatCurrency(call.cost)}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/calls/${call.id}`}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  İncele
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
