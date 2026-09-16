/**
 * Bloque gris que reserva el sitio de un dato que todavía no llegó.
 *
 * Es la única pieza genérica a propósito. Cada esqueleto con forma vive junto
 * al componente que imita (TransactionRowSkeleton en transaction-row.tsx,
 * AccountCardSkeleton en account-card.tsx, y así), porque un esqueleto y su
 * componente tienen que cambiar juntos: separados se desincronizan y aparecen
 * los desajustes de altura.
 *
 * Antes había aquí tres esqueletos genéricos (CardSkeleton, ListSkeleton,
 * PageSkeleton) que se usaban donde no correspondían: ListSkeleton hacía de
 * lista de movimientos en una vista mientras las otras dos usaban la forma
 * real, y PageSkeleton no se usaba en ninguna parte.
 *
 * La regla de cuándo mostrarlos está en PATTERNS.md.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-zinc-200/70 dark:bg-zinc-800 ${className}`}
    />
  );
}
