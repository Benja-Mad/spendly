"use client";

import { useId } from "react";

type FieldProps = {
  label: string;
  hint?: string;
  /** Mensaje de validación. Cuando está, reemplaza al hint. */
  error?: string;
  /** Oculta la etiqueta visualmente pero la deja disponible para lectores de pantalla. */
  srOnlyLabel?: boolean;
  className?: string;
  children: (props: { id: string; "aria-describedby"?: string }) => React.ReactNode;
};

/**
 * Asocia label <-> control con un id generado. Antes casi todos los campos
 * fuera de los formularios de auth usaban solo placeholder, que desaparece
 * al escribir y no lo anuncia ningun lector de pantalla.
 */
export function Field({ label, hint, error, srOnlyLabel, className, children }: FieldProps) {
  const id = useId();
  // El error ocupa el lugar del hint: dos textos bajo el campo compiten, y el
  // que importa cuando hay un error es el error.
  const messageId = error || hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={
          srOnlyLabel
            ? "sr-only"
            : "mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
        }
      >
        {label}
      </label>
      {children({ id, "aria-describedby": messageId })}
      {(error || hint) && (
        <p
          id={messageId}
          role={error ? "alert" : undefined}
          className={`mt-1.5 text-xs ${error ? "text-red-600 dark:text-red-400" : "text-zinc-400"}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

/** Alto fijo (h-11) para que todo campo de una fila quede alineado. */
export const inputClass =
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900 transition-colors placeholder:text-zinc-400 hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:border-zinc-600";
