"use client";

import { useState } from "react";
import { Account } from "@/lib/types";
import { formatClp } from "@/lib/utils";
import { requestJson } from "@/lib/api";

interface Props {
  nonCreditAccounts: Account[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateSavingsModal({ nonCreditAccounts, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [initialDeposit, setInitialDeposit] = useState("0");
  const [initialAccountId, setInitialAccountId] = useState("");
  const [configureAuto, setConfigureAuto] = useState(false);
  const [autoAccountId, setAutoAccountId] = useState("");
  const [autoAmount, setAutoAmount] = useState("");
  const [autoDay, setAutoDay] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [simMonths, setSimMonths] = useState("");
  const [simPerPeriod, setSimPerPeriod] = useState("");
  const [simMode, setSimMode] = useState<"months" | "amount">("months");
  const [simPeriod, setSimPeriod] = useState<"day" | "month">("month");

  const target = Number(targetAmount) || 0;
  const deposit = Number(initialDeposit) || 0;
  const remaining = Math.max(target - deposit, 0);
  const months = Number(simMonths) || 0;
  const perPeriod = Number(simPerPeriod) || 0;

  let simResultMonths: number | null = null;
  let simResultPerPeriod: number | null = null;
  let simResultPerDay: number | null = null;
  let simResultPerMonthEquiv: number | null = null;

  if (simMode === "months" && months > 0 && remaining > 0) {
    if (simPeriod === "month") {
      simResultPerPeriod = remaining / months;
      simResultPerDay = simResultPerPeriod / 30;
    } else {
      simResultPerDay = remaining / (months * 30);
      simResultPerPeriod = simResultPerDay * 30;
    }
    simResultMonths = months;
  } else if (simMode === "amount" && perPeriod > 0 && remaining > 0) {
    if (simPeriod === "month") {
      simResultMonths = Math.ceil(remaining / perPeriod);
      simResultPerPeriod = perPeriod;
      simResultPerDay = perPeriod / 30;
    } else {
      simResultPerDay = perPeriod;
      simResultPerPeriod = perPeriod * 30;
      simResultMonths = Math.ceil(remaining / (perPeriod * 30));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { id: fundId } = await requestJson("/api/savings/funds", {
        method: "POST",
        body: JSON.stringify({
          name,
          targetAmount: target,
          initialDeposit: deposit,
          initialAccountId: initialAccountId || null,
        }),
      }) as { id: string };

      if (configureAuto && autoAccountId && autoAmount) {
        await requestJson("/api/savings/auto-deposits", {
          method: "POST",
          body: JSON.stringify({
            fundId,
            accountId: autoAccountId,
            amount: Number(autoAmount),
            dayOfMonth: Number(autoDay),
          }),
        });
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear fondo");
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
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Crear fondo de ahorro</h2>
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

          {/* Basic info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nombre del fondo</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" placeholder="Ej: Viaje a Brasil" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Meta ($)</label>
              <input value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} type="number" min="1" step="1" required
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" placeholder="500000" />
            </div>
          </div>

          {/* Initial deposit */}
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Depósito inicial</label>
              <div className="flex items-center gap-2">
                <input value={initialDeposit} onChange={(e) => setInitialDeposit(e.target.value)} type="number" min="0" step="1"
                  className="w-32 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
                <select value={initialAccountId} onChange={(e) => setInitialAccountId(e.target.value)}
                  className="cursor-pointer rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <option value="">Sin cuenta origen</option>
                  {nonCreditAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Auto-deposit toggle */}
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" checked={configureAuto} onChange={(e) => setConfigureAuto(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Configurar depósito automático mensual</span>
            </label>
            {configureAuto && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <select value={autoAccountId} onChange={(e) => setAutoAccountId(e.target.value)}
                  className="cursor-pointer rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <option value="">Cuenta origen</option>
                  {nonCreditAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <input value={autoAmount} onChange={(e) => setAutoAmount(e.target.value)} type="number" min="1" step="1" placeholder="Monto"
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Día</span>
                  <input value={autoDay} onChange={(e) => setAutoDay(e.target.value)} type="number" min="1" max="28"
                    className="w-16 rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
                </div>
              </div>
            )}
          </div>

          {/* Simulation */}
          {target > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
              <h3 className="mb-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300">Simulador de ahorro</h3>

              <div className="mb-3 flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
                <span>Meta: <strong>{formatClp(target)}</strong></span>
                {deposit > 0 && <span>Inicial: <strong>{formatClp(deposit)}</strong></span>}
                <span>Restante: <strong>{formatClp(remaining)}</strong></span>
              </div>

              <div className="mb-3 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="simMode" checked={simMode === "months"} onChange={() => setSimMode("months")}
                    className="text-emerald-600 focus:ring-emerald-500" />
                  Por meses
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="simMode" checked={simMode === "amount"} onChange={() => setSimMode("amount")}
                    className="text-emerald-600 focus:ring-emerald-500" />
                  Por monto
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={simPeriod === "day"} onChange={(e) => setSimPeriod(e.target.checked ? "day" : "month")}
                    className="rounded text-emerald-600 focus:ring-emerald-500" />
                  Por día
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {simMode === "months" ? (
                  <div>
                    <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">Meses para ahorrar</label>
                    <input value={simMonths} onChange={(e) => setSimMonths(e.target.value)} type="number" min="1" step="1"
                      className="w-full rounded-xl border border-emerald-300 px-3 py-2 text-sm dark:border-emerald-700 dark:bg-zinc-800" placeholder="6" />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-xs text-zinc-600 dark:text-zinc-400">
                      {simPeriod === "month" ? "Monto por mes" : "Monto por día"}
                    </label>
                    <input value={simPerPeriod} onChange={(e) => setSimPerPeriod(e.target.value)} type="number" min="1" step="1"
                      className="w-full rounded-xl border border-emerald-300 px-3 py-2 text-sm dark:border-emerald-700 dark:bg-zinc-800" placeholder="50000" />
                  </div>
                )}

                <div className="rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-800 dark:bg-zinc-900">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Resultado</p>
                  {simResultMonths !== null && (
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      ~{simResultMonths} mes{simResultMonths !== 1 ? "es" : ""}
                      {simResultPerPeriod !== null && ` · ${formatClp(Math.round(simResultPerPeriod))}/mes`}
                      {simResultPerDay !== null && ` · ${formatClp(Math.round(simResultPerDay))}/día`}
                    </p>
                  )}
                  {!simResultMonths && (
                    <p className="text-xs text-zinc-400">Completa los campos de arriba</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button type="button" onClick={onClose}
              className="cursor-pointer rounded-xl bg-zinc-100 px-6 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50">
              {submitting ? "Creando..." : "Crear fondo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
