"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { backdropVariants, drawerVariants } from "@/lib/motion";
import { usePathname } from "next/navigation";
import { SidebarContent } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { PageTransition } from "@/components/ui/page-transition";
import { SettingsModal } from "@/components/settings-modal";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // Ajuste de estado durante el render (patron recomendado por React) en vez de
  // un setState dentro de useEffect: cierra el drawer al cambiar de ruta sin
  // provocar un render extra ni un overlay invisible capturando clicks.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Si hay un menú/popover abierto encima, Escape es suyo: cerrar tambien
      // el drawer haria desaparecer dos capas de un teclazo.
      if (document.querySelector("[data-radix-popper-content-wrapper]")) return;
      setMobileOpen(false);
    };
    const media = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = () => media.matches && setMobileOpen(false);

    document.addEventListener("keydown", onKeyDown);
    media.addEventListener("change", onBreakpoint);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      media.removeEventListener("change", onBreakpoint);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg dark:focus:bg-zinc-900"
      >
        Saltar al contenido
      </a>

      <div className="flex min-h-dvh bg-zinc-50 dark:bg-black">
        {/* Desktop: sidebar fija que no scrollea con el contenido. */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex dark:border-zinc-800 dark:bg-zinc-950">
          <SidebarContent onOpenSettings={() => setSettingsOpen(true)} />
        </aside>

        {/* Movil: drawer. Antes la sidebar era w-64 fija y se comia la pantalla. */}
        <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              variants={backdropVariants}
              initial="hidden" animate="visible" exit="exit"
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              variants={drawerVariants}
              initial="hidden" animate="visible" exit="exit"
              role="dialog"
              aria-modal="true"
              aria-label="Menú de navegación"
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex justify-end px-3 pt-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Cerrar menú"
                  className="cursor-pointer rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                >
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <SidebarContent
                onNavigate={() => setMobileOpen(false)}
                onOpenSettings={() => { setMobileOpen(false); setSettingsOpen(true); }}
              />
            </motion.aside>
          </div>
        )}
        </AnimatePresence>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-950/90">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={mobileOpen}
              className="cursor-pointer rounded-xl p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
                S
              </div>
              <span className="font-bold text-zinc-900 dark:text-white">Spendly</span>
            </div>
          </header>

          <main id="contenido" className="flex-1 p-4 sm:p-6 lg:p-8">
            {/* Ancho unico para todas las paginas: antes cada una usaba el suyo
                (max-w-2xl, max-w-4xl o full) y cambiar de tab daba un salto. */}
            <div className="mx-auto w-full max-w-5xl">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {settingsOpen && <SettingsModal key="settings" onClose={() => setSettingsOpen(false)} />}
      </AnimatePresence>
    </AuthGuard>
  );
}
