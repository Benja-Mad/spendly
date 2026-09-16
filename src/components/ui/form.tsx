"use client";

import { Button } from "@/components/ui/button";

/**
 * Piezas de formulario compartidas.
 *
 * El desorden venía de que cada modal inventaba su propio espaciado, su propia
 * grilla y su propio pie de botones. Aquí queda una sola gramática:
 *
 *   FormBody      contenedor con scroll y respiración uniforme
 *   FormSection   agrupa campos bajo un título; solo cuando hay >1 grupo
 *   FormRow       fila de campos, 1 o 2 columnas
 *   FormFooter    siempre al pie: secundaria a la izquierda, primaria a la derecha
 */

export function FormBody({ children }: { children: React.ReactNode }) {
  return <div className="scroll-stable flex-1 space-y-6 overflow-y-auto p-6">{children}</div>;
}

export function FormSection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      {title && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function FormRow({
  columns = 2,
  children,
}: {
  columns?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-4 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>{children}</div>
  );
}

export function FormFooter({
  onCancel,
  submitting,
  disabled,
  label,
  busyLabel,
  tone = "primary",
  /** Acción destructiva opcional, alineada a la izquierda. */
  destructive,
}: {
  onCancel: () => void;
  submitting: boolean;
  disabled?: boolean;
  label: string;
  busyLabel: string;
  tone?: "primary" | "danger" | "success";
  destructive?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <div>{destructive}</div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={tone === "danger" ? "danger" : "primary"}
          disabled={submitting || disabled}
          className={tone === "success" ? "!bg-emerald-600 !bg-none hover:!bg-emerald-500" : undefined}
        >
          {submitting ? busyLabel : label}
        </Button>
      </div>
    </div>
  );
}
