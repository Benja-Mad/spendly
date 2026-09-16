"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { backdropVariants, dialogVariants } from "@/lib/motion";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
}

type Resolver = (confirmed: boolean) => void;

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(
  async () => false,
);

/** `const ok = await confirm({ title: "¿Eliminar?" })` desde cualquier componente. */
export const useConfirm = () => useContext(ConfirmContext);

/**
 * Confirmación destructiva en un diálogo centrado.
 *
 * Antes el "¿Seguro?" se expandía dentro de la propia fila: empujaba el
 * contenido de al lado, cambiaba el ancho de la tarjeta y quedaba fuera de
 * lugar. Un diálogo saca la decisión del flujo y no toca el layout.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<Resolver | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {options && <ConfirmDialog options={options} onClose={close} />}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({
  options,
  onClose,
}: {
  options: ConfirmOptions;
  onClose: (confirmed: boolean) => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const danger = options.tone !== "neutral";

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose(false);
      }}
    >
      <motion.div
        variants={dialogVariants}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose(false);
          // Focus trap mínimo: solo hay dos botones.
          if (event.key === "Tab") {
            event.preventDefault();
            const buttons = event.currentTarget.querySelectorAll("button");
            const active = document.activeElement;
            const next = active === buttons[0] ? buttons[1] : buttons[0];
            (next as HTMLElement).focus();
          }
        }}
        ref={(node) => {
          if (node) confirmRef.current?.focus();
        }}
      >
        <h2 id="confirm-title" className="text-base font-semibold text-zinc-900 dark:text-white">
          {options.title}
        </h2>
        {options.description && (
          <p className="mt-2 text-sm text-zinc-500">{options.description}</p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onClose(false)}>
            {options.cancelLabel ?? "Cancelar"}
          </Button>
          <Button
            ref={confirmRef}
            autoFocus
            variant={danger ? "danger" : "primary"}
            onClick={() => onClose(true)}
          >
            {options.confirmLabel ?? (danger ? "Eliminar" : "Confirmar")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
