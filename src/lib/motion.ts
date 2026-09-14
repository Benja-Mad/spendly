import type { Transition, Variants } from "motion/react";

/**
 * Lógica de movimiento de la app.
 *
 * Regla: nada aparece ni desaparece "porque sí". Cada transición comunica de
 * dónde viene el elemento y hacia dónde va.
 *
 *  - Contenido de página: entra subiendo levemente (viene "de abajo", del flujo
 *    de lectura) y sale bajando.
 *  - Listas: cada ítem entra escalonado, así el ojo sigue el orden.
 *  - Paneles que se despliegan: crecen desde altura 0, nunca hacen "pop".
 *  - Overlays (modal, drawer): el fondo funde, el panel escala/desliza desde el
 *    borde por el que conceptualmente entra.
 *  - Al salir, todo recorre el camino inverso.
 */

/** Curva estándar: arranque rápido, frenado suave. Sin rebote. */
export const EASE: Transition["ease"] = [0.22, 1, 0.36, 1];

export const DURATION = {
  fast: 0.15,
  base: 0.24,
  slow: 0.36,
} as const;

export const springy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.7,
};

/** Contenido principal de una página. */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: DURATION.fast, ease: EASE } },
};

/** Contenedor de lista: escalona la entrada de sus hijos. */
export const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
  exit: {},
};

/** Ítem de lista. Sale colapsando su altura para que no quede un hueco. */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
  exit: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    marginBottom: 0,
    transition: { duration: DURATION.fast, ease: EASE },
  },
};

/** Panel que se despliega en su sitio (formularios, acordeones). */
export const collapseVariants: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: { height: { duration: DURATION.base, ease: EASE }, opacity: { duration: DURATION.fast, delay: 0.06 } },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { height: { duration: DURATION.base, ease: EASE }, opacity: { duration: DURATION.fast } },
  },
};

/** Fondo oscuro de cualquier overlay. */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE } },
};

/** Panel de modal: crece desde el centro, no aparece de golpe. */
export const dialogVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springy },
  exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: DURATION.fast, ease: EASE } },
};

/** Drawer lateral: entra desde el borde izquierdo, que es donde vive. */
export const drawerVariants: Variants = {
  hidden: { x: "-100%" },
  visible: { x: 0, transition: springy },
  exit: { x: "-100%", transition: { duration: DURATION.base, ease: EASE } },
};
