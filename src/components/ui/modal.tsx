"use client";

import { useEffect, useId, useRef } from "react";
import { motion } from "motion/react";
import { backdropVariants, dialogVariants } from "@/lib/motion";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Ancho maximo del panel. Por defecto max-w-xl. */
  size?: "xl" | "2xl";
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shell de modal accesible: role=dialog, cierre con Escape, focus trap,
 * bloqueo del scroll de fondo y devolucion del foco al cerrar.
 * Antes cada modal era un div suelto sin ninguna de estas cosas.
 */
export function Modal({ title, onClose, children, size = "xl" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  /*
   * onClose llega como arrow function inline desde cada padre, así que cambia
   * de identidad en cada render. Guardarla en una ref permite que el efecto de
   * abajo corra UNA sola vez, al montar.
   *
   * Antes el efecto dependía de onClose y se re-ejecutaba en cada render — o
   * sea, en cada tecla escrita en el formulario: devolvía el foco al primer
   * campo, reasignaba el "foco anterior" al input activo y dejaba escapar el
   * bloqueo de scroll. Escribir en cualquier campo que no fuera el primero era
   * imposible, y al cerrar el fondo quedaba sin scroll.
   */
  const onCloseRef = useRef(onClose);

  // Asignar la ref en un efecto, no durante el render.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    document.addEventListener("keydown", handleKeyDown);

    const firstField = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    firstField?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
    // Intencionalmente sin dependencias: el ciclo es montar/desmontar.
  }, []);

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        // Solo cierra si el gesto empieza y termina en el backdrop, para no
        // descartar el formulario cuando se arrastra el mouse desde adentro.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        variants={dialogVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[90vh] w-full ${
          size === "2xl" ? "max-w-2xl" : "max-w-xl"
        } flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 id={titleId} className="text-lg font-bold text-zinc-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            title="Cerrar"
            className="shrink-0 cursor-pointer rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
