"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Account, Transaction } from "@/lib/types";
import { formatClp } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { notify } from "@/lib/toast";
import { ACCOUNT_KIND_LABELS } from "@/lib/labels";
import { useAccount, useAccountTransactions, useDashboard } from "@/lib/swr";
import { itemVariants, listVariants } from "@/lib/motion";
import { Modal } from "@/components/ui/modal";
import { Field, inputClass } from "@/components/ui/field";
import { FormBody, FormFooter, FormRow, FormSection } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { TransitionSwap } from "@/components/ui/transition-swap";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { TransactionModal } from "@/components/transaction-modal";
import { TransactionRow, TransactionRowSkeleton } from "@/components/transaction-row";
import { Button } from "@/components/ui/button";

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

  if (!accountQuery.isLoading && !account) {
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

  const loading = accountQuery.isLoading && !account;

  return (
    <div className="space-y-6">
      <Link href="/tarjetas" className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Volver a tarjetas
      </Link>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <TransitionSwap
          showSkeleton={loading}
          skeleton={
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="flex items-start gap-4">
                <div className="space-y-1.5 text-right">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="ml-auto h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-16 rounded-xl" />
              </div>
            </div>
          }
        >
          {account && (
            <>
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
            </>
          )}
        </TransitionSwap>
      </section>

      <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white">Movimientos</h2>
          {account && <Button size="sm" variant="primary" onClick={() => setCreating(true)}>+ Movimiento</Button>}
        </div>
        <div className="p-6">
          <TransitionSwap
            showSkeleton={txQuery.isLoading && !txQuery.data}
            skeleton={
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <TransactionRowSkeleton key={i} />)}
              </div>
            }
          >
            {transactions.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">Sin movimientos en esta cuenta.</p>
            ) : (
              <motion.ul variants={listVariants} initial="hidden" animate="visible" className="space-y-2">
                <AnimatePresence initial={false}>
                  {transactions.map((tx) => (
                    <motion.li key={tx.id} layout variants={itemVariants} exit="exit" className="overflow-hidden">
                      <TransactionRow
                        tx={tx}
                        disabled={submitting}
                        {...(tx.origin === "manual" && (tx.type === "income" || tx.type === "expense")
                          ? { onEdit: () => setEditing(tx), onDelete: () => onDelete(tx) }
                          : {})}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </TransitionSwap>
        </div>
      </section>

      <AnimatePresence>
        {creating && account && (
          <TransactionModal
            key="create-tx"
            accounts={accounts.length ? accounts : [account]}
            categories={categories}
            defaultAccountId={account.id}
            onClose={() => setCreating(false)}
            onSaved={reload}
          />
        )}
        {editing && account && (
          <TransactionModal
            key="edit-tx"
            accounts={accounts.length ? accounts : [account]}
            categories={categories}
            transaction={editing}
            onClose={() => setEditing(null)}
            onSaved={reload}
          />
        )}
        {editingAccount && account && (
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
