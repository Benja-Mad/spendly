"use client";

import { FormEvent, useState } from "react";
import { requestJson } from "@/lib/api";
import { refreshDashboard } from "@/lib/swr";
import { notify } from "@/lib/toast";
import { Modal } from "@/components/ui/modal";
import { Field, inputClass } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { FormBody, FormFooter, FormRow, FormSection } from "@/components/ui/form";
import { Select } from "@/components/ui/select";

const KINDS = [
  { value: "cash", label: "Efectivo" },
  { value: "debit", label: "Débito" },
  { value: "checking", label: "Corriente" },
  { value: "credit", label: "Crédito" },
];

export function CreateAccountModal({
  initialKind = "debit",
  onClose,
}: {
  /** El tipo lo decide el botón que abre el modal, no un selector interno. */
  initialKind?: "credit" | "debit";
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>(initialKind);
  const [bank, setBank] = useState("");
  const [last4, setLast4] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [statementDay, setStatementDay] = useState("");
  const [paymentDueDay, setPaymentDueDay] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isCredit = kind === "credit";
  // 0 o 4 dígitos; cualquier cosa intermedia es un campo a medio escribir.
  const last4Incompleto = last4.length > 0 && last4.length < 4;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await notify.promise(
        (async () => {
          await requestJson("/api/accounts", {
            method: "POST",
            body: JSON.stringify({
              name: name.trim(),
              kind,
              bank: bank.trim() || null,
              initialBalance: Number(initialBalance) || 0,
              statementDay: isCredit ? Number(statementDay) || null : null,
              paymentDueDay: isCredit ? Number(paymentDueDay) || null : null,
              last4: last4 || null,
            }),
          });
          await refreshDashboard();
        })(),
        { loading: "Creando cuenta...", success: `"${name.trim()}" creada` },
      );
      onClose();
    } catch {
      // el toast reporta el error y el formulario conserva lo escrito
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={initialKind === "credit" ? "Nueva tarjeta de crédito" : "Nueva cuenta"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <FormBody>
          <FormRow>
            <Field label="Nombre">
              {(props) => (
                <input {...props} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Cuenta corriente" required />
              )}
            </Field>
            <Field label="Tipo">
              {(props) => (
                <Select
                  {...props}
                  value={kind}
                  onChange={setKind}
                  options={initialKind === "credit" ? KINDS.filter((k) => k.value === "credit") : KINDS.filter((k) => k.value !== "credit")}
                />
              )}
            </Field>
          </FormRow>

          <FormRow>
            <Field label="Banco" hint="Opcional">
              {(props) => (
                <input {...props} className={inputClass} value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Ej: Banco de Chile" />
              )}
            </Field>
            <Field
              label="Últimos 4 dígitos"
              hint="Opcional"
              error={last4Incompleto ? "Tienen que ser 4 números." : undefined}
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

          <FormRow columns={1}>
            <Field label={isCredit ? "Deuda inicial" : "Saldo inicial"}>
              {(props) => <MoneyInput {...props} value={initialBalance} onChange={setInitialBalance} />}
            </Field>
          </FormRow>

          {isCredit && (
            <FormSection title="Fechas de la tarjeta" description="Días del mes, entre 1 y 28.">
              <FormRow>
                <Field label="Día de cierre">
                  {(props) => (
                    <input {...props} className={inputClass} inputMode="numeric" value={statementDay} onChange={(e) => setStatementDay(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="5" />
                  )}
                </Field>
                <Field label="Día de vencimiento">
                  {(props) => (
                    <input {...props} className={inputClass} inputMode="numeric" value={paymentDueDay} onChange={(e) => setPaymentDueDay(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="20" />
                  )}
                </Field>
              </FormRow>
            </FormSection>
          )}
        </FormBody>

        <FormFooter
          onCancel={onClose}
          submitting={submitting}
          disabled={!name.trim() || last4Incompleto}
          label="Crear cuenta"
          busyLabel="Creando..."
        />
      </form>
    </Modal>
  );
}
