"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Account, Category, Transaction } from "@/lib/types";
import { formatClp, parsePositiveInteger } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { FormEvent } from "react";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addType, setAddType] = useState<"income" | "expense">("expense");
  const [addAmount, setAddAmount] = useState("");
  const [addCategoryId, setAddCategoryId] = useState("");
  const [addDescription, setAddDescription] = useState("");

  const [editingDates, setEditingDates] = useState(false);
  const [statementDay, setStatementDay] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");

  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOccurredAt, setEditOccurredAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accRes, txRes, dashRes] = await Promise.all([
        requestJson(`/api/accounts/${id}`, { method: "GET" }) as Promise<{ account: Account }>,
        requestJson(`/api/accounts/${id}/transactions`, { method: "GET" }) as Promise<{ transactions: Transaction[] }>,
        requestJson("/api/dashboard", { method: "GET", cache: "no-store" }) as Promise<{ categories: Category[] }>,
      ]);
      setAccount(accRes.account);
      setTransactions(txRes.transactions);
      setCategories(dashRes.categories ?? []);
      setStatementDay(String(accRes.account.statementDay ?? ""));
      setPaymentDueDay(String(accRes.account.paymentDueDay ?? ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const runAction = useCallback(
    async (runner: () => Promise<unknown>) => {
      setSubmitting(true);
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

  const onAddTransaction = async () => {
    if (!addAmount || !account) return;
    await runAction(async () => {
      await requestJson("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          accountId: account.id,
          type: addType,
          amount: Number(addAmount),
          categoryId: addCategoryId || null,
          description: addDescription.trim() || null,
        }),
      });
      setAddAmount("");
      setAddCategoryId("");
      setAddDescription("");
    });
  };

  const saveDates = async (e: FormEvent) => {
    e.preventDefault();
    await runAction(async () => {
      await requestJson(`/api/accounts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          statementDay: statementDay ? Number(statementDay) : null,
          paymentDueDay: paymentDueDay ? Number(paymentDueDay) : null,
        }),
      });
      setEditingDates(false);
    });
  };

  const onDeleteTx = async (txId: string) => {
    if (!confirm("¿Eliminar esta transacción?")) return;
    await runAction(async () => {
      await requestJson(`/api/transactions/${txId}`, { method: "DELETE" });
    });
  };

  const beginEditTx = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditAmount(String(tx.amount));
    setEditDescription(tx.description ?? "");
    setEditOccurredAt(tx.occurredAt);
  };

  const cancelEditTx = () => {
    setEditingTxId(null);
    setEditAmount("");
    setEditDescription("");
    setEditOccurredAt("");
  };

  const submitEditTx = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTxId) return;
    let amount: number;
    try {
      amount = parsePositiveInteger(editAmount, "Monto");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Monto inválido");
      return;
    }
    const tx = transactions.find((t) => t.id === editingTxId);
    if (!tx) return;
    await runAction(async () => {
      await requestJson(`/api/transactions/${editingTxId}`, {
        method: "PATCH",
        body: JSON.stringify({
          accountId: tx.accountId,
          type: tx.type,
          amount,
          categoryId: tx.categoryId,
          description: editDescription || null,
          occurredAt: editOccurredAt || tx.occurredAt,
        }),
      });
      cancelEditTx();
    });
  };

  const typeBadge = (tx: Transaction) => {
    const isIncome = tx.type === "income" || tx.type === "recurring_income";
    return (
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        isIncome
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      }`}>
        {tx.type === "income" ? "Ingreso" : tx.type === "expense" ? "Gasto" : tx.type}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!account) {
    return <div className="py-10 text-center text-zinc-500">Cuenta no encontrada.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => router.push("/tarjetas")}
        className="cursor-pointer inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Volver a tarjetas
      </button>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{account.name}</h1>
            <p className="text-sm text-zinc-500 capitalize">
              {account.bank && `${account.bank} · `}
              {account.kind === "credit" ? "Crédito" : account.kind === "debit" ? "Débito" : account.kind === "cash" ? "Efectivo" : "Corriente"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-zinc-900 dark:text-white">
              {account.kind === "credit" ? formatClp(account.creditDebt) : formatClp(account.balance)}
            </p>
            <p className="text-xs text-zinc-500">
              {account.kind === "credit" ? "Deuda total" : "Saldo disponible"}
            </p>
          </div>
        </div>

        {account.kind === "credit" && (
          <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            {editingDates ? (
              <form onSubmit={saveDates} className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Día de facturación (cierre)</label>
                  <input type="number" min="1" max="28" value={statementDay} onChange={(e) => setStatementDay(e.target.value)}
                    className="w-24 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Día de vencimiento</label>
                  <input type="number" min="1" max="28" value={paymentDueDay} onChange={(e) => setPaymentDueDay(e.target.value)}
                    className="w-24 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
                </div>
                <button type="submit" disabled={submitting}
                  className="cursor-pointer rounded-xl bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900">
                  Guardar
                </button>
                <button type="button" onClick={() => setEditingDates(false)}
                  className="cursor-pointer rounded-xl bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300">
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-4 text-sm">
                {account.statementDay ? (
                  <span className="text-zinc-600 dark:text-zinc-400">Cierre día <strong>{account.statementDay}</strong></span>
                ) : (
                  <span className="text-zinc-400">Sin fecha de cierre</span>
                )}
                {account.paymentDueDay ? (
                  <span className="text-zinc-600 dark:text-zinc-400">Vence día <strong>{account.paymentDueDay}</strong></span>
                ) : (
                  <span className="text-zinc-400">Sin fecha de vencimiento</span>
                )}
                <button onClick={() => setEditingDates(true)}
                  className="cursor-pointer ml-auto text-xs text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
                  Editar fechas
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add transaction */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setAddType("expense")}
            className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              addType === "expense"
                ? "bg-red-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            Gasto
          </button>
          <button
            onClick={() => setAddType("income")}
            className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              addType === "income"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            Ingreso
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={addAmount} onChange={(e) => setAddAmount(e.target.value)} type="number" min="1" step="1" placeholder="Monto"
            className="w-32 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
          <select value={addCategoryId} onChange={(e) => setAddCategoryId(e.target.value)}
            className="cursor-pointer flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800">
            <option value="">Sin categoría</option>
            {categories.filter((c) => c.type === addType).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input value={addDescription} onChange={(e) => setAddDescription(e.target.value)} placeholder="Descripción (opcional)"
            className="min-w-40 flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
          <button onClick={onAddTransaction} disabled={submitting || !addAmount}
            className={`cursor-pointer rounded-xl px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50 ${
              addType === "expense"
                ? "bg-red-600 hover:bg-red-500"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}>
            {submitting ? "Guardando..." : addType === "expense" ? " Registrar gasto" : " Registrar ingreso"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white">Movimientos</h2>
        </div>
        <div className="p-6">
          {transactions.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">Sin movimientos registrados en esta cuenta.</p>
          ) : (
            <ul className="space-y-2">
              {transactions.map((tx) => (
                <li key={tx.id} className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      {typeBadge(tx)}
                      <p className="mt-1 truncate text-sm text-zinc-500">{tx.description ?? "Sin descripción"}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="font-semibold text-zinc-900 dark:text-white">{formatClp(tx.amount)}</p>
                      <p className="text-xs text-zinc-400">{tx.occurredAt}</p>
                    </div>
                  </div>
                  {tx.origin === "manual" && (tx.type === "income" || tx.type === "expense") && (
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => beginEditTx(tx)}
                        className="cursor-pointer rounded-lg bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
                        Editar
                      </button>
                      <button onClick={() => onDeleteTx(tx.id)}
                        className="cursor-pointer rounded-lg bg-red-100 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50">
                        Eliminar
                      </button>
                    </div>
                  )}
                  {editingTxId === tx.id && (
                    <form className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800" onSubmit={submitEditTx}>
                      <div className="flex flex-wrap gap-2">
                        <input className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" type="number" min="1" step="1" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                        <input className="min-w-0 flex-[2] rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Descripción" />
                        <input className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" type="date" value={editOccurredAt} onChange={(e) => setEditOccurredAt(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={submitting} className="cursor-pointer rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50">Guardar</button>
                        <button type="button" onClick={cancelEditTx} className="cursor-pointer rounded-lg bg-zinc-200 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300">Cancelar</button>
                      </div>
                    </form>
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
