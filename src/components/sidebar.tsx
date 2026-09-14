"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { preload } from "swr";
import { requestJson } from "@/lib/api";
import { DASHBOARD_KEY, JUNTAS_KEY } from "@/lib/swr";
import { UserMenu } from "@/components/user-menu";

const tabs = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/tarjetas",
    label: "Tarjetas",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    href: "/ahorros",
    label: "Ahorros",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/juntas",
    label: "Juntas",
    icon: (
      <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

const PREFETCH_KEYS: Record<string, string> = {
  "/dashboard": DASHBOARD_KEY,
  "/tarjetas": DASHBOARD_KEY,
  "/ahorros": DASHBOARD_KEY,
  "/juntas": JUNTAS_KEY,
};

const warm = (href: string) => {
  const key = PREFETCH_KEYS[href];
  if (key) preload(key, (url: string) => requestJson(url, { cache: "no-store" }));
};

export function SidebarContent({
  onNavigate,
  onOpenSettings,
}: {
  onNavigate?: () => void;
  onOpenSettings: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-2 border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
          S
        </div>
        <span className="text-lg font-bold text-zinc-900 dark:text-white">Spendly</span>
      </div>

      <nav aria-label="Navegación principal" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch
              onMouseEnter={() => warm(tab.href)}
              onFocus={() => warm(tab.href)}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/*
        El usuario al pie, como en la mayoría de las apps. Abre un menú, no una
        vista: el tema y el cierre de sesión se resuelven ahí mismo y solo el
        perfil —que sí es un formulario— abre el modal.
      */}
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <UserMenu onOpenSettings={onOpenSettings} />
      </div>
    </>
  );
}
