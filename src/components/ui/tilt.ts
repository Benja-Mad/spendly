"use client";

import { useCallback, useEffect, useRef } from "react";

/** Inclinación máxima. Más que esto y la tarjeta se lee torcida, no inclinada. */
const MAX_DEG = 6;

/** Distancia del ojo a la tarjeta. Corta exagera la perspectiva; larga la aplana. */
const PERSPECTIVE = 800;

/** Sigue al cursor con el retraso justo para que no tiemble. */
const TRACK_MS = "120ms";

export interface TiltHandlers {
  ref: (node: HTMLElement | null) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerLeave: () => void;
  onBlur: () => void;
}

/**
 * Inclina un elemento hacia el cursor, como una tarjeta física que tomas en la
 * mano. El borde más cercano al puntero se acerca y el opuesto se aleja.
 *
 * Escribe el transform directamente sobre el style dentro de un rAF en vez de
 * pasar por estado de React: el puntero dispara decenas de eventos por segundo
 * y un render por cada uno haría trabajo inútil en toda la grilla de tarjetas.
 *
 * Se apaga solo donde no corresponde: sin cursor real (táctil) no hay hover que
 * seguir, y con prefers-reduced-motion no debe haber movimiento.
 */
export function useTilt(): TiltHandlers {
  const node = useRef<HTMLElement | null>(null);
  const frame = useRef(0);
  const enabled = useRef(false);

  const reset = useCallback(() => {
    cancelAnimationFrame(frame.current);
    const el = node.current;
    if (!el) return;
    // Vaciar las dos propiedades devuelve el control a la clase CSS, que anima
    // la vuelta al centro: el gesto de soltar la tarjeta.
    el.style.transitionDuration = "";
    el.style.transform = "";
  }, []);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      enabled.current = fine.matches && !reduced.matches;
      if (!enabled.current) reset();
    };

    sync();
    fine.addEventListener("change", sync);
    reduced.addEventListener("change", sync);

    return () => {
      fine.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
      cancelAnimationFrame(frame.current);
    };
  }, [reset]);

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    if (!enabled.current || event.pointerType === "touch") return;
    const el = node.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // -1 en un borde, 1 en el opuesto, 0 en el centro.
    const dx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const dy = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const current = node.current;
      if (!current) return;
      current.style.transitionDuration = TRACK_MS;
      // rotateX va invertido: el cursor abajo hunde el borde de abajo.
      current.style.transform =
        `perspective(${PERSPECTIVE}px) ` +
        `rotateX(${(-dy * MAX_DEG).toFixed(2)}deg) ` +
        `rotateY(${(dx * MAX_DEG).toFixed(2)}deg)`;
    });
  }, []);

  return {
    ref: (el) => {
      node.current = el;
    },
    onPointerMove,
    onPointerLeave: reset,
    // Con teclado no hay puntero, pero sí se puede salir del elemento.
    onBlur: reset,
  };
}
