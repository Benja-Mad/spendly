"use client";

import { Transaction } from "@/lib/types";
import { formatClp, formatDate } from "@/lib/utils";
import { TX_TYPE_LABELS, isIncomeType } from "@/lib/labels";
import { IconButton } from "@/components/ui/button";

/**
 * Fila de movimiento. Alto fijo (ROW_HEIGHT) y las acciones ocupan siempre su
 * espacio: solo cambian de opacidad al pasar el mouse o al recibir foco. Así la
 * fila nunca cambia de tamaño y el esqueleto puede calzar exactamente.
 */
export const ROW_HEIGHT = "h-[68px]";

export function TransactionRow({
  tx,
  onEdit,
  onDelete,
  disabled,
}: {
  tx: Transaction;
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}) {
  const income = isIncomeType(tx.type);
  const editable = Boolean(onEdit && onDelete);
  const montoColor = income
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-zinc-900 dark:text-white";

  return (
    <div
      className={`group flex ${ROW_HEIGHT} min-w-0 items-center gap-2 rounded-xl border border-zinc-100 px-2.5 transition-colors hover:bg-zinc-50 sm:gap-3 sm:px-3 dark:border-zinc-800 dark:hover:bg-zinc-800/40`}
    >
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9 ${
          income
            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
            : "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"
        }`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d={income ? "M12 19V5m0 0l-6 6m6-6l6 6" : "M12 5v14m0 0l6-6m-6 6l-6-6"} />
        </svg>
      </span>

      {/*
        overflow-hidden aquí, no solo en los <p>: un hijo flex no baja de su
        ancho mínimo de contenido a menos que él mismo recorte. Sin esto la
        línea "Ingreso · 12 sept 2026" (que truncate deja en una sola línea)
        fijaba un mínimo de 131 px, la fila no podía encogerse y en pantallas de
        teléfono la página entera se desplazaba de lado.
      */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
          {tx.description ?? "Sin descripción"}
        </p>
        {/*
          En pantalla angosta la palabra "Ingreso"/"Gasto" se omite: la flecha
          de la izquierda, verde hacia arriba o roja hacia abajo, ya lo dice. Es
          espacio gastado en repetir algo que se ve, y con él la fecha cabía
          entera en vez de quedar en "12 ...".
        */}
        {/*
          En angosto el monto baja a esta segunda línea. Como columna propia se
          llevaba 76 px fijos que, junto a los 72 de las acciones, dejaban la
          descripción en "C..". Aquí la descripción se queda con toda la primera
          línea y el monto sigue alineado a la derecha.
        */}
        <div className="flex items-baseline justify-between gap-1.5">
          <p className="truncate text-xs text-zinc-500">
            <span className="hidden sm:inline">{TX_TYPE_LABELS[tx.type] ?? tx.type} · </span>
            {formatDate(tx.occurredAt)}
          </p>
          <p className={`shrink-0 text-sm font-semibold tabular-nums sm:hidden ${montoColor}`}>
            {income ? "+" : "−"}{formatClp(tx.amount)}
          </p>
        </div>
      </div>

      <p className={`hidden shrink-0 text-sm font-semibold tabular-nums sm:block ${montoColor}`}>
        {income ? "+" : "−"}{formatClp(tx.amount)}
      </p>

      {/*
        Ancho reservado siempre: aparecer no debe mover nada de sitio.

        Y visibles por defecto: donde no hay cursor no hay hover que las revele,
        así que en un teléfono editar o borrar un movimiento era imposible. Solo
        donde SÍ hay cursor se esconden hasta el hover.
      */}
      <div
        className={`flex w-[72px] shrink-0 items-center justify-end gap-1 transition-opacity ${
          editable
            ? "opacity-100 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-within:opacity-100"
            : "opacity-0"
        }`}
      >
        {editable && (
          <>
            <IconButton label="Editar movimiento" onClick={onEdit} disabled={disabled}>
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </IconButton>
            <IconButton label="Eliminar movimiento" tone="danger" onClick={onDelete} disabled={disabled}>
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </IconButton>
          </>
        )}
      </div>
    </div>
  );
}

/** Esqueleto con exactamente la misma altura y estructura que la fila real. */
export function TransactionRowSkeleton() {
  return (
    <div className={`flex ${ROW_HEIGHT} min-w-0 items-center gap-2 rounded-xl border border-zinc-100 px-2.5 sm:gap-3 sm:px-3 dark:border-zinc-800`}>
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-zinc-200/70 sm:h-9 sm:w-9 dark:bg-zinc-800" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-4 w-2/5 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800" />
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-3/5 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800" />
          <div className="h-4 w-20 shrink-0 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800 sm:hidden" />
        </div>
      </div>
      <div className="hidden h-4 w-20 shrink-0 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800 sm:block" />
      <div className="w-[72px] shrink-0" />
    </div>
  );
}
