"use client";

import { useState } from "react";
import { Account } from "@/lib/types";
import { formatClp } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { notify } from "@/lib/toast";
import { Modal } from "@/components/ui/modal";
import { Field, inputClass } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { FormBody, FormFooter, FormRow, FormSection } from "@/components/ui/form";
import { Select } from "@/components/ui/select";

interface Props {
  nonCreditAccounts: Account[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateSavingsModal({ nonCreditAccounts, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [initialDeposit, setInitialDeposit] = useState("");
  const [initialAccountId, setInitialAccountId] = useState("");
  const [configureAuto, setConfigureAuto] = useState(false);
  const [autoAccountId, setAutoAccountId] = useState("");
  const [autoAmount, setAutoAmount] = useState("");
  const [autoDay, setAutoDay] = useState("1");
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

      notify.success(`Fondo "${name.trim()}" creado`);
      onCreated();
      onClose();
    } catch (err) {
      notify.error(err, "No se pudo crear el fondo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Crear fondo de ahorro" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <FormBody>
          <FormRow>
            <Field label="Nombre del fondo">
              {(props) => (
                <input {...props} value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} placeholder="Ej: Viaje a Brasil" />
              )}
            </Field>
            <Field label="Meta">
              {(props) => <MoneyInput {...props} value={targetAmount} onChange={setTargetAmount} required />}
            </Field>
          </FormRow>

          <FormSection title="Depósito inicial" description="Opcional. Se descuenta de la cuenta que elijas.">
            <FormRow>
              <Field label="Monto">
                {(props) => <MoneyInput {...props} value={initialDeposit} onChange={setInitialDeposit} />}
              </Field>
              <Field label="Cuenta de origen">
                {(props) => (
                  <Select
                    {...props}
                    value={initialAccountId}
                    onChange={setInitialAccountId}
                    placeholder="Sin cuenta origen"
                    options={nonCreditAccounts.map((a) => ({ value: a.id, label: a.name, hint: formatClp(a.balance) }))}
                  />
                )}
              </Field>
            </FormRow>
          </FormSection>

          <FormSection>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700">
              <input type="checkbox" checked={configureAuto} onChange={(e) => setConfigureAuto(e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-emerald-600" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Configurar depósito automático mensual</span>
            </label>

            {configureAuto && (
              <FormRow>
                <Field label="Cuenta de origen">
                  {(props) => (
                    <Select
                      {...props}
                      value={autoAccountId}
                      onChange={setAutoAccountId}
                      placeholder="Selecciona una cuenta"
                      options={nonCreditAccounts.map((a) => ({ value: a.id, label: a.name, hint: formatClp(a.balance) }))}
                    />
                  )}
                </Field>
                <FormRow>
                  <Field label="Monto mensual">
                    {(props) => <MoneyInput {...props} value={autoAmount} onChange={setAutoAmount} />}
                  </Field>
                  <Field label="Día del mes" hint="1 a 28">
                    {(props) => (
                      <input {...props} className={inputClass} inputMode="numeric" value={autoDay} onChange={(e) => setAutoDay(e.target.value.replace(/\D/g, "").slice(0, 2))} />
                    )}
                  </Field>
                </FormRow>
              </FormRow>
            )}
          </FormSection>

          {target > 0 && (
            <FormSection title="Simulador" description="Estimación aproximada usando meses de 30 días.">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <span>Meta: <strong className="tabular-nums">{formatClp(target)}</strong></span>
                  {deposit > 0 && <span>Inicial: <strong className="tabular-nums">{formatClp(deposit)}</strong></span>}
                  <span>Restante: <strong className="tabular-nums">{formatClp(remaining)}</strong></span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg bg-white/70 p-1 dark:bg-zinc-900/60">
                  {([["months", "Sé cuántos meses"], ["amount", "Sé cuánto por período"]] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSimMode(mode)}
                      aria-pressed={simMode === mode}
                      className={`cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                        simMode === mode
                          ? "bg-white text-emerald-700 shadow-sm dark:bg-zinc-800 dark:text-emerald-400"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <FormRow>
                  {simMode === "months" ? (
                    <Field label="Meses para ahorrar">
                      {(props) => (
                        <input {...props} className={inputClass} inputMode="numeric" value={simMonths} onChange={(e) => setSimMonths(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="6" />
                      )}
                    </Field>
                  ) : (
                    <Field label={simPeriod === "month" ? "Monto por mes" : "Monto por día"}>
                      {(props) => <MoneyInput {...props} value={simPerPeriod} onChange={setSimPerPeriod} />}
                    </Field>
                  )}
                  <div className="flex flex-col justify-end">
                    <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <input type="checkbox" checked={simPeriod === "day"} onChange={(e) => setSimPeriod(e.target.checked ? "day" : "month")} className="rounded text-emerald-600" />
                      Razonar por día
                    </label>
                    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2 dark:border-emerald-900 dark:bg-zinc-900">
                      {simResultMonths !== null ? (
                        <p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                          ~{simResultMonths} mes{simResultMonths !== 1 ? "es" : ""}
                          {simResultPerPeriod !== null && ` · ${formatClp(Math.round(simResultPerPeriod))}/mes`}
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-400">Completa los campos</p>
                      )}
                    </div>
                  </div>
                </FormRow>
              </div>
            </FormSection>
          )}
        </FormBody>

        <FormFooter
          onCancel={onClose}
          submitting={submitting}
          disabled={!name.trim() || target <= 0}
          label="Crear fondo"
          busyLabel="Creando..."
        />
      </form>
    </Modal>
  );
}
