"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { DURATION, EASE } from "@/lib/motion";

/**
 * Transición entre rutas.
 *
 * Antes usaba AnimatePresence con mode="wait": la página saliente se
 * desvanecía y recién después entraba la nueva, dejando un hueco en blanco de
 * ~150 ms en el que el layout colapsaba y luego volvía a crecer. Eso era el
 * "salto" raro al cambiar de sección.
 *
 * Ahora la ruta nueva simplemente se monta y aparece con un fundido corto, sin
 * animación de salida ni desplazamiento vertical. No hay hueco, no hay salto.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.fast, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
