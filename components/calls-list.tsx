"use client";

import { useState } from "react";
import { Phone, X, FileText, Clock } from "lucide-react";
import { AudioPlayer } from "@/components/audio-player";
import { formatDateTime, formatDuration } from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";

const intentConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  randevu_alma:  { label: "Randevu Alma",  color: "text-teal-700",  bg: "bg-teal-50",   dot: "bg-teal-500"   },
  randevu_iptal: { label: "Randevu İptal", color: "text-red-700",   bg: "bg-red-50",    dot: "bg-red-500"    },
  bilgi:         { label: "Bilgi",         color: "text-blue-700",  bg: "bg-blue-50",   dot: "bg-blue-500"   },
  geri_arama:    { label: "Geri Arama",    color: "text-amber-700", bg: "bg-amber-50",  dot: "bg-amber-500"  },
  diger:         { label: "Diğer",         color: "text-gray-600",  bg: "bg-gray-100",  dot: "bg-gray-400"   },
};

export type CallRow = {
  id: string;
  callerNumber: string | null;
  vapiCallId: string | null;
  transcript: string | null;
  summary: string | null;
  duration: number | null;
  intent: string | null;
  callStatus: string | null;
  cost: string | null;
  recordingUrl: string | null;
  createdAt: Date | null;
};

export function CallsList({ calls }: { calls: CallRow[] }) {
  const [open, setOpen] = useState<CallRow | null>(null);

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Phone className="h-10 w-10 mb-3 text-gray-200" />
        <p className="text-[13px] text-gray-400">Henüz çağrı kaydı bulunmuyor</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70">
              {["Telefon", "Tarih", "Süre", "Özet", "Niyet", ""].map((h) => (
                <th key={h} className="px-5 py-3 text-left label-mono text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {calls.map((call) => {
              const intent = intentConfig[call.intent ?? "diger"] ?? intentConfig.diger;
              return (
                <tr
                  key={call.id}
                  onClick={() => setOpen(call)}
                  className="hover:bg-gray-50/60 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 group-hover:bg-teal-100 transition-colors">
                        <Phone className="h-3.5 w-3.5 text-teal-500" />
                      </div>
                      <span className="font-medium text-gray-900 tnum">{call.callerNumber || "Bilinmiyor"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 tnum whitespace-nowrap text-[12px]">{formatDateTime(call.createdAt)}</td>
                  <td className="px-5 py-3.5 tnum text-gray-600 whitespace-nowrap text-[13px]">{formatDuration(call.duration)}</td>
                  <td className="px-5 py-3.5 max-w-xs">
                    <p className="text-gray-600 truncate text-[12.5px]">{call.summary || "—"}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    {call.intent ? (
                      <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold", intent.bg, intent.color)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", intent.dot)} />
                        {intent.label}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/calls/${call.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] text-teal-600 hover:text-teal-700 font-medium"
                    >
                      Detay →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Transcript Drawer — Vox style */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            aria-label="Kapat"
            onClick={() => setOpen(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <div className="animate-slide-in relative flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-[var(--shadow-pop)]">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50">
                <Phone className="h-4.5 w-4.5 text-teal-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900 truncate tnum">{open.callerNumber ?? "Bilinmiyor"}</p>
                <p className="text-[11px] text-gray-400 tnum">{formatDateTime(open.createdAt)}</p>
              </div>
              {open.intent && (() => {
                const cfg = intentConfig[open.intent] ?? intentConfig.diger;
                return (
                  <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold shrink-0", cfg.bg, cfg.color)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                    {cfg.label}
                  </span>
                );
              })()}
              <button onClick={() => setOpen(null)} className="grid h-8 w-8 place-items-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-5 border-b border-gray-100 px-5 py-3 text-[12px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span className="tnum">{formatDuration(open.duration)}</span>
              </span>
              {open.cost && (
                <span className="tnum">${Number(open.cost).toFixed(4)}</span>
              )}
              {open.callStatus && (
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", open.callStatus === "completed" ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700")}>
                  {open.callStatus === "completed" ? "Tamamlandı" : open.callStatus}
                </span>
              )}
            </div>

            {/* Audio player */}
            {open.recordingUrl && (
              <div className="border-b border-gray-100 px-5 py-3">
                <p className="label-mono text-gray-400 mb-2">Kayıt</p>
                <AudioPlayer src={`/api/audio/proxy?url=${encodeURIComponent(open.recordingUrl)}`} />
              </div>
            )}

            {/* Summary */}
            {open.summary && (
              <div className="border-b border-gray-100 px-5 py-4">
                <p className="label-mono text-gray-400 mb-2">Özet</p>
                <p className="text-[13px] text-gray-700 leading-relaxed">{open.summary}</p>
              </div>
            )}

            {/* Transcript */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {open.transcript ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                    <p className="label-mono text-gray-400">Transkript</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-[12.5px] text-gray-700 leading-relaxed whitespace-pre-wrap">{open.transcript}</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
                  <FileText className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-[13px]">Transkript mevcut değil</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 py-3">
              <Link
                href={`/admin/calls/${open.id}`}
                className="block w-full rounded-lg bg-teal-600 px-4 py-2 text-center text-[13px] font-semibold text-white hover:bg-teal-700 transition-colors"
              >
                Detaylı görünüm →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
