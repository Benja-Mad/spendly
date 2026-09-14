"use client";

import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost" | "dashed";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Ocupa todo el ancho disponible. */
  block?: boolean;
}

/*
 * Único botón de la app.
 *
 * Antes había 62 botones escritos a mano con 12 combinaciones distintas de
 * padding, así que dos botones en la misma posición de dos pantallas tenían
 * altura y peso visual diferentes. Aquí el tamaño lo fija `size` y el peso
 * visual lo fija `variant`; el color solo comunica intención, no jerarquía.
 */
const VARIANTS: Record<Variant, string> = {
  // Acción principal de una pantalla o formulario. Una sola por contexto.
  primary:
    "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm hover:shadow-md active:shadow-sm",
  // Acción secundaria con contorno.
  secondary:
    "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
  // Acción terciaria, sin peso (Cancelar, Cerrar).
  ghost:
    "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-500",
  "danger-ghost":
    "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30",
  // Añadir un elemento a una lista, en el lugar donde se añadirá.
  dashed:
    "border border-dashed border-zinc-300 text-zinc-500 hover:border-emerald-400 hover:text-emerald-600 dark:border-zinc-700 dark:hover:border-emerald-500 dark:hover:text-emerald-400",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-11 gap-2 px-4 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", block, className = "", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center rounded-xl font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${SIZES[size]} ${VARIANTS[variant]} ${block ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
});

/** Botón de solo icono. Cuadrado, mismo alto que el resto. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    tone?: "neutral" | "danger";
    size?: Size;
  }
>(function IconButton({ label, tone = "neutral", size = "sm", className = "", ...props }, ref) {
  const toneClass =
    tone === "danger"
      ? "text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
      : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        size === "sm" ? "h-8 w-8" : "h-11 w-11"
      } ${toneClass} ${className}`}
      {...props}
    />
  );
});
