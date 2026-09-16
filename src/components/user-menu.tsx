"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { Theme, useTheme } from "@/components/theme-provider";
import { useProfile } from "@/lib/swr";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

const THEMES: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Claro",
    icon: (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Oscuro",
    icon: (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
  },
  {
    value: "system",
    label: "Automático",
    icon: (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const ITEM =
  "group relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors";

/**
 * Menú del usuario, al pie de la sidebar.
 *
 * El tema y el cierre de sesión son interruptores de un clic: hacerlos vivir
 * dentro del modal de ajustes obligaba a abrir un overlay, buscar la sección y
 * cerrarlo, para algo que se resuelve al instante. Aquí están a un clic; el
 * modal queda para lo único que sí es un formulario, el perfil.
 */
export function UserMenu({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { data, isLoading } = useProfile();
  const profile = data?.profile;
  const { theme, setTheme } = useTheme();
  const confirm = useConfirm();

  /*
   * En frío no hay nombre ni correo todavía. Rellenar con "Mi cuenta" mostraba
   * dos veces el mismo texto de relleno y lo hacía pasar por un dato real; el
   * esqueleto dice lo que de verdad está pasando y no cambia de alto al llegar.
   */
  const loading = isLoading && !profile;
  const name = profile?.username || profile?.email?.split("@")[0] || "Mi cuenta";

  const onLogout = async () => {
    const ok = await confirm({
      title: "¿Cerrar sesión?",
      description: "Tendrás que volver a iniciar sesión para entrar.",
      confirmLabel: "Cerrar sesión",
      tone: "neutral",
    });
    if (!ok) return;
    const supabase = (await import("@/lib/supabase-browser")).getSupabaseBrowser();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <Menu.Root>
      <Menu.Trigger className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors hover:bg-zinc-100 focus-visible:bg-zinc-100 data-[state=open]:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800 dark:data-[state=open]:bg-zinc-800">
        {loading ? (
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold uppercase text-white">
            {name[0]}
          </span>
        )}
        <span className="min-w-0 flex-1">
          {loading ? (
            /* Mismas alturas de línea que el texto real: al llegar el perfil no
               se mueve nada, solo cambia el contenido. */
            <>
              <span className="flex h-5 items-center">
                <Skeleton className="h-3 w-24 rounded" />
              </span>
              <span className="flex h-4 items-center">
                <Skeleton className="h-2.5 w-32 rounded" />
              </span>
            </>
          ) : (
            <>
              <span className="block truncate text-sm font-medium text-zinc-900 dark:text-white">{name}</span>
              <span className="block truncate text-xs text-zinc-500">{profile?.email ?? ""}</span>
            </>
          )}
        </span>
        {/* Chevrones opuestos: el menú puede abrirse hacia cualquier lado. */}
        <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
        </svg>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Content
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-[90] w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 origin-[var(--radix-dropdown-menu-content-transform-origin)] rounded-xl border border-zinc-200 bg-white p-1 shadow-xl data-[side=bottom]:[--menu-shift:-4px] data-[side=top]:[--menu-shift:4px] data-[state=closed]:animate-[menuOut_120ms_ease-in] data-[state=open]:animate-[menuIn_180ms_cubic-bezier(0.22,1,0.36,1)] dark:border-zinc-700 dark:bg-zinc-900"
        >
          <Menu.Item
            onSelect={onOpenSettings}
            className={`${ITEM} text-zinc-700 focus:bg-zinc-100 dark:text-zinc-200 dark:focus:bg-zinc-800`}
          >
            <svg aria-hidden="true" className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Ajustes de perfil
          </Menu.Item>

          <Menu.Separator className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />

          <Menu.Label className="px-3 pb-1 pt-1.5 text-xs font-medium text-zinc-400">
            Apariencia
          </Menu.Label>
          <Menu.RadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
            {THEMES.map((option) => (
              <Menu.RadioItem
                key={option.value}
                value={option.value}
                /* El tema se prueba mirando: cerrar el menú al elegirlo
                   obligaría a reabrirlo para comparar. */
                onSelect={(event) => event.preventDefault()}
                className={`${ITEM} pr-9 text-zinc-700 focus:bg-zinc-100 data-[state=checked]:text-emerald-700 dark:text-zinc-200 dark:focus:bg-zinc-800 dark:data-[state=checked]:text-emerald-400`}
              >
                <span className="text-zinc-400 group-data-[state=checked]:text-current">{option.icon}</span>
                {option.label}
                <Menu.ItemIndicator className="absolute right-3 inline-flex">
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>

          <Menu.Separator className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />

          <Menu.Item
            onSelect={onLogout}
            className={`${ITEM} text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-950/40`}
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
