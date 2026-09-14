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
import { PageHeader } from "@/components/ui/page-header";
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

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-10 text-center">
        <p className="text-zinc-500">No se pudo cargar la información.</p>
        {error && <p className="mt-2 text-sm text-red-500">{errorMessage(error, "")}</p>}
        <Button variant="primary" className="mt-4" onClick={() => mutate()}>Reintentar</Button>
      </div>
    );
  }

  const nonCreditAccounts = data.accounts.filter((a) => a.kind !== "credit");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ahorros"
        description="Fondos, metas y depósitos automáticos"
        actions={
          <>
            {data.recurringRules.length > 0 && (
              <Button onClick={onRunRecurring} disabled={submitting}>
                {submitting ? "Ejecutando..." : "Ejecutar recurrentes"}
              </Button>
            )}
            <Button variant="primary" onClick={() => setShowCreateFund(true)}>+ Nuevo fondo</Button>
          </>
        }
      />



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

      {/* Savings funds list */}
      {data.savingsFunds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-zinc-500">No tienes fondos de ahorro aún. ¡Crea uno!</p>
        </div>
      ) : (
        <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.savingsFunds.map((fund) => {
            // Antes esto se topaba en 100% y el sobre-ahorro quedaba invisible.
            const progressPercent =
              fund.targetAmount > 0 ? Math.round((fund.currentAmount / fund.targetAmount) * 100) : 0;
            return (
              <motion.div key={fund.id} variants={itemVariants} layout className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">{fund.name}</h3>
                    <p className="text-xs text-zinc-500">Meta: {formatClp(fund.targetAmount)}</p>
                  </div>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
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
      )}

      {/* Auto deposits list */}
      {data.savingsAutoDeposits.length > 0 && (
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
      {data.recurringRules.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 font-semibold text-zinc-900 dark:text-white">Reglas recurrentes</h2>
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
      {editingFundId && (() => {
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
