"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Account, Transaction } from "@/lib/types";
import { formatClp, formatDate } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { notify } from "@/lib/toast";
import { ACCOUNT_KIND_LABELS, TX_TYPE_LABELS, isIncomeType } from "@/lib/labels";
import { useAccount, useAccountTransactions, useDashboard } from "@/lib/swr";
import { itemVariants, listVariants } from "@/lib/motion";
import { Modal } from "@/components/ui/modal";
import { Field, inputClass } from "@/components/ui/field";
import { FormBody, FormFooter, FormRow, FormSection } from "@/components/ui/form";
import { Skeleton, ListSkeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { TransactionModal } from "@/components/transaction-modal";
import { Button, IconButton } from "@/components/ui/button";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const accountQuery = useAccount(id);
  const txQuery = useAccountTransactions(id);
  const dashboard = useDashboard();
  const confirm = useConfirm();

  const account = accountQuery.data?.account ?? null;
  const transactions = txQuery.data?.transactions ?? [];
  const accounts = dashboard.data?.accounts ?? [];
  const categories = dashboard.data?.categories ?? [];

  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editingAccount, setEditingAccount] = useState(false);

  const reload = async () => {
    await Promise.all([accountQuery.mutate(), txQuery.mutate(), dashboard.mutate()]);
  };

  const onDelete = async (tx: Transaction) => {
    const ok = await confirm({
      title: "¿Eliminar este movimiento?",
      description: `${tx.description ?? "Sin descripción"} · ${formatClp(tx.amount)}`,
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await notify.promise(
        (async () => {
          await requestJson(`/api/transactions/${tx.id}`, { method: "DELETE" });
          await reload();
        })(),
        { loading: "Eliminando movimiento...", success: "Movimiento eliminado" },
      );
    } catch {
      // el toast reporta el error
    } finally {
      setSubmitting(false);
    }
  };

  if (accountQuery.isLoading && !account) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="py-10 text-center">
        <p className="text-zinc-500">
          {accountQuery.error ? "No se pudo cargar la cuenta." : "Cuenta no encontrada."}
        </p>
        <Link href="/tarjetas" className="mt-4 inline-block rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900">
          Volver a tarjetas
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/tarjetas" className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Volver a tarjetas
      </Link>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{account.name}</h1>
            <p className="text-sm text-zinc-500">
              {account.bank && `${account.bank} · `}
              {ACCOUNT_KIND_LABELS[account.kind] ?? account.kind}
              {account.last4 && ` · •••• ${account.last4}`}
            </p>
          </div>
          <div className="flex items-start gap-4">
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-white">
                {formatClp(account.kind === "credit" ? account.creditDebt : account.balance)}
              </p>
              <p className="text-xs text-zinc-500">
                {account.kind === "credit" ? "Deuda total" : "Saldo disponible"}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setEditingAccount(true)}>Editar</Button>
          </div>
        </div>

        {account.kind === "credit" && (
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
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
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white">Movimientos</h2>
          <Button size="sm" variant="primary" onClick={() => setCreating(true)}>+ Movimiento</Button>
        </div>
        <div className="p-6">
          {txQuery.isLoading && transactions.length === 0 ? (
            <ListSkeleton />
          ) : transactions.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">Sin movimientos en esta cuenta.</p>
          ) : (
            <motion.ul variants={listVariants} initial="hidden" animate="visible" className="space-y-2">
              <AnimatePresence initial={false}>
                {transactions.map((tx) => (
                  <motion.li
                    key={tx.id}
                    layout
                    variants={itemVariants}
                    exit="exit"
                    className="flex items-start justify-between gap-3 overflow-hidden rounded-xl border border-zinc-100 p-3 dark:border-zinc-800"
                  >
                    <div className="min-w-0">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        isIncomeType(tx.type)
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                        {TX_TYPE_LABELS[tx.type] ?? tx.type}
                      </span>
                      <p className="mt-1 truncate text-sm text-zinc-500">{tx.description ?? "Sin descripción"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold tabular-nums text-zinc-900 dark:text-white">{formatClp(tx.amount)}</p>
                        <p className="text-xs text-zinc-400">{formatDate(tx.occurredAt)}</p>
                      </div>
                      {tx.origin === "manual" && (tx.type === "income" || tx.type === "expense") && (
                        <div className="flex items-center gap-1">
                          <IconButton label="Editar movimiento" onClick={() => setEditing(tx)}>
                            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </IconButton>
                          <IconButton label="Eliminar movimiento" tone="danger" onClick={() => onDelete(tx)} disabled={submitting}>
                            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </IconButton>
                        </div>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </div>
      </section>

      <AnimatePresence>
        {creating && (
          <TransactionModal
            key="create-tx"
            accounts={accounts.length ? accounts : [account]}
            categories={categories}
            defaultAccountId={account.id}
            onClose={() => setCreating(false)}
            onSaved={reload}
          />
        )}
        {editing && (
          <TransactionModal
            key="edit-tx"
            accounts={accounts.length ? accounts : [account]}
            categories={categories}
            transaction={editing}
            onClose={() => setEditing(null)}
            onSaved={reload}
          />
        )}
        {editingAccount && (
          <EditAccountModal
            key="edit-account"
            account={account}
            onClose={() => setEditingAccount(false)}
            onSaved={reload}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Los datos de la cuenta que se editan a mano. Los 4 dígitos valen para
 * cualquier cuenta; las fechas solo tienen sentido en una tarjeta de crédito,
 * así que esa sección aparece solo ahí en vez de quedar vacía.
 */
function EditAccountModal({
  account,
  onClose,
  onSaved,
}: {
  account: Account;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isCredit = account.kind === "credit";
  const [last4, setLast4] = useState(account.last4 ?? "");
  const [statement, setStatement] = useState(String(account.statementDay ?? ""));
  const [due, setDue] = useState(String(account.paymentDueDay ?? ""));
  const [submitting, setSubmitting] = useState(false);

  // Reflejar cambios que lleguen por revalidación mientras el modal está abierto.
  useEffect(() => {
    setLast4(account.last4 ?? "");
    setStatement(String(account.statementDay ?? ""));
    setDue(String(account.paymentDueDay ?? ""));
  }, [account.last4, account.statementDay, account.paymentDueDay]);

  const incompleto = last4.length > 0 && last4.length < 4;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await notify.promise(
        (async () => {
          await requestJson(`/api/accounts/${account.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              last4: last4 || null,
              ...(isCredit
                ? {
                    statementDay: statement ? Number(statement) : null,
                    paymentDueDay: due ? Number(due) : null,
                  }
                : {}),
            }),
          });
          await onSaved();
        })(),
        { loading: "Guardando...", success: "Cuenta actualizada" },
      );
      onClose();
    } catch {
      // el toast reporta el error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={isCredit ? "Editar tarjeta" : "Editar cuenta"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <FormBody>
          <FormRow columns={1}>
            <Field
              label="Últimos 4 dígitos"
              hint="Opcional. Sirve para distinguir dos cuentas del mismo banco."
              error={incompleto ? "Tienen que ser 4 números." : undefined}
            >
              {(props) => (
                <input
                  {...props}
                  className={inputClass}
                  inputMode="numeric"
                  autoComplete="off"
                  value={last4}
                  onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="1234"
                />
              )}
            </Field>
          </FormRow>

          {isCredit && (
            <FormSection title="Fechas de la tarjeta" description="Días del mes, entre 1 y 28.">
              <FormRow>
                <Field label="Día de cierre">
                  {(props) => (
                    <input {...props} className={inputClass} inputMode="numeric" value={statement} onChange={(e) => setStatement(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="5" />
                  )}
                </Field>
                <Field label="Día de vencimiento">
                  {(props) => (
                    <input {...props} className={inputClass} inputMode="numeric" value={due} onChange={(e) => setDue(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="20" />
                  )}
                </Field>
              </FormRow>
            </FormSection>
          )}
        </FormBody>
        <FormFooter onCancel={onClose} submitting={submitting} disabled={incompleto} label="Guardar" busyLabel="Guardando..." />
      </form>
    </Modal>
  );
}
