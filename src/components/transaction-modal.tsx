"use client";

import { FormEvent, useState } from "react";
import { Account, Category, Transaction } from "@/lib/types";
import { formatClp, parsePositiveInteger } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { refreshDashboard } from "@/lib/swr";
import { notify } from "@/lib/toast";
import { Modal } from "@/components/ui/modal";
import { Field, inputClass } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { DatePicker } from "@/components/ui/date-picker";
import { FormBody, FormFooter, FormRow } from "@/components/ui/form";
import { Select } from "@/components/ui/select";

interface Props {
  accounts: Account[];
  categories: Category[];
  /** Si viene, el modal edita ese movimiento en vez de crear uno. */
  transaction?: Transaction;
  defaultAccountId?: string;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

/**
 * Único lugar donde se crea o edita un movimiento, se llame desde el dashboard,
 * desde tarjetas o desde el detalle de una cuenta. Antes el alta vivía inline en
 * el detalle de cuenta y la edición inline en el dashboard: dos formas distintas
 * de hacer lo mismo.
 */
export function TransactionModal({
  accounts,
  categories,
  transaction,
  defaultAccountId,
  onClose,
  onSaved,
}: Props) {
  const isEdit = Boolean(transaction);
  const [accountId, setAccountId] = useState(
    transaction?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? "",
  );
  const [type, setType] = useState<"income" | "expense">(
    transaction && (transaction.type === "income" || transaction.type === "expense")
      ? transaction.type
      : "expense",
  );
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [occurredAt, setOccurredAt] = useState(transaction?.occurredAt ?? "");
  const [submitting, setSubmitting] = useState(false);

  const account = accounts.find((a) => a.id === accountId);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      parsePositiveInteger(amount, "Monto");
    } catch (error) {
      notify.error(error, "El monto debe ser un entero positivo.");
      return;
    }

    setSubmitting(true);
    const payload = {
      accountId,
      type,
      amount: Number(amount),
      categoryId: categoryId || null,
      description: description.trim() || null,
      ...(occurredAt ? { occurredAt } : {}),
    };

    try {
      await notify.promise(
        (async () => {
          await requestJson(
            isEdit ? `/api/transactions/${transaction!.id}` : "/api/transactions",
            { method: isEdit ? "PATCH" : "POST", body: JSON.stringify(payload) },
          );
          await refreshDashboard();
          await onSaved?.();
        })(),
        {
          loading: isEdit ? "Guardando cambios..." : "Registrando movimiento...",
          success: isEdit
            ? "Movimiento actualizado"
            : `${type === "expense" ? "Gasto" : "Ingreso"} de ${formatClp(Number(amount))} registrado`,
        },
      );
      onClose();
    } catch {
      // el toast reporta el error y el formulario conserva lo escrito
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={isEdit ? "Editar movimiento" : "Nuevo movimiento"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <FormBody>
          <div role="group" aria-label="Tipo de movimiento" className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            {(["expense", "income"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => { setType(kind); setCategoryId(""); }}
                aria-pressed={type === kind}
                disabled={isEdit}
                className={`cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  type === kind
                    ? kind === "expense"
                      ? "bg-white text-red-600 shadow-sm dark:bg-zinc-900 dark:text-red-400"
                      : "bg-white text-emerald-600 shadow-sm dark:bg-zinc-900 dark:text-emerald-400"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {kind === "expense" ? "Gasto" : "Ingreso"}
              </button>
            ))}
          </div>

          <FormRow>
            <Field label="Monto">
              {(props) => <MoneyInput {...props} value={amount} onChange={setAmount} required />}
            </Field>
            <Field label="Fecha">
              {(props) => <DatePicker {...props} value={occurredAt} onChange={setOccurredAt} />}
            </Field>
          </FormRow>

          <FormRow>
            <Field
              label="Cuenta"
              hint={account?.kind === "credit" && type === "expense" ? "Se sumará a la deuda" : undefined}
            >
              {(props) => (
                <Select
                  {...props}
                  value={accountId}
                  onChange={setAccountId}
                  placeholder="Selecciona una cuenta"
                  disabled={isEdit}
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: a.name,
                    hint: formatClp(a.kind === "credit" ? a.creditDebt : a.balance),
                  }))}
                />
              )}
            </Field>
            <Field label="Categoría">
              {(props) => (
                <Select
                  {...props}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Sin categoría"
                  options={categories.filter((c) => c.type === type).map((c) => ({ value: c.id, label: c.name }))}
                />
              )}
            </Field>
          </FormRow>

          <FormRow columns={1}>
            <Field label="Descripción" hint="Opcional">
              {(props) => (
                <input {...props} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Supermercado" />
              )}
            </Field>
          </FormRow>
        </FormBody>

        <FormFooter
          onCancel={onClose}
          submitting={submitting}
          disabled={!accountId || !amount}
          tone={type === "expense" ? "danger" : "success"}
          label={isEdit ? "Guardar cambios" : "Registrar"}
          busyLabel="Guardando..."
        />
      </form>
    </Modal>
  );
}
