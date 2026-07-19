"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardData } from "@/lib/types";
import { formatClp } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { CreateSavingsModal } from "./create-savings-modal";
import { EditSavingsModal } from "./edit-savings-modal";

export function AhorrosView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateFund, setShowCreateFund] = useState(false);
  const [editingFundId, setEditingFundId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestJson("/api/dashboard", { method: "GET", cache: "no-store" }) as DashboardData;
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAction = useCallback(
    async (runner: () => Promise<unknown>) => {
      setSubmitting(true);
      setError(null);
      try {
        await runner();
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setSubmitting(false);
      }
    },
    [load],
  );

  const onRunRecurring = async () => {
    await runAction(async () => {
      await requestJson("/api/recurring-rules/run", {
        method: "POST",
        body: JSON.stringify({}),
      });
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return <div className="py-10 text-center text-zinc-500">No se pudo cargar.</div>;
  }

  const nonCreditAccounts = data.accounts.filter((a) => a.kind !== "credit");

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Fondos de ahorro</h2>
        <div className="flex gap-2">
          {data.recurringRules.length > 0 && (
            <button
              onClick={onRunRecurring} disabled={submitting}
              className="cursor-pointer rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300"
            >
              Ejecutar recurrentes
            </button>
          )}
          <button
            onClick={() => setShowCreateFund(!showCreateFund)}
            className="cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
          >
            + Nuevo fondo
          </button>
        </div>
      </div>

      {showCreateFund && (
        <CreateSavingsModal
          nonCreditAccounts={nonCreditAccounts}
          onClose={() => setShowCreateFund(false)}
          onCreated={load}
        />
      )}

      {/* Savings funds list */}
      {data.savingsFunds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-zinc-500">No tienes fondos de ahorro aún. ¡Crea uno!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.savingsFunds.map((fund) => {
            const progress = fund.targetAmount > 0 ? Math.min(fund.currentAmount / fund.targetAmount, 1) : 0;
            const progressPercent = Math.round(progress * 100);
            return (
              <div key={fund.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">{fund.name}</h4>
                    <p className="text-xs text-zinc-500">Meta: {formatClp(fund.targetAmount)}</p>
                  </div>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatClp(fund.currentAmount)}
                  </span>
                </div>

                <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mb-4 text-right text-xs text-zinc-400">{progressPercent}% completado</p>

                <button
                  onClick={() => setEditingFundId(fund.id)}
                  className="cursor-pointer w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-medium text-white transition-all hover:shadow-lg"
                >
                  Editar
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Auto deposits list */}
      {data.savingsAutoDeposits.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Depósitos automáticos activos</h3>
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
          <h3 className="mb-4 font-semibold text-zinc-900 dark:text-white">Reglas recurrentes</h3>
          <div className="space-y-2">
            {data.recurringRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{rule.name}</p>
                  <p className="text-xs text-zinc-500">
                    {rule.type === "income" ? "Ingreso" : "Gasto"} · Día {rule.dayOfMonth} · Próximo: {rule.nextRun}
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

      {editingFundId && (() => {
        const fund = data.savingsFunds.find((f) => f.id === editingFundId);
        if (!fund) return null;
        return (
          <EditSavingsModal
            fund={fund}
            nonCreditAccounts={nonCreditAccounts}
            onClose={() => setEditingFundId(null)}
            onUpdated={load}
          />
        );
      })()}
    </div>
  );
}
