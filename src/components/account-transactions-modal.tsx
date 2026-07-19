"use client";

import { useCallback, useEffect, useState } from "react";
import { Account, Transaction } from "@/lib/types";
import { formatClp, parsePositiveInteger } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { FormEvent } from "react";

interface Props {
  account: Account;
  onClose: () => void;
}

export function AccountTransactionsModal({ account, onClose }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOccurredAt, setEditOccurredAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await requestJson(`/api/accounts/${account.id}/transactions`, { method: "GET" }) as { transactions: Transaction[] };
      setTransactions(res.transactions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [account.id]);

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

  const onDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta transacción?")) return;
    await runAction(async () => {
      await requestJson(`/api/transactions/${id}`, { method: "DELETE" });
    });
  };

  const beginEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditAmount(String(tx.amount));
    setEditDescription(tx.description ?? "");
    setEditOccurredAt(tx.occurredAt);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount("");
    setEditDescription("");
    setEditOccurredAt("");
  };

  const submitEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;
    let amount: number;
    try {
      amount = parsePositiveInteger(editAmount, "Monto");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Monto inválido");
      return;
    }
    const tx = transactions.find((t) => t.id === editingId);
    if (!tx) return;
    await runAction(async () => {
      await requestJson(`/api/transactions/${editingId}`, {
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
      cancelEdit();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{account.name}</h2>
            <p className="text-sm text-zinc-500">
              {account.kind === "credit" ? `Deuda: ${formatClp(account.creditDebt)}` : `Saldo: ${formatClp(account.balance)}`}
            </p>
          </div>
          <button onClick={onClose} className="cursor-pointer rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : transactions.length === 0 ? (
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
                      <button onClick={() => beginEdit(tx)} className="cursor-pointer rounded-lg bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
                        Editar
                      </button>
                      <button onClick={() => onDelete(tx.id)} className="cursor-pointer rounded-lg bg-red-100 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50">
                        Eliminar
                      </button>
                    </div>
                  )}
                  {editingId === tx.id && (
                    <form className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800" onSubmit={submitEdit}>
                      <div className="flex flex-wrap gap-2">
                        <input className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" type="number" min="1" step="1" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                        <input className="min-w-0 flex-[2] rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Descripción" />
                        <input className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" type="date" value={editOccurredAt} onChange={(e) => setEditOccurredAt(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={submitting} className="cursor-pointer rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50">Guardar</button>
                        <button type="button" onClick={cancelEdit} className="cursor-pointer rounded-lg bg-zinc-200 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300">Cancelar</button>
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
