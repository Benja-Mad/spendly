"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Account } from "@/lib/types";
import { formatClp } from "@/lib/utils";
import { errorMessage } from "@/lib/errors";
import { useDashboard } from "@/lib/swr";
import { itemVariants, listVariants } from "@/lib/motion";
import { AccountCard } from "@/components/account-card";
import { AccountDetailModal } from "@/components/account-detail-modal";
import { CreateAccountModal } from "@/components/create-account-modal";
import { PayCreditModal } from "@/components/pay-credit-modal";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";

export function TarjetasView() {
  const { data, error, isLoading, mutate } = useDashboard();
  // El tipo se decide en el botón que abre el modal, no dentro del formulario.
  const [creating, setCreating] = useState<"credit" | "debit" | null>(null);
  const [payingCard, setPayingCard] = useState<Account | null>(null);
  const [selected, setSelected] = useState<Account | null>(null);

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-10 text-center">
        <p className="text-zinc-500">No se pudo cargar la información.</p>
        {error && <p className="mt-2 text-sm text-red-500">{errorMessage(error, "")}</p>}
        <Button variant="primary" className="mt-4" onClick={() => mutate()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const creditAccounts = data.accounts.filter((a) => a.kind === "credit");
  const nonCreditAccounts = data.accounts.filter((a) => a.kind !== "credit");
  const hasAccounts = data.accounts.length > 0;

  return (
    <div className="space-y-8">
      {/*
        El encabezado no lleva acciones. Crear una tarjeta y crear una cuenta
        son cosas distintas, así que cada sección tiene su propio botón y el
        tipo queda decidido antes de abrir el formulario. Antes un único
        "Nueva cuenta" servía para ambas y había que elegir el tipo adentro.
      */}
      <PageHeader title="Tarjetas y cuentas" description="Tus cuentas, tarjetas de crédito y saldos" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Total disponible" value={formatClp(data.summary.available)} />
        <SummaryTile label="Total ahorrado" value={formatClp(data.summary.saved)} tone="emerald" />
        <SummaryTile label="Deuda crédito" value={formatClp(data.summary.pendingCreditDebt)} tone="red" />
        <SummaryTile label="Total general" value={formatClp(data.summary.total)} />
      </div>

      {!hasAccounts && (
        <div className="rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <svg aria-hidden="true" className="mx-auto h-12 w-12 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          <p className="mt-4 text-sm text-zinc-500">Todavía no tienes cuentas ni tarjetas</p>
          <p className="mt-1 text-xs text-zinc-400">Crea una para empezar a registrar movimientos</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="primary" onClick={() => setCreating("debit")}>+ Cuenta</Button>
            <Button onClick={() => setCreating("credit")}>+ Tarjeta de crédito</Button>
          </div>
        </div>
      )}

      {hasAccounts && (
        <section>
          <SectionHeader
            title="Tarjetas de crédito"
            action={<Button size="sm" onClick={() => setCreating("credit")}>+ Tarjeta</Button>}
          />
          {creditAccounts.length === 0 ? (
            <EmptySection text="No tienes tarjetas de crédito registradas." />
          ) : (
            <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {creditAccounts.map((account) => (
                <motion.div key={account.id} variants={itemVariants} className="flex">
                  <AccountCard account={account} onSelect={() => setSelected(account)} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      )}

      {hasAccounts && (
        <section>
          <SectionHeader
            title="Cuentas"
            action={<Button size="sm" onClick={() => setCreating("debit")}>+ Cuenta</Button>}
          />
          {nonCreditAccounts.length === 0 ? (
            <EmptySection text="No tienes cuentas de débito, corriente ni efectivo." />
          ) : (
            <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {nonCreditAccounts.map((account) => (
                <motion.div key={account.id} variants={itemVariants} className="flex">
                  <AccountCard account={account} onSelect={() => setSelected(account)} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      )}

      <AnimatePresence>
        {creating && (
          <CreateAccountModal key="create-account" initialKind={creating} onClose={() => setCreating(null)} />
        )}
        {payingCard && (
          <PayCreditModal
            key="pay-credit"
            creditAccounts={creditAccounts}
            sourceAccounts={nonCreditAccounts}
            defaultCreditId={payingCard.id}
            onClose={() => setPayingCard(null)}
          />
        )}
        {selected && (
          <AccountDetailModal
            key="account-detail"
            account={data.accounts.find((a) => a.id === selected.id) ?? selected}
            accounts={data.accounts}
            categories={data.categories}
            canPay={nonCreditAccounts.length > 0}
            onPay={() => { const card = selected; setSelected(null); setPayingCard(card); }}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">{title}</h2>
      {action}
    </div>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-400 dark:border-zinc-800">
      {text}
    </p>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "red" }) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "red"
      ? "text-red-600 dark:text-red-400"
      : "text-zinc-900 dark:text-white";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
