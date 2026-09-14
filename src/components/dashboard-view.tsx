"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Transaction } from "@/lib/types";
import { formatClp } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useDashboard } from "@/lib/swr";
import { notify } from "@/lib/toast";
import { collapseVariants, itemVariants, listVariants } from "@/lib/motion";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { TransitionSwap } from "@/components/ui/transition-swap";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionModal } from "@/components/transaction-modal";
import { TransactionRow, TransactionRowSkeleton } from "@/components/transaction-row";

export function DashboardView() {
  const { data, error, isLoading, mutate } = useDashboard();
  const confirm = useConfirm();
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [creating, setCreating] = useState(false);

  const runAction = async (
    runner: () => Promise<unknown>,
    messages: { loading: string; success: string },
  ) => {
    setSubmitting(true);
    try {
      await notify.promise(
        (async () => {
          await runner();
          await mutate();
        })(),
        messages,
      );
    } catch {
      // el toast reporta el error
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (tx: Transaction) => {
    const ok = await confirm({
      title: "¿Eliminar este movimiento?",
      description: `${tx.description ?? "Sin descripción"} · ${formatClp(tx.amount)}`,
    });
    if (!ok) return;
    await runAction(() => requestJson(`/api/transactions/${tx.id}`, { method: "DELETE" }), {
      loading: "Eliminando movimiento...",
      success: "Movimiento eliminado",
    });
  };

  const onMarkRead = (id: string) =>
    runAction(() => requestJson(`/api/alerts/${id}`, { method: "PATCH", body: JSON.stringify({}) }), {
      loading: "Marcando...",
      success: "Alerta marcada como leída",
    });

  if (!isLoading && !data) {
    return (
      <div className="py-10 text-center">
        <p className="text-zinc-500">No se pudo cargar la información.</p>
        {error && <p className="mt-2 text-sm text-red-500">{errorMessage(error, "")}</p>}
        <Button variant="primary" className="mt-4" onClick={() => mutate()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const loading = isLoading && !data;
  const recent = data?.transactions.slice(0, 6) ?? [];
  const unreadAlerts = data?.alerts.filter((a) => !a.isRead).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Resumen de tus finanzas" />

      {/*
        Jerarquía: una sola cifra protagonista (lo que puedes gastar hoy) y tres
        métricas de apoyo. Antes eran cuatro bloques con gradientes saturados
        del mismo tamaño, compitiendo entre sí sin decir cuál importa.
      */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <TransitionSwap showSkeleton={loading} skeleton={<Skeleton className="h-[132px] rounded-2xl" />}>
          <div className="h-[132px] rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
            <p className="text-sm font-medium text-white/80">Disponible</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{formatClp(data?.summary.available ?? 0)}</p>
            <p className="mt-2 text-xs text-white/70">En cuentas de débito, corriente y efectivo</p>
          </div>
        </TransitionSwap>

        <TransitionSwap
          showSkeleton={loading}
          skeleton={
            <div className="grid h-[132px] gap-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[41px] rounded-xl" />)}
            </div>
          }
        >
          <div className="grid h-[132px] gap-2">
            <MiniStat label="Total" value={formatClp(data?.summary.total ?? 0)} />
            <MiniStat label="Ahorrado" value={formatClp(data?.summary.saved ?? 0)} tone="emerald" />
            <MiniStat label="Deuda crédito" value={formatClp(data?.summary.pendingCreditDebt ?? 0)} tone="red" />
          </div>
        </TransitionSwap>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Últimos movimientos"
          action={
            (data?.accounts.length ?? 0) > 0 ? (
              <Button size="sm" onClick={() => setCreating(true)}>+ Movimiento</Button>
            ) : undefined
          }
        >
          <TransitionSwap
            showSkeleton={loading}
            skeleton={
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <TransactionRowSkeleton key={i} />)}
              </div>
            }
          >
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">Sin movimientos registrados.</p>
            ) : (
              <motion.ul variants={listVariants} initial="hidden" animate="visible" className="space-y-2">
                <AnimatePresence initial={false}>
                  {recent.map((tx) => (
                    <motion.li key={tx.id} layout variants={itemVariants} exit="exit" className="overflow-hidden">
                      <TransactionRow
                        tx={tx}
                        disabled={submitting}
                        {...(tx.origin === "manual" && (tx.type === "income" || tx.type === "expense")
                          ? { onEdit: () => setEditing(tx), onDelete: () => onDelete(tx) }
                          : {})}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </TransitionSwap>
        </Panel>

        <Panel
          title="Alertas"
          action={
            unreadAlerts > 0 ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                {unreadAlerts} sin leer
              </span>
            ) : undefined
          }
        >
          <TransitionSwap
            showSkeleton={loading}
            skeleton={
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-xl" />)}
              </div>
            }
          >
            {(data?.alerts.length ?? 0) === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">Sin alertas pendientes.</p>
            ) : (
              <motion.ul variants={listVariants} initial="hidden" animate="visible" className="space-y-2">
                <AnimatePresence initial={false}>
                  {data?.alerts.map((alert) => (
                    <motion.li
                      key={alert.id}
                      layout
                      variants={itemVariants}
                      exit="exit"
                      className={`overflow-hidden rounded-xl border p-3 ${
                        alert.isRead
                          ? "border-zinc-100 dark:border-zinc-800"
                          : "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20"
                      }`}
                    >
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{alert.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{alert.body}</p>
                      <AnimatePresence initial={false}>
                        {!alert.isRead && (
                          <motion.div variants={collapseVariants} initial="hidden" animate="visible" exit="exit" className="overflow-hidden">
                            <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={() => onMarkRead(alert.id)} disabled={submitting}>
                              Marcar leída
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </TransitionSwap>
        </Panel>
      </div>

      <AnimatePresence>
        {creating && data && (
          <TransactionModal
            key="create-tx"
            accounts={data.accounts}
            categories={data.categories}
            onClose={() => setCreating(false)}
          />
        )}
        {editing && data && (
          <TransactionModal
            key="edit-tx"
            accounts={data.accounts}
            categories={data.categories}
            transaction={editing}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex h-8 items-center justify-between gap-3">
        <h2 className="font-semibold text-zinc-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "red" }) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "red"
      ? "text-red-600 dark:text-red-400"
      : "text-zinc-900 dark:text-white";

  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}
