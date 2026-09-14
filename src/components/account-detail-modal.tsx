"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Account, Category, Transaction } from "@/lib/types";
import { formatClp } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { ACCOUNT_KIND_LABELS } from "@/lib/labels";
import { useAccountTransactions, refreshDashboard } from "@/lib/swr";
import { notify } from "@/lib/toast";
import { itemVariants, listVariants } from "@/lib/motion";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { TransactionModal } from "@/components/transaction-modal";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { TransitionSwap } from "@/components/ui/transition-swap";
import { TransactionRow, TransactionRowSkeleton } from "@/components/transaction-row";

/**
 * Detalle de una cuenta dentro de un modal.
 *
 * Antes tocar una tarjeta navegaba a /tarjetas/[id]: se perdía el contexto de
 * la grilla y volver costaba una navegación completa. Como el detalle es una
 * consulta puntual sobre un elemento de la lista, vive mejor sobre la lista.
 */
export function AccountDetailModal({
  account,
  accounts,
  categories,
  canPay,
  onPay,
  onClose,
}: {
  account: Account;
  accounts: Account[];
  categories: Category[];
  canPay: boolean;
  onPay: () => void;
  onClose: () => void;
}) {
  const { data, isLoading, mutate } = useAccountTransactions(account.id);
  const transactions = data?.transactions ?? [];
  const confirm = useConfirm();

  const [submitting, setSubmitting] = useState(false);
  const [addingTx, setAddingTx] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

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
          await Promise.all([mutate(), refreshDashboard()]);
        })(),
        { loading: "Eliminando movimiento...", success: "Movimiento eliminado" },
      );
    } catch {
      // el toast reporta el error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={account.name} onClose={onClose} size="2xl">
      <div className="scroll-stable flex-1 overflow-y-auto p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
          <div>
            <p className="text-sm text-zinc-500">
              {account.bank && `${account.bank} · `}
              {ACCOUNT_KIND_LABELS[account.kind] ?? account.kind}
              {account.last4 && ` · •••• ${account.last4}`}
            </p>
            {account.kind === "credit" && (account.statementDay || account.paymentDueDay) && (
              <p className="mt-1 text-xs text-zinc-400">
                {account.statementDay && `Cierre día ${account.statementDay}`}
                {account.statementDay && account.paymentDueDay && " · "}
                {account.paymentDueDay && `Vence día ${account.paymentDueDay}`}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-white">
              {formatClp(account.kind === "credit" ? account.creditDebt : account.balance)}
            </p>
            <p className="text-xs text-zinc-500">
              {account.kind === "credit" ? "Deuda total" : "Saldo disponible"}
            </p>
          </div>
        </div>

        {/*
          Registrar un movimiento y pagar la tarjeta son acciones SOBRE esta
          cuenta, así que viven aquí. Antes estaban en el encabezado de la
          página, donde no se sabía a qué cuenta aplicaban.
        */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-zinc-900 dark:text-white">Movimientos</h3>
          <div className="flex gap-2">
            {account.kind === "credit" && canPay && account.creditDebt > 0 && (
              <Button size="sm" onClick={onPay}>Pagar tarjeta</Button>
            )}
            <Button size="sm" variant="primary" onClick={() => setAddingTx(true)}>
              + Movimiento
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <TransitionSwap
            showSkeleton={isLoading && transactions.length === 0}
            skeleton={
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <TransactionRowSkeleton key={i} />)}
              </div>
            }
          >
            {transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">Sin movimientos en esta cuenta.</p>
            ) : (
              <motion.ul variants={listVariants} initial="hidden" animate="visible" className="space-y-2">
                <AnimatePresence initial={false}>
                  {transactions.map((tx) => (
                    <motion.li key={tx.id} layout variants={itemVariants} exit="exit" className="overflow-hidden">
                      <TransactionRow
                        tx={tx}
                        disabled={submitting}
                        {...(tx.origin === "manual" && (tx.type === "income" || tx.type === "expense")
                          ? { onEdit: () => setEditingTx(tx), onDelete: () => onDelete(tx) }
                          : {})}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </TransitionSwap>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <Link
          href={`/tarjetas/${account.id}`}
          className="text-sm text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
        >
          Abrir vista completa
        </Link>
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
      </div>

      {addingTx && (
        <TransactionModal
          accounts={accounts.length ? accounts : [account]}
          categories={categories}
          defaultAccountId={account.id}
          onClose={() => setAddingTx(false)}
          onSaved={async () => { await mutate(); }}
        />
      )}
      {editingTx && (
        <TransactionModal
          accounts={accounts.length ? accounts : [account]}
          categories={categories}
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={async () => { await mutate(); }}
        />
      )}
    </Modal>
  );
}
