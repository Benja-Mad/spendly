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

  return (
    <div
      className={`group flex ${ROW_HEIGHT} items-center gap-3 rounded-xl border border-zinc-100 px-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40`}
    >
      <span
        aria-hidden="true"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          income
            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
            : "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"
        }`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d={income ? "M12 19V5m0 0l-6 6m6-6l6 6" : "M12 5v14m0 0l6-6m-6 6l-6-6"} />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
          {tx.description ?? "Sin descripción"}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {TX_TYPE_LABELS[tx.type] ?? tx.type} · {formatDate(tx.occurredAt)}
        </p>
      </div>

      <p
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          income ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-white"
        }`}
      >
        {income ? "+" : "−"}{formatClp(tx.amount)}
      </p>

      {/* Ancho reservado siempre: aparecer no debe mover nada de sitio. */}
      <div
        className={`flex w-[72px] shrink-0 items-center justify-end gap-1 transition-opacity ${
          editable ? "opacity-0 group-hover:opacity-100 focus-within:opacity-100" : "opacity-0"
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
    <div className={`flex ${ROW_HEIGHT} items-center gap-3 rounded-xl border border-zinc-100 px-3 dark:border-zinc-800`}>
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-zinc-200/70 dark:bg-zinc-800" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-4 w-2/5 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800" />
      </div>
      <div className="h-4 w-20 shrink-0 animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800" />
      <div className="w-[72px] shrink-0" />
    </div>
  );
}
