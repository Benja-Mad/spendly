"use client";

import { DashboardData, Transaction } from "@/lib/types";
import { formatClp, parsePositiveInteger } from "@/lib/utils";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { requestJson } from "@/lib/api";

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOccurredAt, setEditOccurredAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestJson("/api/dashboard", { method: "GET", cache: "no-store" }) as DashboardData;
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar dashboard.");
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
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "No se pudo completar acción.");
      } finally {
        setSubmitting(false);
      }
    },
    [load],
  );

  const onDeleteTransaction = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta transacción?")) return;
    await runAction(async () => {
      await requestJson(`/api/transactions/${id}`, { method: "DELETE" });
    });
  };

  const beginEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditAmount(String(transaction.amount));
    setEditDescription(transaction.description ?? "");
    setEditOccurredAt(transaction.occurredAt);
  };

  const cancelEditTransaction = () => {
    setEditingTransaction(null);
    setEditAmount("");
    setEditDescription("");
    setEditOccurredAt("");
  };

  const submitTransactionEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTransaction) return;

    let editedAmount: number;
    try {
      editedAmount = parsePositiveInteger(editAmount, "Monto editado");
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "El monto editado debe ser un entero positivo.");
      return;
    }

    await runAction(async () => {
      await requestJson(`/api/transactions/${editingTransaction.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          accountId: editingTransaction.accountId,
          type: editingTransaction.type,
          amount: editedAmount,
          categoryId: editingTransaction.categoryId,
          description: editDescription || null,
          occurredAt: editOccurredAt || editingTransaction.occurredAt,
        }),
      });
      cancelEditTransaction();
    });
  };

  const onMarkAlertRead = async (id: string) => {
    await runAction(async () => {
      await requestJson(`/api/alerts/${id}`, { method: "PATCH", body: JSON.stringify({}) });
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
    return (
      <div className="py-10 text-center">
        <p className="text-zinc-500">No se pudo cargar la información.</p>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  const recentTransactions = data.transactions.slice(0, 10);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total", value: data.summary.total, color: "from-blue-500 to-indigo-600" },
          { label: "Disponible", value: data.summary.available, color: "from-emerald-500 to-teal-600" },
          { label: "Ahorrado", value: data.summary.saved, color: "from-violet-500 to-purple-600" },
          { label: "Deuda crédito", value: data.summary.pendingCreditDebt, color: "from-rose-500 to-red-600" },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl bg-gradient-to-br ${card.color} p-5 text-white shadow-lg`}
          >
            <p className="text-sm font-medium text-white/70">{card.label}</p>
            <p className="mt-1 text-2xl font-bold">{formatClp(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Recent transactions + alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 font-semibold text-zinc-900 dark:text-white">Últimos movimientos</h3>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin movimientos registrados.</p>
          ) : (
            <ul className="space-y-2">
              {recentTransactions.map((tx) => (
                <li key={tx.id} className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        tx.type === "income" || tx.type === "recurring_income"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                        {tx.type === "income" ? "Ingreso" : tx.type === "expense" ? "Gasto" : tx.type}
                      </span>
                      <p className="mt-1 text-sm text-zinc-500">{tx.description ?? "Sin descripción"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatClp(tx.amount)}</p>
                      <p className="text-xs text-zinc-400">{tx.occurredAt}</p>
                    </div>
                  </div>
                  {tx.origin === "manual" && (tx.type === "income" || tx.type === "expense") && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => beginEditTransaction(tx)}
                        className="cursor-pointer rounded-lg bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="cursor-pointer rounded-lg bg-red-100 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                  {editingTransaction?.id === tx.id && (
                    <form className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800" onSubmit={submitTransactionEdit}>
                      <div className="flex gap-2">
                        <input
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                          type="number" min="1" step="1"
                          value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
                        />
                        <input
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                          value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Descripción"
                        />
                        <input
                          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                          type="date" value={editOccurredAt} onChange={(e) => setEditOccurredAt(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit" disabled={submitting}
                          className="cursor-pointer rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        <button
                          type="button" onClick={cancelEditTransaction}
                          className="cursor-pointer rounded-lg bg-zinc-200 px-4 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 font-semibold text-zinc-900 dark:text-white">Alertas</h3>
          {data.alerts.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin alertas pendientes.</p>
          ) : (
            <ul className="space-y-2">
              {data.alerts.map((alert) => (
                <li key={alert.id} className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <strong className="text-sm text-zinc-900 dark:text-white">{alert.title}</strong>
                      {alert.isRead && <span className="ml-2 text-xs text-emerald-500">Leída</span>}
                      <p className="mt-1 text-sm text-zinc-500">{alert.body}</p>
                    </div>
                  </div>
                  {!alert.isRead && (
                    <button
                      onClick={() => onMarkAlertRead(alert.id)}
                      disabled={submitting}
                      className="cursor-pointer mt-2 rounded-lg bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      Marcar leída
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
