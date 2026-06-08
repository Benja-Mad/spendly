"use client";

import { DashboardData, Transaction } from "@/lib/types";
import { formatClp, parsePositiveInteger } from "@/lib/utils";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const boxClass =
  "rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900";

async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  let result: { error?: string } = {};
  try {
    result = (await response.json()) as { error?: string };
  } catch {
    if (!response.ok) {
      throw new Error("La respuesta del servidor no es JSON válido.");
    }
  }

  if (!response.ok) {
    throw new Error(result.error ?? "Error inesperado en la petición");
  }

  return result;
}

export function Dashboard() {
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
      const result = (await requestJson("/api/dashboard", {
        method: "GET",
        cache: "no-store",
      })) as DashboardData;

      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const nonCreditAccounts = useMemo(
    () => data?.accounts.filter((account) => account.kind !== "credit") ?? [],
    [data],
  );

  const creditAccounts = useMemo(
    () => data?.accounts.filter((account) => account.kind === "credit") ?? [],
    [data],
  );

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

  const onCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await requestJson("/api/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          kind: String(form.get("kind") ?? "debit"),
          bank: String(form.get("bank") ?? "") || null,
          initialBalance: Number(form.get("initialBalance") ?? 0),
        }),
      });
      event.currentTarget.reset();
    });
  };

  const onCreateTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await requestJson("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          accountId: String(form.get("accountId") ?? ""),
          type: String(form.get("type") ?? "expense"),
          amount: Number(form.get("amount") ?? 0),
          categoryId: String(form.get("categoryId") ?? "") || null,
          description: String(form.get("description") ?? "") || null,
          occurredAt: String(form.get("occurredAt") ?? "") || undefined,
        }),
      });
      event.currentTarget.reset();
    });
  };

  const onCreateSavingsFund = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await requestJson("/api/savings/funds", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          targetAmount: Number(form.get("targetAmount") ?? 0),
          initialDeposit: Number(form.get("initialDeposit") ?? 0),
          initialAccountId: String(form.get("initialAccountId") ?? "") || null,
        }),
      });
      event.currentTarget.reset();
    });
  };

  const onCreateSavingsAutoDeposit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await requestJson("/api/savings/auto-deposits", {
        method: "POST",
        body: JSON.stringify({
          fundId: String(form.get("fundId") ?? ""),
          accountId: String(form.get("accountId") ?? ""),
          amount: Number(form.get("amount") ?? 0),
          dayOfMonth: Number(form.get("dayOfMonth") ?? 1),
        }),
      });
      event.currentTarget.reset();
    });
  };

  const onPayCreditCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await requestJson("/api/credit/payments", {
        method: "POST",
        body: JSON.stringify({
          creditAccountId: String(form.get("creditAccountId") ?? ""),
          sourceAccountId: String(form.get("sourceAccountId") ?? ""),
          amount: Number(form.get("amount") ?? 0),
        }),
      });
      event.currentTarget.reset();
    });
  };

  const onCreateRecurringRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await requestJson("/api/recurring-rules", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          type: String(form.get("type") ?? "expense"),
          amount: Number(form.get("amount") ?? 0),
          accountId: String(form.get("accountId") ?? ""),
          categoryId: String(form.get("categoryId") ?? "") || null,
          dayOfMonth: Number(form.get("dayOfMonth") ?? 1),
          nextRun: String(form.get("nextRun") ?? "") || undefined,
        }),
      });
      event.currentTarget.reset();
    });
  };

  const onRunRecurring = async () => {
    await runAction(async () => {
      await requestJson("/api/recurring-rules/run", {
        method: "POST",
        body: JSON.stringify({}),
      });
    });
  };

  const onMarkAlertRead = async (id: string) => {
    await runAction(async () => {
      await requestJson(`/api/alerts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
    });
  };

  const onDeleteTransaction = async (id: string) => {
    await runAction(async () => {
      await requestJson(`/api/transactions/${id}`, {
        method: "DELETE",
        body: JSON.stringify({}),
      });
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
      setError(
        validationError instanceof Error
          ? validationError.message
          : "El monto editado debe ser un entero positivo.",
      );
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

  if (loading) {
    return <div className="p-8">Cargando Spendly...</div>;
  }

  if (!data) {
    return (
      <div className="p-8">
        <p>No se pudo cargar data.</p>
        {error && <p className="text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 bg-zinc-50 p-4 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <header className={boxClass}>
        <h1 className="text-2xl font-bold">Spendly (CLP)</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Banco opcional, saldos en CLP, alertas in-app y base de datos real.
        </p>
      </header>

      {error && <div className="rounded bg-red-100 p-2 text-sm text-red-700">{error}</div>}

      <section className="grid gap-3 md:grid-cols-4">
        <article className={boxClass}>
          <h2 className="font-semibold">Total</h2>
          <p className="text-xl">{formatClp(data.summary.total)}</p>
        </article>
        <article className={boxClass}>
          <h2 className="font-semibold">Disponible</h2>
          <p className="text-xl">{formatClp(data.summary.available)}</p>
        </article>
        <article className={boxClass}>
          <h2 className="font-semibold">Ahorrado</h2>
          <p className="text-xl">{formatClp(data.summary.saved)}</p>
        </article>
        <article className={boxClass}>
          <h2 className="font-semibold">Deuda crédito</h2>
          <p className="text-xl">{formatClp(data.summary.pendingCreditDebt)}</p>
        </article>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <article className={boxClass}>
          <h3 className="mb-2 font-semibold">Crear cuenta/tarjeta</h3>
          <form className="grid gap-2" onSubmit={(event) => void onCreateAccount(event)}>
            <input className="rounded border p-2" name="name" placeholder="Nombre" required />
            <select className="rounded border p-2" name="kind" defaultValue="debit">
              <option value="cash">Efectivo</option>
              <option value="debit">Débito</option>
              <option value="checking">Corriente</option>
              <option value="credit">Crédito</option>
            </select>
            <input className="rounded border p-2" name="bank" placeholder="Banco (opcional)" />
            <input className="rounded border p-2" name="initialBalance" type="number" min="0" step="1" defaultValue={0} />
            <button className="rounded bg-black px-3 py-2 text-white" disabled={submitting} type="submit">
              Guardar cuenta
            </button>
          </form>
        </article>

        <article className={boxClass}>
          <h3 className="mb-2 font-semibold">Registrar movimiento manual</h3>
          <form className="grid gap-2" onSubmit={(event) => void onCreateTransaction(event)}>
            <select className="rounded border p-2" name="accountId" required>
              <option value="">Cuenta</option>
              {data.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.kind})
                </option>
              ))}
            </select>
            <select className="rounded border p-2" name="type" defaultValue="expense">
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
            </select>
            <input className="rounded border p-2" name="amount" type="number" min="1" step="1" placeholder="Monto" required />
            <select className="rounded border p-2" name="categoryId">
              <option value="">Sin categoría</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.type})
                </option>
              ))}
            </select>
            <input className="rounded border p-2" name="description" placeholder="Descripción" />
            <input className="rounded border p-2" name="occurredAt" type="date" />
            <button className="rounded bg-black px-3 py-2 text-white" disabled={submitting} type="submit">
              Guardar movimiento
            </button>
          </form>
        </article>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <article className={boxClass}>
          <h3 className="mb-2 font-semibold">Crear fondo de ahorro</h3>
          <form className="grid gap-2" onSubmit={(event) => void onCreateSavingsFund(event)}>
            <input className="rounded border p-2" name="name" placeholder="Nombre del fondo" required />
            <input className="rounded border p-2" name="targetAmount" type="number" min="1" step="1" placeholder="Meta" required />
            <input className="rounded border p-2" name="initialDeposit" type="number" min="0" step="1" defaultValue={0} />
            <select className="rounded border p-2" name="initialAccountId">
              <option value="">Cuenta origen depósito inicial</option>
              {nonCreditAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <button className="rounded bg-black px-3 py-2 text-white" disabled={submitting} type="submit">
              Guardar fondo
            </button>
          </form>
        </article>

        <article className={boxClass}>
          <h3 className="mb-2 font-semibold">Depósito automático ahorro (desde mes siguiente)</h3>
          <form className="grid gap-2" onSubmit={(event) => void onCreateSavingsAutoDeposit(event)}>
            <select className="rounded border p-2" name="fundId" required>
              <option value="">Fondo</option>
              {data.savingsFunds.map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {fund.name}
                </option>
              ))}
            </select>
            <select className="rounded border p-2" name="accountId" required>
              <option value="">Cuenta origen</option>
              {nonCreditAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <input className="rounded border p-2" name="amount" type="number" min="1" step="1" required />
            <input className="rounded border p-2" name="dayOfMonth" type="number" min="1" max="28" step="1" defaultValue={1} required />
            <button className="rounded bg-black px-3 py-2 text-white" disabled={submitting} type="submit">
              Guardar depósito automático
            </button>
          </form>
        </article>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <article className={boxClass}>
          <h3 className="mb-2 font-semibold">Pagar tarjeta de crédito</h3>
          <form className="grid gap-2" onSubmit={(event) => void onPayCreditCard(event)}>
            <select className="rounded border p-2" name="creditAccountId" required>
              <option value="">Tarjeta crédito</option>
              {creditAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <select className="rounded border p-2" name="sourceAccountId" required>
              <option value="">Cuenta de pago</option>
              {nonCreditAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <input className="rounded border p-2" name="amount" type="number" min="1" step="1" required />
            <button className="rounded bg-black px-3 py-2 text-white" disabled={submitting} type="submit">
              Pagar tarjeta
            </button>
          </form>
        </article>

        <article className={boxClass}>
          <h3 className="mb-2 font-semibold">Regla recurrente mensual</h3>
          <form className="grid gap-2" onSubmit={(event) => void onCreateRecurringRule(event)}>
            <input className="rounded border p-2" name="name" placeholder="Nombre" required />
            <select className="rounded border p-2" name="type" defaultValue="expense">
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
            </select>
            <input className="rounded border p-2" name="amount" type="number" min="1" step="1" required />
            <select className="rounded border p-2" name="accountId" required>
              <option value="">Cuenta objetivo</option>
              {data.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <select className="rounded border p-2" name="categoryId">
              <option value="">Sin categoría</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input className="rounded border p-2" name="dayOfMonth" type="number" min="1" max="28" step="1" defaultValue={1} required />
            <input className="rounded border p-2" name="nextRun" type="date" />
            <button className="rounded bg-black px-3 py-2 text-white" disabled={submitting} type="submit">
              Guardar recurrente
            </button>
          </form>
          <button
            className="mt-3 rounded bg-zinc-700 px-3 py-2 text-white"
            disabled={submitting}
            onClick={() => void onRunRecurring()}
            type="button"
          >
            Ejecutar recurrentes hoy
          </button>
        </article>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <article className={boxClass}>
          <h3 className="mb-2 font-semibold">Movimientos recientes (manuales editables/eliminables)</h3>
          <ul className="grid gap-2 text-sm">
            {data.transactions.map((transaction) => (
              <li className="rounded border border-black/10 p-2 dark:border-white/10" key={transaction.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {transaction.type} · {formatClp(transaction.amount)} · {transaction.occurredAt}
                  </span>
                  <span className="text-xs text-zinc-500">{transaction.description ?? "sin descripción"}</span>
                </div>
                {transaction.origin === "manual" && ["income", "expense"].includes(transaction.type) ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded bg-zinc-800 px-2 py-1 text-xs text-white"
                      onClick={() => beginEditTransaction(transaction)}
                      type="button"
                    >
                      Editar
                    </button>
                    <button
                      className="rounded bg-red-700 px-2 py-1 text-xs text-white"
                      onClick={() => void onDeleteTransaction(transaction.id)}
                      type="button"
                    >
                      Eliminar
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">Movimiento generado por sistema.</p>
                )}
                {editingTransaction?.id === transaction.id && (
                  <form className="mt-2 grid gap-2" onSubmit={(event) => void submitTransactionEdit(event)}>
                    <input
                      className="rounded border p-2"
                      min="1"
                      step="1"
                      onChange={(event) => setEditAmount(event.target.value)}
                      type="number"
                      value={editAmount}
                    />
                    <input
                      className="rounded border p-2"
                      onChange={(event) => setEditDescription(event.target.value)}
                      placeholder="Descripción"
                      value={editDescription}
                    />
                    <input
                      className="rounded border p-2"
                      onChange={(event) => setEditOccurredAt(event.target.value)}
                      type="date"
                      value={editOccurredAt}
                    />
                    <div className="flex gap-2">
                      <button className="rounded bg-zinc-700 px-2 py-1 text-xs text-white" type="submit">
                        Guardar cambios
                      </button>
                      <button
                        className="rounded bg-zinc-500 px-2 py-1 text-xs text-white"
                        onClick={cancelEditTransaction}
                        type="button"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </article>

        <article className={boxClass}>
          <h3 className="mb-2 font-semibold">Alertas in-app</h3>
          <ul className="grid gap-2 text-sm">
            {data.alerts.map((alert) => (
              <li className="rounded border border-black/10 p-2 dark:border-white/10" key={alert.id}>
                <div className="flex items-center justify-between gap-2">
                  <strong>{alert.title}</strong>
                  {alert.isRead ? <span>Leída</span> : <span>Pendiente</span>}
                </div>
                <p>{alert.body}</p>
                {!alert.isRead && (
                  <button
                    className="mt-2 rounded bg-zinc-700 px-2 py-1 text-xs text-white"
                    onClick={() => void onMarkAlertRead(alert.id)}
                    type="button"
                  >
                    Marcar leída
                  </button>
                )}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
