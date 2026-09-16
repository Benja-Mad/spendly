"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DURATION, EASE } from "@/lib/motion";

/*
 * El alto usa una curva simétrica: la curva estándar de la app avanza ~45% del
 * recorrido en el primer octavo del tiempo, lo que en un cambio de ~150 px se
 * percibe como un tirón.
 */
const HEIGHT_EASE = [0.4, 0, 0.2, 1] as const;

/*
 * Cuánto dura, como máximo, un cambio de capa: la salida del esqueleto más el
 * ajuste de alto que la sigue, con margen. Pasado eso, cualquier reajuste ya no
 * es parte del cambio y se aplica al instante.
 */
const SWAP_WINDOW = (DURATION.fast + DURATION.slow) * 1000 + 100;

/* useLayoutEffect no existe en el servidor; en SSR React avisa si se usa. */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Cambia entre esqueleto y contenido con un fundido cruzado, ajustando el alto
 * al contenido real.
 *
 * Dos decisiones sostienen todo lo demás:
 *
 * 1. El alto sale de UNA sola fuente: el contenedor de capas. Las dos capas
 *    viven en la misma celda de un grid, así que su alto natural ya es el mayor
 *    de las dos mientras se cruzan, y el del contenido cuando el esqueleto
 *    termina de salir. No hay dos medidas que puedan contradecirse. Se mide en
 *    useLayoutEffect, en el mismo commit que cambió el DOM y antes de pintar,
 *    para que no exista un frame con el alto viejo y el contenido nuevo.
 *
 * 2. Solo se ANIMA el alto durante el cambio esqueleto↔contenido. Cualquier
 *    otro reajuste se aplica al instante.
 *
 *    Ese segundo punto es el que arregla el corte. Antes se animaba todo cambio
 *    de alto, incluido uno de 3 px por el texto asentándose después de que el
 *    modal termina de entrar. Durante esos 360 ms la caja quedaba más baja que
 *    su contenido y, con overflow oculto, la última línea salía cortada; al
 *    terminar la animación aparecía de golpe. En Chromium el alto no se movía y
 *    no se veía nada; en Safari sí, y ahí estaba el salto.
 */
export function TransitionSwap({
  showSkeleton,
  skeleton,
  children,
}: {
  showSkeleton: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  const layersRef = useRef<HTMLDivElement>(null);
  const [naturalH, setNaturalH] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  // Un cambio de alto merece animarse solo si viene de un cambio de capa.
  const [swapping, setSwapping] = useState(false);
  const [lastShowSkeleton, setLastShowSkeleton] = useState(showSkeleton);

  // Ajuste durante el render, no dentro de un efecto: el alto del primer frame
  // del cambio ya tiene que saber que se está animando.
  if (lastShowSkeleton !== showSkeleton) {
    setLastShowSkeleton(showSkeleton);
    setSwapping(true);
  }

  /*
   * Se apaga por tiempo, no con onAnimationComplete: un cambio de capa produce
   * DOS ajustes de alto seguidos (primero al mayor de las dos capas, después al
   * del contenido cuando el esqueleto termina de salir) y el primero apagaba el
   * flag antes del segundo, dejando el encogimiento sin animar. Una ventana
   * acotada además no se puede quedar encendida.
   */
  useEffect(() => {
    if (!swapping) return;
    const id = setTimeout(() => setSwapping(false), SWAP_WINDOW);
    return () => clearTimeout(id);
  }, [swapping]);

  /*
   * Sin dependencias a propósito: corre en cada commit. Si el alto no cambió,
   * setState con el mismo valor no provoca render. offsetHeight es alto de
   * layout, ajeno al scale() con el que entra el modal.
   */
  useIsomorphicLayoutEffect(() => {
    const el = layersRef.current;
    if (el) setNaturalH(el.offsetHeight);
  });

  // Cambios que no vienen de un render: fuentes, imágenes, ancho de ventana.
  useEffect(() => {
    const el = layersRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setNaturalH(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height: naturalH ?? "auto" }}
      transition={{ duration: swapping ? DURATION.slow : 0, ease: HEIGHT_EASE }}
      onAnimationStart={() => setAnimating(true)}
      onAnimationComplete={() => setAnimating(false)}
      /*
       * Recorta solo mientras el alto se mueve por un cambio de capa, que es lo
       * que hace legible el encogimiento. En reposo nunca recorta: si alguna
       * medida llegara a quedarse corta, el contenido se ve igual en vez de
       * cortarse. Las dos condiciones son independientes a propósito.
       */
      style={{ overflow: animating && swapping ? "hidden" : "visible" }}
    >
      {/*
        [&>*]:min-w-0 — un hijo de grilla trae min-width:auto y no baja del
        ancho mínimo de su contenido. Sin esto, una fila ancha empujaba esta
        capa por encima del ancho del panel y la página entera se desplazaba de
        lado en pantallas de teléfono.
      */}
      <div ref={layersRef} className="grid min-w-0 [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:min-w-0">
        <AnimatePresence initial={false}>
          {showSkeleton ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.fast, ease: EASE }}
            >
              {skeleton}
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: DURATION.fast, ease: EASE }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
