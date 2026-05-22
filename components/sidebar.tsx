"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Phone,
  PhoneCall,
  Stethoscope,
  Wrench,
  Users,
  Brain,
  ChevronRight,
  Activity,
  TrendingUp,
  Heart,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Ana Sayfa",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Randevu Kayıtları",
    href: "/admin/appointments",
    icon: Calendar,
  },
  {
    label: "Form Kayıtları",
    href: "/admin/forms",
    icon: ClipboardList,
  },
  {
    label: "Çağrı Kayıtları",
    href: "/admin/calls",
    icon: Phone,
  },
  {
    label: "Arama Listesi",
    href: "/admin/call-list",
    icon: PhoneCall,
  },
  {
    label: "Doktor / Takvim",
    href: "/admin/doctors",
    icon: Stethoscope,
  },
  {
    label: "Hizmetler",
    href: "/admin/services",
    icon: Wrench,
  },
  {
    label: "Uzmanlık Alanları",
    href: "/admin/specialties",
    icon: Brain,
  },
  {
    label: "Kullanıcı Yönetimi",
    href: "/admin/users",
    icon: Users,
  },
];

const observabilityItems = [
  {
    label: "Monitoring",
    href: "/admin/monitoring",
    icon: Activity,
  },
  {
    label: "Analitik",
    href: "/admin/analytics",
    icon: TrendingUp,
  },
  {
    label: "Sistem Sağlığı",
    href: "/admin/health",
    icon: Heart,
  },
  {
    label: "Audit Kayıtları",
    href: "/admin/audit",
    icon: Shield,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-gray-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <Phone className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Klinik AI</p>
          <p className="text-xs text-gray-500">Call Center</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-indigo-600" : "text-gray-400"
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="h-3 w-3 text-indigo-400" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Divider */}
        <div className="my-3 border-t border-gray-100" />

        {/* Observability Section */}
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Gözlemlenebilirlik
        </p>
        <ul className="space-y-1">
          {observabilityItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-indigo-600" : "text-gray-400"
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="h-3 w-3 text-indigo-400" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">Yönetici</p>
            <p className="text-xs text-gray-500 truncate">admin@klinik.ai</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
