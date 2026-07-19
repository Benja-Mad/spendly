"use client";

import { useState } from "react";
import { Account, SavingsFund } from "@/lib/types";
import { formatClp } from "@/lib/utils";
import { requestJson } from "@/lib/api";

interface Props {
  fund: SavingsFund;
  nonCreditAccounts: Account[];
  onClose: () => void;
  onUpdated: () => void;
}

export function EditSavingsModal({ fund, nonCreditAccounts, onClose, onUpdated }: Props) {
  const [name, setName] = useState(fund.name);
  const [targetAmount, setTargetAmount] = useState(String(fund.targetAmount));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [depositAccountId, setDepositAccountId] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  const [autoAccountId, setAutoAccountId] = useState("");
  const [autoAmount, setAutoAmount] = useState("");
  const [autoDay, setAutoDay] = useState("1");

  const progress = fund.targetAmount > 0 ? Math.min(fund.currentAmount / fund.targetAmount, 1) : 0;
  const progressPercent = Math.round(progress * 100);

  const handleEdit = async () => {
    if (name === fund.name && String(fund.targetAmount) === targetAmount) return;
    setError(null);
    await requestJson(`/api/savings/funds/${fund.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, targetAmount: Number(targetAmount) }),
    });
  };

  const handleDeposit = async () => {
    if (!depositAccountId || !depositAmount) return;
    setError(null);
    await requestJson("/api/savings/deposits", {
      method: "POST",
      body: JSON.stringify({
        fundId: fund.id,
        accountId: depositAccountId,
        amount: Number(depositAmount),
      }),
    });
    setDepositAccountId("");
    setDepositAmount("");
  };

  const handleAutoDeposit = async () => {
    if (!autoAccountId || !autoAmount || !autoDay) return;
    setError(null);
    await requestJson("/api/savings/auto-deposits", {
      method: "POST",
      body: JSON.stringify({
        fundId: fund.id,
        accountId: autoAccountId,
        amount: Number(autoAmount),
        dayOfMonth: Number(autoDay),
      }),
    });
    setAutoAccountId("");
    setAutoAmount("");
    setAutoDay("1");
  };

  const handleDelete = async () => {
    setError(null);
    await requestJson(`/api/savings/funds/${fund.id}`, {
      method: "DELETE",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await handleEdit();
      await handleDeposit();
      await handleAutoDeposit();
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await handleDelete();
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Editar fondo</h2>
          <button onClick={onClose} className="cursor-pointer rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Fund info */}
          <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-zinc-900 dark:text-white">{fund.name}</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatClp(fund.currentAmount)}
              </span>
            </div>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-right text-xs text-zinc-400">{progressPercent}% · Meta: {formatClp(fund.targetAmount)}</p>
          </div>

          {/* Edit info */}
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Información del fondo</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} required
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" placeholder="Nombre" />
              <input value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} type="number" min="1" step="1" required
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" placeholder="Meta" />
            </div>
          </div>

          {/* Manual deposit */}
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Agregar depósito</h3>
            <div className="flex gap-2">
              <select value={depositAccountId} onChange={(e) => setDepositAccountId(e.target.value)}
                className="cursor-pointer flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800">
                <option value="">Cuenta origen</option>
                {nonCreditAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <input value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} type="number" min="1" step="1" placeholder="Monto"
                className="w-28 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
            </div>
          </div>

          {/* Auto-deposit */}
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Depósito automático mensual</h3>
            <div className="flex gap-2">
              <select value={autoAccountId} onChange={(e) => setAutoAccountId(e.target.value)}
                className="cursor-pointer flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800">
                <option value="">Cuenta origen</option>
                {nonCreditAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <input value={autoAmount} onChange={(e) => setAutoAmount(e.target.value)} type="number" min="1" step="1" placeholder="Monto"
                className="w-28 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-500">Día</span>
                <input value={autoDay} onChange={(e) => setAutoDay(e.target.value)} type="number" min="1" max="28"
                  className="w-14 rounded-xl border border-zinc-200 px-2 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
              </div>
            </div>
          </div>

          {/* Delete */}
          <div className="rounded-xl border border-red-200 p-4 dark:border-red-900/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Zona peligrosa</h3>
                <p className="text-xs text-zinc-500">
                  {fund.currentAmount > 0
                    ? `Se liberarán ${formatClp(fund.currentAmount)} a la cuenta original.`
                    : "No hay saldo guardado en este fondo."}
                </p>
              </div>
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-500">
                  Eliminar fondo
                </button>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirmDelete(false)}
                    className="cursor-pointer rounded-xl bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleDeleteClick} disabled={submitting}
                    className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50">
                    {submitting ? "Eliminando..." : "Confirmar eliminación"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button type="button" onClick={onClose}
              className="cursor-pointer rounded-xl bg-zinc-100 px-6 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50">
              {submitting ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
