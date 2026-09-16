"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { formatClp, formatDate } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useDashboard } from "@/lib/swr";
import { notify } from "@/lib/toast";
import { itemVariants, listVariants } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { TransitionSwap } from "@/components/ui/transition-swap";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CreateSavingsModal } from "./create-savings-modal";
import { EditSavingsModal } from "./edit-savings-modal";
import { Button } from "@/components/ui/button";

export function AhorrosView() {
  const { data, error, isLoading, mutate } = useDashboard();
  const [submitting, setSubmitting] = useState(false);
  const [showCreateFund, setShowCreateFund] = useState(false);
  const [editingFundId, setEditingFundId] = useState<string | null>(null);

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
      // el toast ya reporta el error
    } finally {
      setSubmitting(false);
    }
  };

  const onRunRecurring = () =>
    runAction(
      () => requestJson("/api/recurring-rules/run", { method: "POST", body: JSON.stringify({}) }),
      { loading: "Ejecutando reglas...", success: "Reglas recurrentes ejecutadas" },
    );

  if (!isLoading && !data) {
    return (
      <div className="py-10 text-center">
        <p className="text-zinc-500">No se pudo cargar la información.</p>
        {error && <p className="mt-2 text-sm text-red-500">{errorMessage(error, "")}</p>}
        <Button variant="primary" className="mt-4" onClick={() => mutate()}>Reintentar</Button>
      </div>
    );
  }

  const loading = isLoading && !data;
  const funds = data?.savingsFunds ?? [];
  const totalAhorrado = funds.reduce((sum, f) => sum + f.currentAmount, 0);
  const totalMeta = funds.reduce((sum, f) => sum + f.targetAmount, 0);
  const porcentaje = totalMeta > 0 ? Math.round((totalAhorrado / totalMeta) * 100) : 0;
  const nonCreditAccounts = (data?.accounts ?? []).filter((a) => a.kind !== "credit");

  return (
    <div className="space-y-6">
      <PageHeader title="Ahorros" description="Fondos, metas y depósitos automáticos" />

      {/*
        La cifra protagonista, con la misma caja y el mismo degradado que
        "Disponible" en Dashboard: las dos páginas responden a la misma pregunta
        ("¿cuánto tengo?") y deben leerse como la misma familia. Antes esta vista
        no tenía ningún punto de color y todo pesaba igual.
      */}
      <TransitionSwap showSkeleton={loading} skeleton={<Skeleton className="h-[132px] rounded-2xl" />}>
        <div className="h-[132px] rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
          <p className="text-sm font-medium text-white/80">Total ahorrado</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{formatClp(totalAhorrado)}</p>
          <p className="mt-2 text-xs text-white/70">
            {funds.length === 0
              ? "Todavía sin fondos"
              : totalMeta > 0
              ? `${porcentaje}% de ${formatClp(totalMeta)} · ${funds.length} ${funds.length === 1 ? "fondo" : "fondos"}`
              : `${funds.length} ${funds.length === 1 ? "fondo" : "fondos"} sin meta definida`}
          </p>
        </div>
      </TransitionSwap>


      <AnimatePresence>
      {showCreateFund && (
        <CreateSavingsModal
          key="create-fund"
          nonCreditAccounts={nonCreditAccounts}
          onClose={() => setShowCreateFund(false)}
          onCreated={() => mutate()}
        />
      )}
      </AnimatePresence>

      {!loading && funds.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">Todavía no tienes fondos de ahorro</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-400">
            Un fondo separa plata para una meta y te muestra cuánto te falta.
          </p>
          <Button variant="primary" className="mt-6" onClick={() => setShowCreateFund(true)}>
            + Nuevo fondo
          </Button>
        </div>
      )}

      {(loading || funds.length > 0) && (
        <section>
          {/* La acción vive junto a lo que crea, no arriba en el encabezado. */}
          <SectionHeader
            title="Fondos"
            action={
              <Button size="sm" variant="primary" onClick={() => setShowCreateFund(true)}>
                + Nuevo fondo
              </Button>
            }
          />
          <TransitionSwap
            showSkeleton={loading}
            skeleton={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => <SavingsFundCardSkeleton key={i} />)}
              </div>
            }
          >
            <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {funds.map((fund) => {
                // Antes esto se topaba en 100% y el sobre-ahorro quedaba invisible.
                const progressPercent =
                  fund.targetAmount > 0 ? Math.round((fund.currentAmount / fund.targetAmount) * 100) : 0;
                return (
                  <motion.div key={fund.id} variants={itemVariants} layout className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                    {/*
                      gap y min-w-0: sin ellos un nombre largo se pegaba al monto
                      ("Fondo de emergencia$2.150.000") porque el bloque de texto
                      no tenía permitido encogerse.
                    */}
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-zinc-900 dark:text-white">{fund.name}</h3>
                        <p className="truncate text-xs text-zinc-500">Meta: {formatClp(fund.targetAmount)}</p>
                      </div>
                      <span className="shrink-0 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatClp(fund.currentAmount)}
                      </span>
                    </div>

                    <ProgressBar
                      className="mb-1"
                      value={fund.currentAmount}
                      max={fund.targetAmount}
                      label={`Progreso de ${fund.name}`}
                    />
                    <p className="mb-4 text-right text-xs text-zinc-400">
                      {progressPercent}% completado
                      {progressPercent > 100 && " · meta superada"}
                    </p>

                    <Button variant="secondary" size="sm" block onClick={() => setEditingFundId(fund.id)}>Editar fondo</Button>
                  </motion.div>
                );
              })}
            </motion.div>
          </TransitionSwap>
        </section>
      )}

      {(data?.savingsAutoDeposits.length ?? 0) > 0 && data && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900 dark:text-white">Depósitos automáticos activos</h2>
            <p className="text-sm text-zinc-500">
              Total mensual:{" "}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatClp(data.savingsAutoDeposits.reduce((sum, ad) => sum + ad.amount, 0))}
              </span>
            </p>
          </div>
          <div className="space-y-2">
            {data.savingsAutoDeposits.map((ad) => {
              const fund = data.savingsFunds.find((f) => f.id === ad.fundId);
              const account = data.accounts.find((a) => a.id === ad.accountId);
              return (
                <div key={ad.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{fund?.name ?? "Fondo"}</p>
                    <p className="text-xs text-zinc-500">Día {ad.dayOfMonth} desde {account?.name ?? "Cuenta"}</p>
                  </div>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatClp(ad.amount)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recurring rules */}
      {(data?.recurringRules.length ?? 0) > 0 && data && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* Ejecutar las reglas es una acción sobre ESTE panel. Antes vivía
              arriba, junto al título de la página, lejos de lo que ejecuta. */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-zinc-900 dark:text-white">Reglas recurrentes</h2>
            <Button size="sm" onClick={onRunRecurring} disabled={submitting}>
              {submitting ? "Ejecutando..." : "Ejecutar"}
            </Button>
          </div>
          <div className="space-y-2">
            {data.recurringRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{rule.name}</p>
                  <p className="text-xs text-zinc-500">
                    {rule.type === "income" ? "Ingreso" : "Gasto"} · Día {rule.dayOfMonth} · Próximo: {formatDate(rule.nextRun)}
                  </p>
                </div>
                <p className="font-semibold text-zinc-900 dark:text-white">
                  {rule.type === "income" ? "+" : "-"}{formatClp(rule.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
      {editingFundId && data && (() => {
        const fund = data.savingsFunds.find((f) => f.id === editingFundId);
        if (!fund) return null;
        return (
          <EditSavingsModal
            key="edit-fund"
            fund={fund}
            nonCreditAccounts={nonCreditAccounts}
            onClose={() => setEditingFundId(null)}
            onUpdated={() => mutate()}
          />
        );
      })()}
      </AnimatePresence>
    </div>
  );
}

/**
 * Mismo contenedor y mismas franjas que la tarjeta de fondo real (p-5, título +
 * meta, monto, barra, porcentaje, botón), así el alto se calcula igual en las
 * dos y no hay reajuste al llegar los datos.
 */
function SavingsFundCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-7 w-24" />
      </div>
      <Skeleton className="mb-1 h-2 w-full rounded-full" />
      <div className="mb-4 flex h-4 justify-end">
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-full rounded-xl" />
    </div>
  );
}
