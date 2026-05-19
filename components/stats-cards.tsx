import { Phone, Calendar, Clock, DollarSign, XCircle } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface StatsProps {
  stats: {
    todayCalls: number;
    aiAppointments: number;
    avgDuration: number;
    totalCost: number;
    cancelledAppointments: number;
  };
}

export function StatsCards({ stats }: StatsProps) {
  const cards = [
    {
      label: "Bugünkü Çağrı Sayısı",
      value: stats.todayCalls,
      icon: Phone,
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
      borderColor: "border-indigo-100",
    },
    {
      label: "AI Alınan Randevu",
      value: stats.aiAppointments,
      icon: Calendar,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      borderColor: "border-green-100",
    },
    {
      label: "Ortalama Görüşme Süresi",
      value: formatDuration(stats.avgDuration),
      icon: Clock,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      borderColor: "border-blue-100",
    },
    {
      label: "Toplam AI Maliyeti",
      value: `$${stats.totalCost.toFixed(2)}`,
      icon: DollarSign,
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
      borderColor: "border-amber-100",
    },
    {
      label: "İptal Edilen Randevu",
      value: stats.cancelledAppointments,
      icon: XCircle,
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
      borderColor: "border-red-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-xl border ${card.borderColor} bg-white p-5 shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{card.label}</p>
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}
