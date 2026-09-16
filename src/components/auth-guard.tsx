"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * Verificación de sesión del lado del cliente.
 *
 * La puerta real es el middleware, que corre en el servidor y ya redirige a
 * /login cualquier ruta protegida sin sesión: para cuando este componente
 * monta, la sesión existe. Por eso el contenido se renderiza de inmediato en
 * vez de bloquearse tras un spinner a pantalla completa en cada carga.
 *
 * Esto sigue redirigiendo si la sesión falta o se cierra (por ejemplo, logout
 * en otra pestaña); solo deja de bloquear el primer render mientras comprueba.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let active = true;

    const redirectToLogin = () => {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
    };

    supabase.auth.getSession().then((result: { data: { session: unknown | null } }) => {
      if (active && !result.data.session) redirectToLogin();
    });

    // Cubre el cierre de sesión hecho en otra pestaña.
    const { data: sub } = supabase.auth.onAuthStateChange((event: string) => {
      if (active && event === "SIGNED_OUT") redirectToLogin();
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router, pathname]);

  return <>{children}</>;
}
