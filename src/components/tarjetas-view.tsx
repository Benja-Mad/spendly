"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardData } from "@/lib/types";
import { formatClp } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { AccountCard } from "@/components/account-card";

export function TarjetasView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [accountKind, setAccountKind] = useState("debit");

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

  const onCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const kind = String(formData.get("kind") ?? "debit");
    await runAction(async () => {
      await requestJson("/api/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          kind,
          bank: String(formData.get("bank") ?? "") || null,
          initialBalance: Number(formData.get("initialBalance") ?? 0),
          statementDay: kind === "credit" ? Number(formData.get("statementDay") ?? 0) || null : null,
          paymentDueDay: kind === "credit" ? Number(formData.get("paymentDueDay") ?? 0) || null : null,
        }),
      });
    });
    form.reset();
    setAccountKind("debit");
    setShowCreateForm(false);
  };

  const onPayCreditCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    await runAction(async () => {
      await requestJson("/api/credit/payments", {
        method: "POST",
        body: JSON.stringify({
          creditAccountId: String(formData.get("creditAccountId") ?? ""),
          sourceAccountId: String(formData.get("sourceAccountId") ?? ""),
          amount: Number(formData.get("amount") ?? 0),
        }),
      });
    });
    form.reset();
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

  const creditAccounts = data.accounts.filter((a) => a.kind === "credit");
  const nonCreditAccounts = data.accounts.filter((a) => a.kind !== "credit");

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500">Total disponible</p>
          <p className="text-lg font-bold text-zinc-900 dark:text-white">{formatClp(data.summary.available)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500">Total ahorrado</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatClp(data.summary.saved)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500">Deuda crédito</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatClp(data.summary.pendingCreditDebt)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500">Total general</p>
          <p className="text-lg font-bold text-zinc-900 dark:text-white">{formatClp(data.summary.total)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Tus tarjetas y cuentas</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
        >
          {showCreateForm ? "Cancelar" : "+ Nueva cuenta"}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={onCreateAccount} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 font-semibold text-zinc-900 dark:text-white">Nueva cuenta / tarjeta</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" name="name" placeholder="Nombre" required />
            <select className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" name="kind" value={accountKind} onChange={(e) => setAccountKind(e.target.value)}>
              <option value="cash">Efectivo</option>
              <option value="debit">Débito</option>
              <option value="checking">Corriente</option>
              <option value="credit">Crédito</option>
            </select>
            <input className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" name="bank" placeholder="Banco (opcional)" />
            <input className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" name="initialBalance" type="number" min="0" step="1" defaultValue={0} placeholder="Saldo inicial" />
            {accountKind === "credit" && (
              <>
                <input className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" name="statementDay" type="number" min="1" max="28" step="1" placeholder="Día de facturación (cierre)" />
                <input className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" name="paymentDueDay" type="number" min="1" max="28" step="1" placeholder="Día de vencimiento" />
              </>
            )}
          </div>
          <button
            type="submit" disabled={submitting}
            className="cursor-pointer mt-4 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Guardar cuenta
          </button>
        </form>
      )}

      {/* Credit cards */}
      {creditAccounts.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">Tarjetas de crédito</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creditAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      )}

      {/* Debit/cash/checking */}
      {nonCreditAccounts.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">Cuentas disponibles</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nonCreditAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      )}

      {/* Pay credit card */}
      {creditAccounts.length > 0 && nonCreditAccounts.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 font-semibold text-zinc-900 dark:text-white">Pagar tarjeta de crédito</h3>
          <form onSubmit={onPayCreditCard} className="grid gap-4 sm:grid-cols-3">
            <select className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" name="creditAccountId" required>
              <option value="">Tarjeta crédito</option>
              {creditAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <select className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" name="sourceAccountId" required>
              <option value="">Cuenta de pago</option>
              {nonCreditAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" name="amount" type="number" min="1" step="1" placeholder="Monto" required />
              <button type="submit" disabled={submitting} className="cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:shadow-lg disabled:opacity-50">
                Pagar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
