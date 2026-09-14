"use client";

import { FormEvent, useState } from "react";
import { Account } from "@/lib/types";
import { formatClp } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { refreshDashboard } from "@/lib/swr";
import { notify } from "@/lib/toast";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { FormBody, FormFooter, FormRow } from "@/components/ui/form";
import { Select } from "@/components/ui/select";

export function PayCreditModal({
  creditAccounts,
  sourceAccounts,
  defaultCreditId,
  onClose,
}: {
  creditAccounts: Account[];
  sourceAccounts: Account[];
  defaultCreditId?: string;
  onClose: () => void;
}) {
  const [creditId, setCreditId] = useState(defaultCreditId ?? "");
  const [sourceId, setSourceId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const credit = creditAccounts.find((a) => a.id === creditId);
  const source = sourceAccounts.find((a) => a.id === sourceId);
  const value = Number(amount) || 0;

  const overDebt = credit ? value > credit.creditDebt : false;
  const overBalance = source ? value > source.balance : false;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await notify.promise(
        (async () => {
          await requestJson("/api/credit/payments", {
            method: "POST",
            body: JSON.stringify({ creditAccountId: creditId, sourceAccountId: sourceId, amount: value }),
          });
          await refreshDashboard();
        })(),
        { loading: "Registrando pago...", success: `Pago de ${formatClp(value)} registrado` },
      );
      onClose();
    } catch {
      // el toast reporta el error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Pagar tarjeta de crédito" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <FormBody>
          <FormRow>
            <Field label="Tarjeta a pagar">
              {(props) => (
                <Select
                  {...props}
                  value={creditId}
                  onChange={setCreditId}
                  placeholder="Selecciona una tarjeta"
                  options={creditAccounts.map((a) => ({ value: a.id, label: a.name, hint: formatClp(a.creditDebt) }))}
                />
              )}
            </Field>
            <Field label="Cuenta de origen">
              {(props) => (
                <Select
                  {...props}
                  value={sourceId}
                  onChange={setSourceId}
                  placeholder="Selecciona una cuenta"
                  options={sourceAccounts.map((a) => ({ value: a.id, label: a.name, hint: formatClp(a.balance) }))}
                />
              )}
            </Field>
          </FormRow>

          <FormRow columns={1}>
            <Field
              label="Monto"
              hint={
                overBalance
                  ? `${source!.name} solo tiene ${formatClp(source!.balance)} disponibles.`
                  : overDebt
                  ? `Supera la deuda de ${formatClp(credit!.creditDebt)}.`
                  : undefined
              }
            >
              {(props) => <MoneyInput {...props} value={amount} onChange={setAmount} required />}
            </Field>
          </FormRow>

          {credit && credit.creditDebt > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(credit.creditDebt))}
              className="cursor-pointer text-xs font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
            >
              Pagar el total: {formatClp(credit.creditDebt)}
            </button>
          )}
        </FormBody>

        <FormFooter
          onCancel={onClose}
          submitting={submitting}
          disabled={!creditId || !sourceId || value <= 0 || overBalance}
          label="Pagar"
          busyLabel="Pagando..."
        />
      </form>
    </Modal>
  );
}
