import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  return format(new Date(date), "d MMMM yyyy", { locale: tr });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "-";
  return format(new Date(date), "d MMMM yyyy HH:mm", { locale: tr });
}

export function formatTime(date: Date | string | null): string {
  if (!date) return "-";
  return format(new Date(date), "HH:mm", { locale: tr });
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatCurrency(amount: string | number | null): string {
  if (!amount) return "-";
  return `$${Number(amount).toFixed(4)}`;
}

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
