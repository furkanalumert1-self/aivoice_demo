"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Calendar, Phone,
  Stethoscope, Wrench, Users, Brain,
  Settings, LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Genel",
    items: [
      { label: "Ana Sayfa",         href: "/admin",              icon: LayoutDashboard, exact: true },
      { label: "Randevu Kayıtları", href: "/admin/appointments", icon: Calendar },
      { label: "Çağrı Kayıtları",   href: "/admin/calls",        icon: Phone },
    ],
  },
  {
    label: "Klinik",
    items: [
      { label: "Doktor / Takvim",    href: "/admin/doctors",     icon: Stethoscope },
      { label: "Hizmetler",          href: "/admin/services",    icon: Wrench },
      { label: "Uzmanlık Alanları",  href: "/admin/specialties", icon: Brain },
      { label: "Kullanıcı Yönetimi", href: "/admin/users",       icon: Users },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-gray-100 bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-gray-100">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundImage: "var(--grad-brand)" }}>
          <Phone className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-[13.5px] font-bold text-gray-900 leading-tight">Klinik AI</p>
          <p className="text-[11px] text-gray-400 leading-tight">Call Center</p>
        </div>
      </div>

      {/* Status pill */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
          <span className="pulse-dot h-2 w-2 rounded-full bg-teal-500 shrink-0" />
          <span className="text-[12px] text-gray-600 font-medium">Sistem aktif</span>
          <span className="ml-auto label-mono text-gray-400">VAPI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="label-mono px-3 pb-1.5 pt-2 text-gray-400">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href, item.exact);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13.5px] font-medium transition-colors",
                      active ? "nav-pill-active text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-teal-600" : "text-gray-400 group-hover:text-gray-500")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer links */}
      <div className="border-t border-gray-100 px-3 py-2 space-y-0.5">
        <Link href="/admin/settings" className="flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <Settings className="h-4 w-4 text-gray-400" />
          Ayarlar
        </Link>
        <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <LifeBuoy className="h-4 w-4 text-gray-400" />
          Destek
        </button>
      </div>

      {/* User card */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 px-2.5 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ backgroundImage: "var(--grad-brand)" }}>KA</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-gray-900">Klinik Yönetici</p>
            <p className="truncate text-[11px] text-gray-500">admin@klinik.ai</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
